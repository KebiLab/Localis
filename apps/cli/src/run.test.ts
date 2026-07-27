import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createChangePlan } from "@localis/core";

import { runCli } from "./run.js";

test("help introduces Localis and its core commands", async () => {
  const result = await runCli(["help"]);

  assert.equal(result.exitCode, 0);
  assert.match(result.stdout ?? "", /Localis 0\.1\.0/);
  assert.match(result.stdout ?? "", /audit \[path\]/);
  assert.match(result.stdout ?? "", /propose <task>/);
  assert.match(result.stdout ?? "", /Made by KebiLab/);
});

test("unknown commands fail with usage guidance", async () => {
  const result = await runCli(["launch"]);

  assert.equal(result.exitCode, 1);
  assert.match(result.stderr ?? "", /Unknown command: launch/);
});

test("invalid audit paths return a stable json error", async () => {
  const result = await runCli([
    "audit",
    "./path-that-does-not-exist-localis",
    "--json",
  ]);

  assert.equal(result.exitCode, 1);
  assert.deepEqual(JSON.parse(result.stderr ?? "{}").error, "AUDIT_FAILED");
});

test("privacy json exposes a redacted manifest but not the payload by default", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "localis-cli-privacy-"));

  try {
    await fs.writeFile(
      path.join(root, "config.ts"),
      'export const apiKey = "synthetic-private-value";\n', // localis-ignore secret.generic-assignment
    );
    const result = await runCli(["privacy", root, "--json"]);
    const output = JSON.parse(result.stdout ?? "{}") as {
      preview?: { redactions?: { SECRET?: number } };
      payload?: string;
    };

    assert.equal(result.exitCode, 0);
    assert.equal(output.preview?.redactions?.SECRET, 1);
    assert.equal(output.payload, undefined);
    assert.ok(!(result.stdout ?? "").includes("synthetic-private-value"));
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("ask dry-run prepares context without requiring Ollama", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "localis-cli-dry-"));

  try {
    await fs.writeFile(path.join(root, "index.ts"), "export const ready = true;\n");
    const result = await runCli([
      "ask",
      "Is this project ready?",
      root,
      "--dry-run",
      "--json",
    ]);
    const output = JSON.parse(result.stdout ?? "{}") as {
      preview?: { files?: unknown[] };
    };

    assert.equal(result.exitCode, 0);
    assert.equal(output.preview?.files?.length, 1);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("propose dry-run previews context without requiring Ollama", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "localis-cli-propose-dry-"));

  try {
    await fs.writeFile(path.join(root, "index.ts"), "export const ready = true;\n");
    const result = await runCli([
      "propose",
      "Add a readiness function.",
      root,
      "--dry-run",
      "--json",
    ]);
    const output = JSON.parse(result.stdout ?? "{}") as {
      mode?: string;
      preview?: { files?: unknown[] };
    };

    assert.equal(result.exitCode, 0);
    assert.equal(output.mode, "context-preview");
    assert.equal(output.preview?.files?.length, 1);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("context file limits reject unsafe values", async () => {
  const result = await runCli(["privacy", ".", "--max-files", "0"]);

  assert.equal(result.exitCode, 1);
  assert.match(result.stderr ?? "", /between 1 and 200/);
});

test("apply previews by default, writes with confirmation, and supports undo", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "localis-cli-apply-"));

  try {
    const target = path.join(root, "index.ts");
    const planPath = path.join(root, "change-plan.json");
    await fs.writeFile(target, "export const version = 1;\n");
    const plan = await createChangePlan(
      root,
      [{ path: "index.ts", after: "export const version = 2;\n" }],
      "cli-apply-test",
    );
    await fs.writeFile(planPath, JSON.stringify(plan));

    const preview = await runCli(["apply", planPath, root, "--json"]);
    assert.equal(preview.exitCode, 0);
    assert.equal(JSON.parse(preview.stdout ?? "{}").mode, "preview");
    assert.equal(await fs.readFile(target, "utf8"), "export const version = 1;\n");

    const applied = await runCli(["apply", planPath, root, "--yes", "--json"]);
    const appliedOutput = JSON.parse(applied.stdout ?? "{}") as {
      sessionId?: string;
    };
    assert.equal(applied.exitCode, 0);
    assert.ok(appliedOutput.sessionId);
    assert.equal(await fs.readFile(target, "utf8"), "export const version = 2;\n");

    const history = await runCli(["history", root, "--json"]);
    assert.equal(JSON.parse(history.stdout ?? "{}").sessions.length, 1);

    const refusedUndo = await runCli(["undo", "latest", root]);
    assert.equal(refusedUndo.exitCode, 1);
    assert.match(refusedUndo.stderr ?? "", /requires explicit confirmation/);

    const undone = await runCli(["undo", "latest", root, "--yes", "--json"]);
    assert.equal(undone.exitCode, 0);
    assert.equal(await fs.readFile(target, "utf8"), "export const version = 1;\n");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("apply reports invalid plan JSON without touching the project", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "localis-cli-plan-"));

  try {
    const planPath = path.join(root, "broken.json");
    await fs.writeFile(planPath, "{not-json");
    const result = await runCli(["apply", planPath, root, "--yes", "--json"]);

    assert.equal(result.exitCode, 1);
    assert.equal(JSON.parse(result.stderr ?? "{}").changeCode, "INVALID_PLAN");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
