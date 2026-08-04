import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";

import { runAudit } from "./audit.js";
import { redactSensitiveText } from "./privacy.js";
import type { AuditReport } from "./types.js";

export type VerificationKind = "test" | "typecheck" | "lint" | "build";

export interface VerificationCheck {
  id: string;
  kind: VerificationKind;
  label: string;
  command: string;
  args: string[];
  source: string;
}

export interface VerificationResult extends VerificationCheck {
  status: "passed" | "failed";
  exitCode: number;
  durationMs: number;
  stdout: string;
  stderr: string;
}

export interface VerificationReport {
  schemaVersion: 1;
  root: string;
  generatedAt: string;
  durationMs: number;
  ready: boolean;
  discovered: VerificationCheck[];
  results: VerificationResult[];
}

export interface ShipReport {
  schemaVersion: 1;
  root: string;
  generatedAt: string;
  ready: boolean;
  audit: AuditReport;
  verification: VerificationReport;
  blockers: string[];
}

export interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export type CommandRunner = (
  command: string,
  args: string[],
  cwd: string,
  timeoutMs: number,
) => Promise<CommandResult>;

export interface RunVerificationOptions {
  kinds?: VerificationKind[];
  ids?: string[];
  timeoutMs?: number;
  commandRunner?: CommandRunner;
}

const OUTPUT_LIMIT = 64 * 1024;
const DEFAULT_TIMEOUT = 5 * 60_000;

async function exists(filePath: string): Promise<boolean> {
  try {
    return (await fs.stat(filePath)).isFile();
  } catch {
    return false;
  }
}

function managerInvocation(name: "npm" | "pnpm" | "yarn" | "bun"): {
  command: string;
  args: string[];
} {
  if (process.platform !== "win32" || name === "bun") {
    return { command: name, args: [] };
  }
  const nodeDirectory = path.dirname(process.execPath);
  if (name === "npm") {
    return {
      command: process.execPath,
      args: [path.join(nodeDirectory, "node_modules", "npm", "bin", "npm-cli.js")],
    };
  }
  return {
    command: process.execPath,
    args: [path.join(nodeDirectory, "node_modules", "corepack", "dist", "corepack.js"), name],
  };
}

async function discoverNodeChecks(root: string): Promise<VerificationCheck[]> {
  const manifestPath = path.join(root, "package.json");
  if (!(await exists(manifestPath))) return [];
  const stat = await fs.stat(manifestPath);
  if (stat.size > 1024 * 1024) return [];
  let manifest: { scripts?: Record<string, unknown>; packageManager?: unknown };
  try {
    manifest = JSON.parse(await fs.readFile(manifestPath, "utf8")) as typeof manifest;
  } catch {
    return [];
  }

  const declared = typeof manifest.packageManager === "string"
    ? manifest.packageManager.split("@")[0]
    : undefined;
  const manager = declared === "pnpm" || declared === "yarn" || declared === "bun" || declared === "npm"
    ? declared
    : (await exists(path.join(root, "pnpm-lock.yaml")))
      ? "pnpm"
      : (await exists(path.join(root, "yarn.lock")))
        ? "yarn"
        : (await exists(path.join(root, "bun.lockb"))) || (await exists(path.join(root, "bun.lock")))
          ? "bun"
          : "npm";
  const scripts = manifest.scripts ?? {};
  const invocation = managerInvocation(manager);
  const supported: Array<[VerificationKind, string]> = [
    ["test", "test"],
    ["typecheck", "typecheck"],
    ["lint", "lint"],
    ["build", "build"],
  ];
  return supported.flatMap(([kind, script]) =>
    typeof scripts[script] === "string"
      ? [{
          id: `node:${script}`,
          kind,
          label: `Node.js ${script}`,
          command: invocation.command,
          args: [...invocation.args, "run", script],
          source: "package.json",
        }]
      : [],
  );
}

async function discoverOtherChecks(root: string): Promise<VerificationCheck[]> {
  const checks: VerificationCheck[] = [];
  const pyproject = path.join(root, "pyproject.toml");
  if (await exists(pyproject)) {
    const source = (await fs.readFile(pyproject, "utf8")).slice(0, 1024 * 1024);
    if (/\bpytest\b|\[tool\.pytest/i.test(source)) {
      checks.push({ id: "python:test", kind: "test", label: "Python tests", command: "python", args: ["-m", "pytest"], source: "pyproject.toml" });
    }
    if (/\[tool\.mypy\]/i.test(source)) {
      checks.push({ id: "python:typecheck", kind: "typecheck", label: "Python types", command: "python", args: ["-m", "mypy", "."], source: "pyproject.toml" });
    }
    if (/\[tool\.ruff/i.test(source)) {
      checks.push({ id: "python:lint", kind: "lint", label: "Python lint", command: "python", args: ["-m", "ruff", "check", "."], source: "pyproject.toml" });
    }
  }
  if (await exists(path.join(root, "Cargo.toml"))) {
    checks.push(
      { id: "rust:test", kind: "test", label: "Rust tests", command: "cargo", args: ["test", "--all-targets"], source: "Cargo.toml" },
      { id: "rust:typecheck", kind: "typecheck", label: "Rust check", command: "cargo", args: ["check", "--all-targets"], source: "Cargo.toml" },
      { id: "rust:build", kind: "build", label: "Rust build", command: "cargo", args: ["build"], source: "Cargo.toml" },
    );
  }
  if (await exists(path.join(root, "go.mod"))) {
    checks.push(
      { id: "go:test", kind: "test", label: "Go tests", command: "go", args: ["test", "./..."], source: "go.mod" },
      { id: "go:lint", kind: "lint", label: "Go vet", command: "go", args: ["vet", "./..."], source: "go.mod" },
      { id: "go:build", kind: "build", label: "Go build", command: "go", args: ["build", "./..."], source: "go.mod" },
    );
  }
  return checks;
}

export async function discoverVerificationChecks(root = "."): Promise<VerificationCheck[]> {
  const resolvedRoot = path.resolve(root);
  const stat = await fs.stat(resolvedRoot);
  if (!stat.isDirectory()) throw new Error(`Project root is not a directory: ${resolvedRoot}`);
  return [...await discoverNodeChecks(resolvedRoot), ...await discoverOtherChecks(resolvedRoot)];
}

export const runCommand: CommandRunner = async (command, args, cwd, timeoutMs) =>
  new Promise((resolve) => {
    const child = spawn(command, args, { cwd, shell: false, windowsHide: true, env: process.env });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timer = setTimeout(() => {
      child.kill();
      if (!settled) {
        settled = true;
        resolve({ exitCode: 124, stdout, stderr: `${stderr}\nTimed out after ${timeoutMs} ms.` });
      }
    }, timeoutMs);
    child.stdout.on("data", (chunk: Buffer) => { stdout = `${stdout}${chunk.toString("utf8")}`.slice(-OUTPUT_LIMIT); });
    child.stderr.on("data", (chunk: Buffer) => { stderr = `${stderr}${chunk.toString("utf8")}`.slice(-OUTPUT_LIMIT); });
    child.on("error", (error) => {
      clearTimeout(timer);
      if (!settled) {
        settled = true;
        resolve({ exitCode: 127, stdout, stderr: error.message });
      }
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (!settled) {
        settled = true;
        resolve({ exitCode: code ?? 1, stdout, stderr });
      }
    });
  });

function safeOutput(value: string): string {
  return redactSensitiveText(value.slice(-OUTPUT_LIMIT)).text;
}

export async function runVerification(
  root = ".",
  options: RunVerificationOptions = {},
): Promise<VerificationReport> {
  const startedAt = performance.now();
  const resolvedRoot = path.resolve(root);
  const discovered = await discoverVerificationChecks(resolvedRoot);
  const selected = discovered.filter((check) =>
    options.ids?.length
      ? options.ids.includes(check.id)
      : options.kinds?.length
        ? options.kinds.includes(check.kind)
        : true,
  );
  const runner = options.commandRunner ?? runCommand;
  const results: VerificationResult[] = [];
  for (const check of selected) {
    const checkStartedAt = performance.now();
    const result = await runner(check.command, check.args, resolvedRoot, options.timeoutMs ?? DEFAULT_TIMEOUT);
    results.push({
      ...check,
      status: result.exitCode === 0 ? "passed" : "failed",
      exitCode: result.exitCode,
      durationMs: Math.round(performance.now() - checkStartedAt),
      stdout: safeOutput(result.stdout),
      stderr: safeOutput(result.stderr),
    });
  }
  return {
    schemaVersion: 1,
    root: resolvedRoot,
    generatedAt: new Date().toISOString(),
    durationMs: Math.round(performance.now() - startedAt),
    ready: results.length > 0 && results.every((result) => result.status === "passed"),
    discovered,
    results,
  };
}

export async function runShipCheck(
  root = ".",
  options: RunVerificationOptions = {},
): Promise<ShipReport> {
  const [audit, verification] = await Promise.all([
    runAudit(root),
    runVerification(root, options),
  ]);
  const blockers: string[] = [];
  if (audit.summary.critical > 0) blockers.push(`${audit.summary.critical} critical audit finding(s)`);
  if (audit.summary.high > 0) blockers.push(`${audit.summary.high} high audit finding(s)`);
  if (verification.results.length === 0) blockers.push("No verification checks were discovered");
  for (const result of verification.results.filter((candidate) => candidate.status === "failed")) {
    blockers.push(`${result.id} failed with exit code ${result.exitCode}`);
  }
  return {
    schemaVersion: 1,
    root: audit.root,
    generatedAt: new Date().toISOString(),
    ready: blockers.length === 0,
    audit,
    verification,
    blockers,
  };
}
