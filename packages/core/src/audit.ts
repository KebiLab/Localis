import { createHash } from "node:crypto";
import path from "node:path";

import { analyzeFile } from "./rules.js";
import { readProjectFile, scanProject, type ScanOptions } from "./scanner.js";
import type {
  AuditFinding,
  AuditReport,
  AuditScores,
  FindingSeverity,
} from "./types.js";

const EXTENSION_LANGUAGE: Record<string, string> = {
  ".c": "C",
  ".cc": "C++",
  ".cpp": "C++",
  ".cs": "C#",
  ".go": "Go",
  ".java": "Java",
  ".js": "JavaScript",
  ".jsx": "JavaScript",
  ".kt": "Kotlin",
  ".kts": "Kotlin",
  ".php": "PHP",
  ".py": "Python",
  ".rb": "Ruby",
  ".rs": "Rust",
  ".swift": "Swift",
  ".ts": "TypeScript",
  ".tsx": "TypeScript",
  ".vue": "Vue",
  ".svelte": "Svelte",
};

const SEVERITY_ORDER: Record<FindingSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function findingId(finding: Omit<AuditFinding, "id">): string {
  const fingerprint = [finding.ruleId, finding.file, finding.line, finding.column].join("\0");
  return `LCL-${createHash("sha256").update(fingerprint).digest("hex").slice(0, 12)}`;
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function calculateScores(findings: AuditFinding[]): AuditScores {
  const penalty = {
    critical: 30,
    high: 16,
    medium: 8,
    low: 2,
  } satisfies Record<FindingSeverity, number>;

  function categoryScore(category: AuditFinding["category"]): number {
    const totalPenalty = findings
      .filter((finding) => finding.category === category)
      .reduce((sum, finding) => sum + penalty[finding.severity], 0);
    return clampScore(100 - totalPenalty);
  }

  const security = categoryScore("security");
  const privacy = categoryScore("privacy");
  const reliability = categoryScore("reliability");
  const maintainability = categoryScore("maintainability");
  const overall = clampScore(
    security * 0.4 + privacy * 0.2 + reliability * 0.25 + maintainability * 0.15,
  );

  return { security, privacy, reliability, maintainability, overall };
}

export async function runAudit(
  root = ".",
  options: ScanOptions = {},
): Promise<AuditReport> {
  const startedAt = performance.now();
  const scan = await scanProject(root, options);
  const findings: AuditFinding[] = [];
  const languages: Record<string, number> = {};
  let skippedFiles = scan.skippedFiles;

  for (const file of scan.files) {
    const language = EXTENSION_LANGUAGE[file.extension];
    if (language) {
      languages[language] = (languages[language] ?? 0) + 1;
    }

    const source = await readProjectFile(file);
    if (source === null) {
      skippedFiles += 1;
      continue;
    }
    findings.push(
      ...analyzeFile(file, source).map((finding) => ({
        ...finding,
        id: findingId(finding),
      })),
    );
  }

  findings.sort((left, right) => {
    const severityDelta =
      SEVERITY_ORDER[left.severity] - SEVERITY_ORDER[right.severity];
    if (severityDelta !== 0) {
      return severityDelta;
    }
    return (
      left.file.localeCompare(right.file) ||
      left.line - right.line ||
      left.ruleId.localeCompare(right.ruleId)
    );
  });

  const summary: Record<FindingSeverity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
  for (const finding of findings) {
    summary[finding.severity] += 1;
  }

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    root: path.resolve(scan.root),
    durationMs: Math.round(performance.now() - startedAt),
    scannedFiles: scan.files.length,
    skippedFiles,
    truncated: scan.truncated,
    languages,
    findings,
    summary,
    scores: calculateScores(findings),
  };
}
