import assert from "node:assert/strict";
import test from "node:test";

import { optionValue, optionValues, parseArguments } from "./args.js";

test("argument parser preserves repeated context files", () => {
  const parsed = parseArguments([
    "privacy",
    ".",
    "--file",
    "src",
    "--file=package.json",
    "--max-files",
    "12",
    "--json",
  ]);

  assert.deepEqual(parsed.positional, ["privacy", "."]);
  assert.deepEqual(optionValues(parsed, "--file"), ["src", "package.json"]);
  assert.equal(optionValue(parsed, "--max-files"), "12");
  assert.equal(parsed.flags.has("--json"), true);
});

test("argument parser rejects missing option values", () => {
  assert.throws(() => parseArguments(["privacy", "--file"]), /requires a value/);
});
