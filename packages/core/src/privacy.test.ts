import assert from "node:assert/strict";
import test from "node:test";

import { redactSensitiveText, restoreRedactedText } from "./privacy.js";

test("redacts repeated sensitive values with one stable placeholder", () => {
  // localis-ignore-next-line privacy.personal-email
  const source = "Contact dev@example.com, then dev@example.com again.";
  const result = redactSensitiveText(source);

  assert.equal(result.findings.length, 1);
  assert.equal(result.text.match(/<LOCALIS_PII_1>/g)?.length, 2);
  assert.equal(restoreRedactedText(result.text, result.replacements), source);
});

test("keeps the assignment shape while hiding a secret", () => {
  const result = redactSensitiveText(
    'api_key = "a-very-secret-value"', // localis-ignore secret.generic-assignment
  );

  assert.equal(
    result.text,
    'api_key = "<LOCALIS_SECRET_1>"', // localis-ignore secret.generic-assignment
  );
  assert.equal(result.findings[0]?.kind, "SECRET");
});
