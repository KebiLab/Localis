import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { prepareProjectContext } from "./context.js";

test("context redacts sensitive values and exposes a safe manifest", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "localis-context-"));

  try {
    await fs.mkdir(path.join(root, "src"));
    await fs.writeFile(
      path.join(root, "README.md"),
      "Contact owner@example.com for access.\n", // localis-ignore privacy.personal-email
    );
    await fs.writeFile(
      path.join(root, "src", "config.ts"),
      'export const apiKey = "a-realistic-secret-value";\n', // localis-ignore secret.generic-assignment
    );

    const first = await prepareProjectContext({ root });
    const second = await prepareProjectContext({ root });

    assert.equal(first.preview.files.length, 2);
    assert.equal(first.preview.redactions.PII, 1);
    assert.equal(first.preview.redactions.SECRET, 1);
    assert.ok(!first.payload.includes("owner@example.com")); // localis-ignore privacy.personal-email
    assert.ok(!first.payload.includes("a-realistic-secret-value"));
    assert.match(first.payload, /<LOCALIS_PII_1>/);
    assert.equal(first.preview.payloadSha256, second.preview.payloadSha256);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("context refuses paths outside the project root", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "localis-boundary-"));

  try {
    await assert.rejects(
      prepareProjectContext({ root, include: ["../outside.ts"] }),
      /leaves the project root/,
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("context observes file and total payload limits", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "localis-limits-"));

  try {
    await fs.writeFile(path.join(root, "a.ts"), "a".repeat(80));
    await fs.writeFile(path.join(root, "b.ts"), "b".repeat(80));

    const result = await prepareProjectContext({
      root,
      maxFiles: 1,
      maxTotalBytes: 32,
    });

    assert.equal(result.preview.files.length, 1);
    assert.equal(result.preview.inputBytes, 32);
    assert.equal(result.preview.truncated, true);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
