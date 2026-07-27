import assert from "node:assert/strict";
import test from "node:test";

import { unifiedDiff } from "./diff.js";

test("unified diff includes file headers, context, removals, and additions", () => {
  const result = unifiedDiff(
    "one\ntwo\nthree\nfour\n",
    "one\ntwo changed\nthree\nfour\n",
    "src/example.ts",
  );

  assert.equal(result.truncated, false);
  assert.match(result.text, /^--- a\/src\/example\.ts/m);
  assert.match(result.text, /^-two$/m);
  assert.match(result.text, /^\+two changed$/m);
  assert.match(result.text, /^ three$/m);
});

test("unified diff limits exceptionally large output", () => {
  const result = unifiedDiff(
    Array.from({ length: 100 }, (_, index) => `old ${index}`).join("\n"),
    Array.from({ length: 100 }, (_, index) => `new ${index}`).join("\n"),
    "large.txt",
    20,
  );

  assert.equal(result.truncated, true);
  assert.match(result.text, /diff truncated after 20 lines/);
});
