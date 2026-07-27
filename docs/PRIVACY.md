# Localis privacy contract

Localis treats network access as a product boundary. A feature is not private merely because its documentation says so; its runtime contract must make unintended transmission difficult.

## What stays local

The following operations do not require network access:

- project discovery and safe text-file reads;
- deterministic audit rules and scoring;
- context selection and size limits;
- secret, token, and PII redaction;
- outbound manifest and SHA-256 payload identity;
- `audit`, `privacy`, and `ask --dry-run`.

## Ollama boundary

The current model adapter follows the official Ollama `/api/generate` contract with `stream: false`. Localis accepts only plain HTTP loopback hosts:

- `localhost`;
- `127.0.0.1`;
- `::1`.

Remote hosts and HTTPS endpoints are rejected before `fetch` is called. This is deliberate: the first provider is a local provider, not an arbitrary compatible server.

## Context preparation

By default, Localis selects at most 24 readable project files and 384 KiB of input. It prioritizes README and manifest files, then common source directories. The user can narrow context with repeatable `--file` options.

Before a model request, each selected file is redacted independently. The preview includes:

- relative path;
- input and redacted byte size;
- number of redactions;
- truncation state;
- aggregate redaction counts;
- SHA-256 identity of the exact redacted payload.

Safe JSON output excludes the payload itself unless `--show-payload` is explicitly passed to the `privacy` command.

## Known limits

Pattern-based redaction can produce false positives and cannot guarantee discovery of every secret. Localis should be one control in a broader secure-development process. Never use production credentials as test data, and rotate any credential that entered version control.

The model output is never rehydrated with original secrets. Project files are wrapped as untrusted context, and the system prompt tells the local model not to follow instructions found inside repository content.
