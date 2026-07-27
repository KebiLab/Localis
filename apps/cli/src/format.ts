import type {
  AuditFinding,
  AuditReport,
  ContextPreview,
  DoctorReport,
  FindingSeverity,
  OllamaGenerateResult,
  OllamaModel,
} from "@localis/core";

const ANSI = {
  reset: "\u001B[0m",
  bold: "\u001B[1m",
  dim: "\u001B[2m",
  violet: "\u001B[38;5;99m",
  green: "\u001B[38;5;78m",
  yellow: "\u001B[38;5;220m",
  red: "\u001B[38;5;203m",
  gray: "\u001B[38;5;245m",
};

function useColor(): boolean {
  return Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;
}

function paint(value: string, color: keyof typeof ANSI): string {
  return useColor() ? `${ANSI[color]}${value}${ANSI.reset}` : value;
}

function severityLabel(severity: FindingSeverity): string {
  const color =
    severity === "critical" || severity === "high"
      ? "red"
      : severity === "medium"
        ? "yellow"
        : "gray";
  return paint(severity.toUpperCase().padEnd(8), color);
}

function formatFinding(finding: AuditFinding): string {
  return [
    `  ${severityLabel(finding.severity)} ${paint(finding.title, "bold")}`,
    `           ${finding.file}:${finding.line}:${finding.column} · ${finding.ruleId}`,
    `           ${finding.description}`,
    `           ${paint(`Fix: ${finding.remediation}`, "dim")}`,
  ].join("\n");
}

export function formatAudit(report: AuditReport): string {
  const heading = [
    paint("LOCALIS", "violet"),
    paint("PRIVATE PROJECT AUDIT", "dim"),
  ].join("  ");
  const languageLine =
    Object.entries(report.languages)
      .sort((left, right) => right[1] - left[1])
      .map(([language, count]) => `${language} ${count}`)
      .join(" · ") || "No source language detected";

  const output = [
    "",
    heading,
    paint("─".repeat(64), "dim"),
    `Project     ${report.root}`,
    `Scanned     ${report.scannedFiles} files in ${report.durationMs} ms`,
    `Languages   ${languageLine}`,
    `Score       ${paint(String(report.scores.overall), "bold")}/100`,
    `Findings    ${report.summary.critical} critical · ${report.summary.high} high · ${report.summary.medium} medium · ${report.summary.low} low`,
  ];

  if (report.truncated) {
    output.push(
      paint("Note        Scan limit reached; this report is incomplete.", "yellow"),
    );
  }

  output.push("", paint("Findings", "bold"));
  if (report.findings.length === 0) {
    output.push(
      `  ${paint("READY", "green")} No deterministic rule matched the scanned files.`,
    );
  } else {
    output.push(...report.findings.map(formatFinding));
  }

  output.push(
    "",
    paint(
      "Localis reports deterministic signals, not a guarantee that a project is secure.",
      "dim",
    ),
    "",
  );
  return output.join("\n");
}

export function formatDoctor(report: DoctorReport): string {
  const output = [
    "",
    `${paint("LOCALIS", "violet")}  ${paint("ENVIRONMENT DOCTOR", "dim")}`,
    paint("─".repeat(64), "dim"),
  ];

  for (const check of report.checks) {
    const marker =
      check.status === "ready"
        ? paint("READY   ", "green")
        : check.status === "optional"
          ? paint("OPTIONAL", "yellow")
          : paint("ERROR   ", "red");
    output.push(`${marker}  ${check.label.padEnd(12)} ${check.detail}`);
  }

  output.push(
    "",
    report.ready
      ? paint("Core Localis workflows are ready.", "green")
      : paint("Resolve required checks before running Localis.", "red"),
    "",
  );
  return output.join("\n");
}

function formatBytes(bytes: number): string {
  if (bytes < 1_024) return `${bytes} B`;
  if (bytes < 1_024 * 1_024) return `${(bytes / 1_024).toFixed(1)} KiB`;
  return `${(bytes / (1_024 * 1_024)).toFixed(1)} MiB`;
}

export function formatPrivacyPreview(preview: ContextPreview): string {
  const totalRedactions = Object.values(preview.redactions).reduce(
    (sum, count) => sum + count,
    0,
  );
  const output = [
    "",
    `${paint("LOCALIS", "violet")}  ${paint("PRIVACY GATEWAY", "dim")}`,
    paint("─".repeat(64), "dim"),
    `Project     ${preview.root}`,
    `Context     ${preview.files.length} files · ${formatBytes(preview.outputBytes)}`,
    `Redactions  ${totalRedactions} total · ${preview.redactions.SECRET} secrets · ${preview.redactions.TOKEN} tokens · ${preview.redactions.PII} PII`,
    `Payload     sha256:${preview.payloadSha256.slice(0, 16)}…`,
    "",
    paint("Outbound manifest", "bold"),
  ];

  if (preview.files.length === 0) {
    output.push("  No readable project files selected.");
  } else {
    for (const file of preview.files) {
      const redactionLabel = file.redactions
        ? paint(`${file.redactions} redacted`, "yellow")
        : paint("clean", "green");
      output.push(
        `  ${file.path}  ${paint(formatBytes(file.outputBytes), "dim")}  ${redactionLabel}${file.truncated ? `  ${paint("truncated", "yellow")}` : ""}`,
      );
    }
  }

  if (preview.truncated) {
    output.push("", paint("Context limits were reached; the payload is partial.", "yellow"));
  }

  output.push(
    "",
    paint(
      "No network request was made. Use ask to send this redacted context to local Ollama.",
      "dim",
    ),
    "",
  );
  return output.join("\n");
}

export function formatModels(models: OllamaModel[]): string {
  const output = [
    "",
    `${paint("LOCALIS", "violet")}  ${paint("LOCAL MODELS", "dim")}`,
    paint("─".repeat(64), "dim"),
  ];

  if (models.length === 0) {
    output.push("No Ollama models are installed. Pull one with: ollama pull qwen2.5-coder:7b");
  } else {
    for (const model of models) {
      output.push(
        `  ${paint(model.name, "bold")}${model.size ? `  ${paint(formatBytes(model.size), "dim")}` : ""}`,
      );
    }
  }
  output.push("");
  return output.join("\n");
}

export function formatAnswer(
  result: OllamaGenerateResult,
  preview: ContextPreview,
): string {
  const redactionCount = Object.values(preview.redactions).reduce(
    (sum, count) => sum + count,
    0,
  );
  return [
    "",
    `${paint("LOCALIS", "violet")}  ${paint(result.model.toUpperCase(), "dim")}`,
    paint("─".repeat(64), "dim"),
    result.response.trim(),
    "",
    paint("─".repeat(64), "dim"),
    paint(
      `${preview.files.length} files · ${redactionCount} redactions · sha256:${preview.payloadSha256.slice(0, 12)}… · ${result.durationMs ?? 0} ms`,
      "dim",
    ),
    "",
  ].join("\n");
}
