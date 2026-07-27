# Localis Desktop

The desktop application is planned for the next milestone.

Chosen stack:

- Tauri 2 for the native shell;
- React and TypeScript for the interface;
- `@localis/core` contracts for audits and privacy reports;
- no background telemetry by default.

The first usable screen will open a repository, run a deterministic audit, filter findings, and display the local/cloud Privacy Boundary before any AI action.

The required core contracts now exist: audits, bounded context preparation, redaction manifests, payload hashes, and loopback-only Ollama generation. The desktop shell can consume these contracts without inventing a second privacy model.

The proposal and transaction contracts are also ready: the GUI can request a schema-constrained local AI proposal, render `ChangePreview`, require a deliberate approval action, call `applyChangePlan`, show backup history, and expose conflict-safe undo.
