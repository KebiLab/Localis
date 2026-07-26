import assert from "node:assert/strict";
import test from "node:test";

import { runCli } from "./run.js";

test("help introduces Localis and its core commands", async () => {
  const result = await runCli(["help"]);

  assert.equal(result.exitCode, 0);
  assert.match(result.stdout ?? "", /Localis 0\.1\.0/);
  assert.match(result.stdout ?? "", /audit \[path\]/);
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
