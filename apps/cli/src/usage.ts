export const VERSION = "0.1.0";

export function usage(): string {
  return `
Localis ${VERSION} — private, local-first developer workspace
Made by KebiLab

Usage:
  localis <command> [path] [options]

Commands:
  audit [path]     Scan a project with deterministic local rules
  doctor           Check Node.js, Git, and optional Ollama readiness
  privacy [path]   Preview the exact redacted project context
  models           List models from Ollama or LM Studio
  ask <question>   Ask a local model about redacted project context
  propose <task>   Generate a validated plan with a local model
  fix <finding>    Generate a plan for an audit finding number or ID
  apply <plan>     Preview a change plan; add --yes to apply it
  history [path]   List local change and backup sessions
  undo [session]   Restore an applied session; requires --yes
  help             Show this help

Options:
  --json           Print machine-readable JSON
  --file <path>    Include only this file or directory (repeatable)
  --model <name>   Select a model from the active provider
  --provider <id>  Select ollama (default) or lmstudio
  --endpoint <url> Override the selected loopback provider endpoint
  --out <file>     Save a generated change plan without overwriting
  --max-files <n>  Limit context files (default: 24)
  --dry-run        Build context without calling Ollama
  --show-payload   Print redacted payload (privacy command only)
  --yes            Confirm a write or undo operation
  --version, -v    Print the Localis version
  --help, -h       Show help

Examples:
  localis doctor
  localis audit .
  localis audit ./services/api --json
  localis privacy . --file src --file package.json
  localis ask "Explain the authentication flow" . --model qwen2.5-coder:7b
  localis propose "Add input validation" . --file src --out localis-plan.json
  localis fix 1 . --out localis-fix.json
  localis apply ./localis-plan.json .
  localis apply ./localis-plan.json . --yes
  localis undo latest . --yes
`.trim();
}
