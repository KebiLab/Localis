# Localis change plans

Localis never treats free-form model text as an instruction to write files. A proposed change must first become a validated versioned plan.

## Schema

```json
{
  "schemaVersion": 1,
  "id": "replace-legacy-parser",
  "createdAt": "2026-07-27T06:00:00.000Z",
  "files": [
    {
      "path": "src/parser.ts",
      "beforeSha256": "64-character lowercase SHA-256 of the current UTF-8 file",
      "after": "export function parse() {\n  return true;\n}\n",
      "summary": "Replace the legacy parser"
    }
  ]
}
```

For a new file, `beforeSha256` is `null`. Version 1 intentionally does not support deleting files.

The `createChangePlan()` core API computes source hashes for trusted callers. Future AI workflows will produce proposals and pass them through this API rather than constructing unchecked plans.

## Generate with local Ollama

```bash
localis propose "Add input validation to the API routes" . \
  --file src --out localis-plan.json
```

`propose` sends only bounded, redacted context to a loopback-only Ollama endpoint. It uses Ollama structured output with a JSON Schema and temperature `0`, then independently validates the returned paths and complete file contents. Known redaction placeholders are restored locally and only for their originating file; secret values never enter the model request. Localis computes every `beforeSha256` itself from the current project.

The model cannot write source files. `--out` only creates a new plan file and refuses to overwrite an existing one. Use `propose --dry-run` to inspect the context manifest without contacting Ollama.

## Preview and apply

```bash
localis apply ./localis-plan.json .
localis apply ./localis-plan.json . --yes
```

The first command is read-only and prints the diff. The second repeats every validation, creates a backup session, and applies the transaction.

The engine rejects:

- absolute paths, traversal, empty segments, and `.localis` targets;
- symbolic links anywhere in a target path;
- duplicate paths;
- unsupported schema versions and malformed hashes;
- files larger than 2 MiB or plans larger than 10 MiB;
- more than 100 files;
- a current file whose SHA-256 no longer matches the plan.

## Backup and undo

Backups live under `.localis/backups/<session-id>` inside the project and are excluded from scans and Git. Localis attempts to store directories as owner-only and files as mode `0600` where the operating system supports POSIX permissions.

```bash
localis history .
localis undo latest . --yes
```

Undo checks that each current file still matches the exact result Localis wrote. If a developer, formatter, or another tool changed any target afterward, the entire undo stops with a conflict before restoration begins.

Backup content is integrity-checked before restoration. Created files are removed only during an explicitly confirmed undo of the session that created them.
