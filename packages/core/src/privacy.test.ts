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

test("does not redact an existing Localis placeholder twice", () => {
  const result = redactSensitiveText(
    'token = "ghp_1234567890abcdefghijklmnop"', // localis-ignore secret.github-token
  );

  assert.equal(result.findings.length, 1);
  assert.match(result.text, /<LOCALIS_TOKEN_1>/);
  assert.ok(!result.text.includes("LOCALIS_SECRET"));
});

test("redacts database passwords without hiding connection metadata", () => {
  const result = redactSensitiveText(
    "postgresql://localis:database-password@db.internal:5432/app", // localis-ignore privacy.personal-email
  );

  assert.equal(
    result.text,
    "postgresql://localis:<LOCALIS_SECRET_1>@db.internal:5432/app", // localis-ignore privacy.personal-email
  );
  assert.equal(result.findings[0]?.kind, "SECRET");
});

test("redacts complete private key blocks", () => {
  const result = redactSensitiveText(
    "-----BEGIN PRIVATE KEY-----\nsynthetic-key-material\n-----END PRIVATE KEY-----", // localis-ignore secret.private-key
  );

  assert.equal(result.text, "<LOCALIS_SECRET_1>");
  assert.equal(result.findings.length, 1);
});
