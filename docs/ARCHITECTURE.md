# Localis architecture

Localis separates product interfaces from the code that reads and evaluates a repository.

```text
CLI -----------------+
Desktop (Tauri) -----+--- Localis Core --- Project files
CI ------------------+          |
                                +-- Deterministic rules
                                +-- Privacy Gateway
                                +-- Explicit model providers
                                +-- Transactional changes
                                +-- Verification and ship gate
```

## `localis-core`

The core owns project discovery, bounded file reads, deterministic audit rules,
redaction, change transactions, local model adapters, and verification. It does
not make an external network request unless the caller selects a provider
capability whose contract explicitly describes that request.

AI work is split into explicit boundaries:

- `prepareProjectContext()` selects, bounds, redacts, and hashes context without network access;
- `generateWithLocalModel()` routes to Ollama, LM Studio, or the explicit OpenAI-compatible adapter;
- `listOpenAICompatibleModels()` discovers a remote provider catalog over HTTPS;
- `proposeChangePlanWithLocalModel()` validates structured model output as untrusted input;
- `proposeFindingFixWithLocalModel()` limits context to one current audit finding and file.

The model never receives a file-write capability. Change plans use relative
paths, expected SHA-256 hashes, bounded complete file contents, and a deliberate
preview/apply split. Apply creates a private backup; undo verifies current and
backup hashes before restoration.

Verification discovers allowlisted commands from project manifests. Commands
run with argument arrays and `shell: false`. Captured output is bounded and
redacted before it enters a report.

## Interfaces

### CLI

The CLI renders the same reports for humans and automation. Exit codes are:

- `0`: completed and ready;
- `1`: invalid usage, execution error, or failed test selection;
- `2`: audit or ship completed with release-blocking findings.

### Desktop

The Tauri 2 shell exposes allowlisted report, provider discovery, and AI ask
commands through its Rust bridge. It canonicalizes the selected project
directory, invokes the CLI without a shell, caps report size, and parses JSON
before returning data to the WebView. API keys live in Rust process memory and
reach the CLI only through a child-process environment variable. Its capability
file grants only core defaults and native folder selection.

### Web

The Next.js site is a public product surface for Vercel. It never receives or
analyzes source code.

## Trust boundaries

Project source, model output, plan files, subprocess output, and stored backup
metadata are all treated as untrusted. Network access is opt-in: loopback-only
for local runtimes and HTTPS-only for the generic API adapter. Filesystem writes
require an explicit confirmed change plan and are conflict checked.
