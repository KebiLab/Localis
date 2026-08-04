<div align="center">

# Localis

**Your code. Your machine. Your AI.**

Private, local-first developer workspace for code audits, safe fixes, tests, and release workflows.

[Website](https://localis.dev) · [Roadmap](#roadmap) · [Contributing](CONTRIBUTING.md)

_Made by KebiLab._

</div>

---

## Why Localis

AI developer tools should not make you choose between speed and control. Localis starts with deterministic, offline analysis and keeps every network boundary explicit. Local models and cloud providers are optional capabilities—not hidden defaults.

Localis is being built around three promises:

- **Local by default.** Project discovery, deterministic checks, redaction, and reports run on your machine.
- **Evidence before advice.** Every finding points to a file, line, rule, and concrete reason.
- **Preview before change.** Planned AI fixes will always be reviewable and reversible before they touch source code.

## Current foundation

The first development milestone includes:

- `localis audit [path]` — deterministic project and security scan;
- `localis doctor` — environment readiness checks for Node.js, Git, and Ollama;
- `localis privacy [path]` — exact outbound manifest, redaction counts, and payload hash;
- `localis models` — locally installed Ollama model discovery;
- `localis ask <question> [path]` — project-aware answers through local Ollama;
- `localis propose <task> [path]` — schema-constrained local AI change plan generation;
- `localis fix <finding> [path]` — generate a narrowly scoped plan from an audit finding number or ID;
- `localis test [path]` — discover and run tests across Node.js, Python, Rust, and Go projects;
- `localis ship [path]` — release gate combining audit, tests, types, lint, and build;
- `localis apply <plan.json> [path]` — hash-checked diff preview and confirmed transaction;
- `localis history` / `localis undo` — local backup history and conflict-safe restoration;
- `--json` output for automation and future desktop integration;
- a reusable `@localis/core` package;
- the first Vercel-ready product website.

The desktop application and broader test/release intelligence are on the roadmap and are not presented as finished features yet.

## Quick start

Requirements: Node.js 20.9 or newer.

```bash
npm install
npm run build
node apps/cli/dist/index.js doctor
node apps/cli/dist/index.js audit .
node apps/cli/dist/index.js privacy . --file src --file package.json
```

For machine-readable output:

```bash
node apps/cli/dist/index.js audit . --json
```

Choose LM Studio instead of the default Ollama provider by starting its local
server and passing `--provider lmstudio`. Both providers are restricted to
loopback endpoints.

```bash
node apps/cli/dist/index.js models --provider lmstudio
node apps/cli/dist/index.js ask "Review this module" . --provider lmstudio --file src
```

Ask an installed Ollama model about redacted project context:

```bash
node apps/cli/dist/index.js models
node apps/cli/dist/index.js ask "Explain the authentication flow" . \
  --file src --model qwen2.5-coder:7b
```

Use `ask --dry-run` to inspect the manifest and payload hash without contacting Ollama. Localis only permits Ollama endpoints on `localhost`, `127.0.0.1`, or `::1`.

Generate, preview, and apply a validated change plan:

```bash
node apps/cli/dist/index.js propose "Add input validation" . \
  --file src --model qwen2.5-coder:7b --out localis-plan.json
node apps/cli/dist/index.js apply ./localis-plan.json .
node apps/cli/dist/index.js apply ./localis-plan.json . --yes
node apps/cli/dist/index.js history .
node apps/cli/dist/index.js undo latest . --yes
```

Turn an individual finding into a reviewable plan:

```bash
node apps/cli/dist/index.js audit .
node apps/cli/dist/index.js fix 1 . --out localis-fix.json
node apps/cli/dist/index.js apply localis-fix.json . --yes
```

Run discovered tests or the complete release gate:

```bash
node apps/cli/dist/index.js test . --dry-run
node apps/cli/dist/index.js test .
node apps/cli/dist/index.js ship .
```

`propose` cannot change source files: it turns schema-constrained model output into a hash-checked plan. `apply` never writes without `--yes`. It checks every original SHA-256 before creating a private backup under `.localis/backups`. Undo refuses to overwrite files changed after Localis applied them. See [Change plans](docs/CHANGE_PLANS.md).

## Workspace

```text
apps/
  cli/       Localis command-line interface
  desktop/   Tauri desktop application plan
  web/       Next.js product website for Vercel
packages/
  core/      Scanner, audit rules, privacy boundary, environment checks
docs/
  ARCHITECTURE.md
```

## Roadmap

- [x] Local-first scanner and deterministic audit
- [x] Environment doctor and JSON reports
- [x] Privacy Gateway preview for outbound AI context
- [x] Loopback-only Ollama model adapter
- [x] Hash-checked change plans, diff preview, transactional apply, and safe undo
- [x] Local Ollama generation of schema-constrained change plans
- [x] LM Studio model adapter
- [x] One-click plan generation from individual audit findings
- [ ] Tauri desktop workspace for Windows, macOS, and Linux
- [x] Test intelligence and release readiness checks
- [ ] VS Code, JetBrains, and CI integrations

## Security

Please do not publish vulnerabilities in a public issue. See [SECURITY.md](SECURITY.md) for the reporting process.

## License

Licensed under the [Apache License 2.0](LICENSE).

Copyright © 2026 KebiLab.
