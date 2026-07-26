import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type { DoctorCheck, DoctorReport } from "./types.js";

const execFileAsync = promisify(execFile);

async function checkGit(): Promise<DoctorCheck> {
  try {
    const { stdout } = await execFileAsync("git", ["--version"], {
      timeout: 2_000,
      windowsHide: true,
    });
    return {
      id: "git",
      label: "Git",
      status: "ready",
      detail: stdout.trim(),
    };
  } catch {
    return {
      id: "git",
      label: "Git",
      status: "error",
      detail: "Git was not found in PATH.",
    };
  }
}

async function checkOllama(): Promise<DoctorCheck> {
  try {
    const response = await fetch("http://127.0.0.1:11434/api/tags", {
      signal: AbortSignal.timeout(1_200),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return {
      id: "ollama",
      label: "Ollama",
      status: "ready",
      detail: "Local model service is reachable.",
    };
  } catch {
    return {
      id: "ollama",
      label: "Ollama",
      status: "optional",
      detail: "Not running. Deterministic Localis checks still work offline.",
    };
  }
}

function checkNode(): DoctorCheck {
  const major = Number.parseInt(process.versions.node.split(".")[0] ?? "0", 10);
  return {
    id: "node",
    label: "Node.js",
    status: major >= 20 ? "ready" : "error",
    detail:
      major >= 20
        ? `v${process.versions.node}`
        : `v${process.versions.node}; Localis requires Node.js 20.9 or newer.`,
  };
}

export async function runDoctor(): Promise<DoctorReport> {
  const checks = await Promise.all([Promise.resolve(checkNode()), checkGit(), checkOllama()]);
  return {
    ready: checks.every((check) => check.status !== "error"),
    checks,
  };
}
