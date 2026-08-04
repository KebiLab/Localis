export type FindingSeverity = "critical" | "high" | "medium" | "low";

export type FindingCategory =
  | "security"
  | "privacy"
  | "reliability"
  | "maintainability";

export interface ProjectFile {
  absolutePath: string;
  relativePath: string;
  extension: string;
  size: number;
}

export interface ProjectScan {
  root: string;
  files: ProjectFile[];
  skippedFiles: number;
  truncated: boolean;
}

export interface AuditFinding {
  ruleId: string;
  title: string;
  description: string;
  remediation: string;
  severity: FindingSeverity;
  category: FindingCategory;
  file: string;
  line: number;
  column: number;
  evidence: string;
}

export interface AuditScores {
  security: number;
  privacy: number;
  reliability: number;
  maintainability: number;
  overall: number;
}

export interface AuditReport {
  schemaVersion: 1;
  generatedAt: string;
  root: string;
  durationMs: number;
  scannedFiles: number;
  skippedFiles: number;
  truncated: boolean;
  languages: Record<string, number>;
  findings: AuditFinding[];
  summary: Record<FindingSeverity, number>;
  scores: AuditScores;
}

export interface DoctorCheck {
  id: "node" | "git" | "ollama" | "lmstudio";
  label: string;
  status: "ready" | "optional" | "error";
  detail: string;
}

export interface DoctorReport {
  ready: boolean;
  checks: DoctorCheck[];
}
