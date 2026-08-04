# Localis Desktop

Native Tauri 2 workspace for Localis. It opens a local repository, renders
audit, privacy, and ship reports, and provides a project-aware AI workspace from
the same `@localis/core` contracts used by the CLI.

## Development

Requirements: Node.js 20.9+, Rust 1.77.2+, and the platform prerequisites from
the Tauri documentation.

```bash
npm install
npm run build
npm run dev:desktop
```

The Settings screen connects Ollama, LM Studio, OpenAI, OpenRouter, or a custom
OpenAI-compatible API and loads its model catalog from `/models`. Provider and
model preferences are stored locally, but API keys remain only in the Rust
process memory for the current session and clear when Localis closes.

The Rust bridge only accepts allowlisted report and AI operations. It invokes
the built Localis CLI with an argument array, never a shell command. API keys
are passed to the child process through a private environment variable rather
than command-line arguments. Packaged builds expect Node.js 20.9+ on the
machine.

No telemetry or remote WebView origin is configured. Native folder access is
limited to a user-selected directory through the Tauri dialog capability.
Project contents leave the machine only after the user explicitly connects an
API provider and sends a question; Localis bounds and redacts that context first.
