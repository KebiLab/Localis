# Localis Desktop

Native Tauri 2 workspace for Localis. It opens a local repository and renders
audit, privacy, and ship reports from the same `@localis/core` contracts used by
the CLI.

## Development

Requirements: Node.js 20.9+, Rust 1.77.2+, and the platform prerequisites from
the Tauri documentation.

```bash
npm install
npm run build
npm run dev:desktop
```

The Rust bridge only accepts the allowlisted `audit`, `privacy`, `ship`, and
`doctor` operations. It invokes the built Localis CLI with an argument array,
never a shell command. Packaged builds expect Node.js 20.9+ on the machine.

No telemetry or remote origin is configured. Native folder access is limited
to a user-selected directory through the Tauri dialog capability.
