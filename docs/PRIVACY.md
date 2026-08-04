# Localis privacy contract

Localis treats network access as a product boundary. A feature is not private
because its copy says so; its runtime contract must make unintended
transmission difficult.

## What stays local

Project discovery, audit, context selection, redaction, payload hashing, change
preview/apply/undo, test discovery, and ship checks do not require network
access. `ask --dry-run`, `propose --dry-run`, and `fix --dry-run` build the exact
context preview without contacting a model.

## Model provider boundary

Ollama uses `/api/generate`; LM Studio uses its OpenAI-compatible
`/v1/chat/completions` endpoint. Both providers accept only plain HTTP on:

- `localhost`;
- `127.0.0.1`;
- `::1`.

For these two local providers, remote hosts and HTTPS endpoints are rejected
before `fetch` runs. Their provider flags choose a local runtime, not an
arbitrary compatible server.

The `openai-compatible` provider is the explicit remote boundary. It requires
an HTTPS base URL (loopback development endpoints may use HTTP), discovers
models through `/models`, and sends prompts through `/chat/completions`. API
keys are supplied through an environment variable in the CLI. The desktop app
keeps them in process memory for the current session and never writes them to
local storage or passes them in command-line arguments.

## Context preparation

By default Localis selects at most 24 readable files and 384 KiB of input. Each
file is redacted independently. The preview contains relative paths, byte
counts, redaction counts, truncation state, and the SHA-256 identity of the
exact payload. JSON output omits payload contents unless `--show-payload` is
explicitly used with `privacy`.

Model output never receives original secret values. Redaction restoration is
scoped to an originating file and is used only while validating a local change
plan, so a placeholder cannot disclose a value across files.

## Desktop and website

The desktop app has no remote WebView origin or telemetry configuration. It
opens a folder only after a native user selection and delegates reports to the
local CLI. A remote provider receives bounded, redacted project context only
after the user connects it and sends a question. The public website is
independent and never accepts repository contents.

## Limits

Pattern-based redaction can produce false positives and cannot guarantee every
secret is found. Never use production credentials as test data. Rotate any
credential that entered version control, even if Localis later redacts it.
