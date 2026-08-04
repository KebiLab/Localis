export interface AuditFinding {
  id: string;
  ruleId: string;
  title: string;
  description: string;
  remediation: string;
  severity: "critical" | "high" | "medium" | "low";
  category: "security" | "privacy" | "reliability" | "maintainability";
  file: string;
  line: number;
  column: number;
}

export interface AuditReport {
  root: string;
  durationMs: number;
  scannedFiles: number;
  findings: AuditFinding[];
  scores: Record<"overall" | "security" | "privacy" | "reliability" | "maintainability", number>;
  summary: Record<"critical" | "high" | "medium" | "low", number>;
}

export interface PrivacyReport {
  preview: {
    root: string;
    files: Array<{ path: string; outputBytes: number; redactions: number; truncated: boolean }>;
    outputBytes: number;
    payloadSha256: string;
    redactions: Record<"SECRET" | "TOKEN" | "PII", number>;
    truncated: boolean;
  };
}

export interface ShipReport {
  ready: boolean;
  root: string;
  blockers: string[];
  audit: AuditReport;
  verification: {
    results: Array<{
      id: string;
      label: string;
      status: "passed" | "failed";
      durationMs: number;
      exitCode: number;
    }>;
  };
}

export type WorkspaceReport = AuditReport | PrivacyReport | ShipReport;
export type Operation = "audit" | "privacy" | "ship";
