import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { type FetchImplementation } from "./ollama.js";
import {
  ChangeProposalError,
  proposeFindingFixWithLocalModel,
  proposeChangePlanWithOllama,
} from "./proposals.js";

test("Ollama proposal becomes a hash-checked plan without changing source files", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "localis-proposal-"));

  try {
    const target = path.join(root, "index.ts");
    await fs.writeFile(
      target,
      'const apiKey = "synthetic-private-value";\nexport const value = 1;\n', // localis-ignore secret.generic-assignment
    );
    let requestBody: Record<string, unknown> = {};
    const fakeFetch = (async (_input: string | URL | Request, init?: RequestInit) => {
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return Response.json({
        model: "qwen-test",
        response: JSON.stringify({
          schemaVersion: 1,
          files: [
            {
              path: "index.ts",
              after: 'const apiKey = "<LOCALIS_SECRET_1>";\nexport const value = 2;\n', // localis-ignore secret.generic-assignment
              summary: "Remove obsolete configuration",
            },
          ],
        }),
      });
    }) as FetchImplementation;

    const proposal = await proposeChangePlanWithOllama({
      root,
      instruction: "Set the exported value to two.",
      model: "qwen-test",
      fetchImplementation: fakeFetch,
    });

    assert.equal(proposal.preview.changedFiles, 1);
    assert.match(proposal.plan.files[0]?.beforeSha256 ?? "", /^[a-f0-9]{64}$/);
    assert.ok(proposal.plan.files[0]?.after.includes("synthetic-private-value"));
    assert.ok(!proposal.plan.files[0]?.after.includes("<LOCALIS_SECRET_1>"));
    assert.equal(await fs.readFile(target, "utf8"), 'const apiKey = "synthetic-private-value";\nexport const value = 1;\n'); // localis-ignore secret.generic-assignment
    assert.equal(typeof requestBody.format, "object");
    assert.deepEqual(requestBody.options, { temperature: 0 });
    assert.ok(!JSON.stringify(requestBody).includes("synthetic-private-value"));
    assert.ok(JSON.stringify(requestBody).includes("<LOCALIS_SECRET_1>"));
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("finding fix proposals scope model context to the affected file", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "localis-finding-fix-"));
  try {
    await fs.writeFile(path.join(root, "unsafe.ts"), "export const run = (value: string) => eval(value);\n"); // localis-ignore security.dynamic-eval
    await fs.writeFile(path.join(root, "unrelated.ts"), "export const untouched = true;\n");
    let requestBody = "";
    const fakeFetch = (async (_input: string | URL | Request, init?: RequestInit) => {
      requestBody = String(init?.body);
      return Response.json({
        model: "qwen-test",
        response: JSON.stringify({
          schemaVersion: 1,
          files: [{ path: "unsafe.ts", after: "export const run = (value: string) => value;\n" }],
        }),
      });
    }) as FetchImplementation;

    const proposal = await proposeFindingFixWithLocalModel({
      root,
      finding: {
        id: "LCL-test",
        ruleId: "security.dynamic-eval",
        title: "Dynamic code execution",
        description: "Dynamic evaluation is unsafe.",
        remediation: "Use an explicit parser.",
        severity: "high",
        category: "security",
        file: "unsafe.ts",
        line: 1,
        column: 40,
        evidence: "eval(", // localis-ignore security.dynamic-eval
      },
      model: "qwen-test",
      fetchImplementation: fakeFetch,
    });

    assert.equal(proposal.context.files.length, 1);
    assert.equal(proposal.context.files[0]?.path, "unsafe.ts");
    assert.ok(requestBody.includes("security.dynamic-eval"));
    assert.ok(!requestBody.includes("unrelated.ts"));
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("Ollama proposal rejects non-JSON model output", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "localis-proposal-invalid-"));

  try {
    const fakeFetch = (async () =>
      Response.json({ model: "qwen-test", response: "I changed the file." })
    ) as FetchImplementation;

    await assert.rejects(
      proposeChangePlanWithOllama({
        root,
        instruction: "Create an index file.",
        model: "qwen-test",
        fetchImplementation: fakeFetch,
      }),
      (error: unknown) =>
        error instanceof ChangeProposalError && error.code === "INVALID_RESPONSE",
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
