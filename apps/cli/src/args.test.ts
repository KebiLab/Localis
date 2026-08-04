import assert from "node:assert/strict";
import test from "node:test";

import { optionValue, optionValues, parseArguments } from "./args.js";
import { terminalSafe } from "./format.js";

test("argument parser preserves repeated context files", () => {
  const parsed = parseArguments([
    "privacy",
    ".",
    "--file",
    "src",
    "--file=package.json",
    "--max-files",
    "12",
    "--out",
    "plan.json",
    "--provider",
    "lmstudio",
    "--api-key-env",
    "OPENAI_API_KEY",
    "--json",
  ]);

  assert.deepEqual(parsed.positional, ["privacy", "."]);
  assert.deepEqual(optionValues(parsed, "--file"), ["src", "package.json"]);
  assert.equal(optionValue(parsed, "--max-files"), "12");
  assert.equal(optionValue(parsed, "--out"), "plan.json");
  assert.equal(optionValue(parsed, "--provider"), "lmstudio");
  assert.equal(optionValue(parsed, "--api-key-env"), "OPENAI_API_KEY");
  assert.equal(parsed.flags.has("--json"), true);
});

test("argument parser rejects missing option values", () => {
  assert.throws(() => parseArguments(["privacy", "--file"]), /requires a value/);
});

test("terminal output removes control and ANSI escape sequences", () => {
  assert.equal(
    terminalSafe("safe\u001B[31m red\u001B[0m\u0007 text"),
    "safe red text",
  );
});
