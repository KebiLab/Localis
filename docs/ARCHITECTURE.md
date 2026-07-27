# Localis architecture

Localis separates product interfaces from the code that reads and evaluates a repository.

```text
CLI ───────────────┐
Desktop (Tauri) ───┼── Localis Core ── Project files
CI integration ────┘       │
                            ├── Deterministic rules
                            ├── Privacy Gateway
                            └── Explicit model adapters
```

## Packages

### `@localis/core`

Owns project discovery, safe file reads, deterministic audit rules, redaction, scoring, and environment diagnostics. It must not make an external network request unless the caller invokes a capability whose name and contract clearly describe that request.

The core now exposes two separate AI contracts:

- `prepareProjectContext()` performs bounded selection, redaction, manifest creation, and payload hashing without network access;
- `generateWithOllama()` accepts only loopback HTTP endpoints and sends a non-streaming request to the local Ollama API.

The change engine accepts typed JSON plans rather than free-form model output. It validates paths and size limits, checks the expected SHA-256 of every source file, previews a bounded unified diff, and requires explicit confirmation before writing. Applied transactions are recorded under `.localis/backups`; undo verifies both current-file and backup hashes before restoring anything.

### `@localis/cli`

Turns core results into human-readable or JSON output. Exit codes are stable automation contracts:

- `0` — command completed and no critical finding was detected;
- `1` — command failed or usage is invalid;
- `2` — audit completed with at least one critical finding.

Human-readable output strips terminal control sequences from repository paths, provider errors, model responses, and diff content before rendering.

### `@localis/web`

The public product website and documentation entry point. It runs on Vercel and does not receive or analyze users' source code.

### Desktop

The desktop shell will use Tauri 2 with React and TypeScript. It will call the same core contracts as the CLI, surface exact diffs, and make the local/cloud privacy boundary visible before each model request.

## Privacy boundary

Local scanning and redaction are always available offline. A model provider is an optional adapter. Before any cloud adapter receives content, the planned Privacy Gateway will:

1. select only relevant context;
2. detect and redact secrets and personal data;
3. show the exact outbound payload;
4. require explicit approval;
5. record a local, secret-free audit event.

The first four steps are implemented for the CLI context workflow. Local audit-event persistence remains planned.
