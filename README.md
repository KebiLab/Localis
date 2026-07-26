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
- `--json` output for automation and future desktop integration;
- a reusable `@localis/core` package;
- the first Vercel-ready product website.

The AI fix engine and desktop application are on the roadmap and are not presented as finished features yet.

## Quick start

Requirements: Node.js 20.9 or newer.

```bash
npm install
npm run build
node apps/cli/dist/index.js doctor
node apps/cli/dist/index.js audit .
```

For machine-readable output:

```bash
node apps/cli/dist/index.js audit . --json
```

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
- [ ] Privacy Gateway preview for outbound AI context
- [ ] Ollama and LM Studio model adapters
- [ ] Safe fix plan → diff → approve → apply → undo
- [ ] Tauri desktop workspace for Windows, macOS, and Linux
- [ ] Test intelligence and release readiness checks
- [ ] VS Code, JetBrains, and CI integrations

## Security

Please do not publish vulnerabilities in a public issue. See [SECURITY.md](SECURITY.md) for the reporting process.

## License

Licensed under the [Apache License 2.0](LICENSE).

Copyright © 2026 KebiLab.
