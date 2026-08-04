import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { runAudit } from "./audit.js";

test("audit reports evidence without exposing a detected secret", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "localis-audit-"));
  const sourcePath = path.join(root, "server.ts");

  try {
    await fs.writeFile(
      sourcePath,
      'const apiKey = "this-is-a-production-secret";\nexport { apiKey };\n', // localis-ignore secret.generic-assignment
      "utf8",
    );

    const report = await runAudit(root);
    const finding = report.findings.find(
      (candidate) => candidate.ruleId === "secret.generic-assignment",
    );

    assert.ok(finding);
    assert.match(finding.id, /^LCL-[a-f0-9]{12}$/);
    assert.equal(finding.line, 1);
    assert.match(finding.evidence, /^\[redacted \d+ characters\]$/);
    assert.ok(!JSON.stringify(report).includes("this-is-a-production-secret"));
    assert.equal(report.summary.critical, 1);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("audit ignores dependencies and identifies project languages", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "localis-scan-"));

  try {
    await fs.mkdir(path.join(root, "node_modules"), { recursive: true });
    await fs.writeFile(path.join(root, "app.ts"), "export const ready = true;\n");
    await fs.writeFile(
      path.join(root, "node_modules", "ignored.js"),
      'const password = "not-part-of-the-project";\n', // localis-ignore secret.generic-assignment
    );

    const report = await runAudit(root);

    assert.equal(report.scannedFiles, 1);
    assert.equal(report.languages.TypeScript, 1);
    assert.equal(report.findings.length, 0);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("audit respects root gitignore entries", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "localis-ignore-"));

  try {
    await fs.mkdir(path.join(root, "reference-source"), { recursive: true });
    await fs.writeFile(
      path.join(root, ".gitignore"),
      "reference-source/\n",
      "utf8",
    );
    await fs.writeFile(path.join(root, "clean.ts"), "export const clean = true;\n");
    await fs.writeFile(
      path.join(root, "reference-source", "ignored.ts"),
      'const apiKey = "ignore-this-secret-value";\n', // localis-ignore secret.generic-assignment
    );

    const report = await runAudit(root);

    assert.equal(report.scannedFiles, 1);
    assert.equal(report.findings.length, 0);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("audit supports explicit rule-level suppressions", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "localis-suppress-"));

  try {
    await fs.writeFile(
      path.join(root, "fixture.ts"),
      'const apiKey = "synthetic-secret-for-a-test"; // localis-ignore secret.generic-assignment\n',
    );

    const report = await runAudit(root);

    assert.equal(report.findings.length, 0);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
