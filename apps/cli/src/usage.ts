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
  help             Show this help

Options:
  --json           Print machine-readable JSON
  --version, -v    Print the Localis version
  --help, -h       Show help

Examples:
  localis doctor
  localis audit .
  localis audit ./services/api --json
`.trim();
}
