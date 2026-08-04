import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  discoverVerificationChecks,
  runShipCheck,
  runVerification,
  type CommandRunner,
} from "./verification.js";

test("verification discovers only supported package scripts", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "localis-checks-"));
  try {
    await fs.writeFile(path.join(root, "package.json"), JSON.stringify({
      scripts: { test: "node --test", typecheck: "tsc --noEmit", deploy: "private-command" },
    }));
    await fs.writeFile(path.join(root, "package-lock.json"), "{}");
    const checks = await discoverVerificationChecks(root);
    assert.deepEqual(checks.map((check) => check.id), ["node:test", "node:typecheck"]);
    assert.deepEqual(checks[0]?.args.slice(-2), ["run", "test"]);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("verification reports failures and redacts captured command output", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "localis-check-results-"));
  try {
    await fs.writeFile(path.join(root, "package.json"), JSON.stringify({ scripts: { test: "node --test" } }));
    const runner: CommandRunner = async () => ({
      exitCode: 1,
      stdout: 'apiKey = "synthetic-verification-secret"', // localis-ignore secret.generic-assignment
      stderr: "one test failed",
    });
    const report = await runVerification(root, { kinds: ["test"], commandRunner: runner });
    assert.equal(report.ready, false);
    assert.equal(report.results[0]?.status, "failed");
    assert.ok(!report.results[0]?.stdout.includes("synthetic-verification-secret"));
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("ship check combines audit and verification blockers", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "localis-ship-"));
  try {
    await fs.writeFile(path.join(root, "package.json"), JSON.stringify({ scripts: { test: "node --test" } }));
    await fs.writeFile(path.join(root, "unsafe.ts"), "export const run = (input: string) => eval(input);\n"); // localis-ignore security.dynamic-eval
    const report = await runShipCheck(root, {
      commandRunner: async () => ({ exitCode: 0, stdout: "passed", stderr: "" }),
    });
    assert.equal(report.ready, false);
    assert.ok(report.blockers.some((blocker) => blocker.includes("high audit")));
    assert.equal(report.verification.results[0]?.status, "passed");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
