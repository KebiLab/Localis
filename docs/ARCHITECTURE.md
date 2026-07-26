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

### `@localis/cli`

Turns core results into human-readable or JSON output. Exit codes are stable automation contracts:

- `0` — command completed and no critical finding was detected;
- `1` — command failed or usage is invalid;
- `2` — audit completed with at least one critical finding.

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
