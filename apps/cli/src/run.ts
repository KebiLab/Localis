import { runAudit, runDoctor } from "@localis/core";

import { formatAudit, formatDoctor } from "./format.js";
import { usage, VERSION } from "./usage.js";

export interface CliResult {
  exitCode: number;
  stdout?: string;
  stderr?: string;
}

export async function runCli(args: string[]): Promise<CliResult> {
  const json = args.includes("--json");
  const positional = args.filter((arg) => !arg.startsWith("-"));
  const command = positional[0];

  if (args.includes("--version") || args.includes("-v")) {
    return { exitCode: 0, stdout: VERSION };
  }

  if (
    !command ||
    command === "help" ||
    args.includes("--help") ||
    args.includes("-h")
  ) {
    return { exitCode: 0, stdout: usage() };
  }

  if (command === "doctor") {
    const report = await runDoctor();
    return {
      exitCode: report.ready ? 0 : 1,
      stdout: json ? JSON.stringify(report, null, 2) : formatDoctor(report),
    };
  }

  if (command === "audit") {
    const root = positional[1] ?? ".";
    try {
      const report = await runAudit(root);
      return {
        exitCode: report.summary.critical > 0 ? 2 : 0,
        stdout: json ? JSON.stringify(report, null, 2) : formatAudit(report),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        exitCode: 1,
        stderr: json
          ? JSON.stringify({ error: "AUDIT_FAILED", message })
          : `Localis could not audit "${root}": ${message}`,
      };
    }
  }

  return {
    exitCode: 1,
    stderr: `Unknown command: ${command}\n\n${usage()}`,
  };
}
