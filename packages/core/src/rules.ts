import type {
  AuditFinding,
  FindingCategory,
  FindingSeverity,
  ProjectFile,
} from "./types.js";

interface Rule {
  id: string;
  title: string;
  description: string;
  remediation: string;
  severity: FindingSeverity;
  category: FindingCategory;
  pattern: RegExp;
  evidenceGroup?: number;
}

const RULES: Rule[] = [
  {
    id: "secret.generic-assignment",
    title: "Potential hardcoded secret",
    description: "A credential-like value appears to be assigned directly in source code.",
    remediation: "Move the value to a secret manager or environment variable and rotate it if it was real.",
    severity: "critical",
    category: "security",
    pattern:
      /\b(?:api[_-]?key|client[_-]?secret|auth[_-]?token|access[_-]?token|password|passwd)\b\s*[:=]\s*["'`]([^"'`\s]{8,})["'`]/gi,
    evidenceGroup: 1,
  },
  {
    id: "secret.github-token",
    title: "GitHub token in source",
    description: "The file contains a value shaped like a GitHub access token.",
    remediation: "Revoke the token, remove it from history, and load its replacement from a secret store.",
    severity: "critical",
    category: "security",
    pattern: /\b(?:gh[pousr]_[A-Za-z0-9]{16,}|github_pat_[A-Za-z0-9_]{20,})\b/g,
  },
  {
    id: "secret.aws-access-key",
    title: "AWS access key in source",
    description: "The file contains a value shaped like an AWS access key identifier.",
    remediation: "Disable the key, inspect its usage, and replace it with a short-lived workload identity.",
    severity: "critical",
    category: "security",
    pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g,
  },
  {
    id: "secret.private-key",
    title: "Private key material in source",
    description: "A PEM private-key header was found in a scanned file.",
    remediation: "Remove and rotate the key, then store the replacement outside the repository.",
    severity: "critical",
    category: "security",
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g,
  },
  {
    id: "security.dynamic-eval",
    title: "Dynamic code execution",
    description: "Dynamic evaluation can turn untrusted input into executable code.",
    remediation: "Replace eval-style execution with an explicit parser or allowlisted operation.",
    severity: "high",
    category: "security",
    pattern: /\b(?:eval|Function)\s*\(/g,
  },
  {
    id: "security.shell-interpolation",
    title: "Interpolated shell command",
    description: "A shell execution call appears to include a template literal.",
    remediation: "Use an argument-array API such as execFile or spawn with shell disabled.",
    severity: "high",
    category: "security",
    pattern: /\b(?:exec|execSync)\s*\(\s*`[^`]*\$\{/g,
  },
  {
    id: "privacy.personal-email",
    title: "Personal data in project context",
    description: "An email address could leave the local boundary if this file is sent to a cloud model.",
    remediation: "Review and redact personal data before enabling a cloud provider.",
    severity: "low",
    category: "privacy",
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  },
  {
    id: "reliability.empty-catch",
    title: "Empty catch block",
    description: "An empty catch block can hide failures and leave the application in an unknown state.",
    remediation: "Handle the expected error explicitly or record enough context to diagnose it.",
    severity: "medium",
    category: "reliability",
    pattern: /\bcatch\s*(?:\([^)]*\))?\s*\{\s*\}/g,
  },
  {
    id: "maintainability.todo-fixme",
    title: "Unresolved implementation note",
    description: "A TODO or FIXME marks unfinished behavior in source code.",
    remediation: "Resolve it or link it to a tracked issue with enough context.",
    severity: "low",
    category: "maintainability",
    pattern: /(?:\/\/|#|<!--)\s*(?:TODO|FIXME)\b\s*:?\s*[^\r\n]*/g,
  },
];

function lineAndColumn(source: string, offset: number): { line: number; column: number } {
  const before = source.slice(0, offset);
  const lines = before.split(/\r?\n/);
  return {
    line: lines.length,
    column: (lines.at(-1)?.length ?? 0) + 1,
  };
}

function safeEvidence(value: string, rule: Rule): string {
  if (rule.category === "security" && rule.id.startsWith("secret.")) {
    return `[redacted ${Math.max(value.length, 1)} characters]`;
  }
  return value.trim().slice(0, 160);
}

export function analyzeFile(file: ProjectFile, source: string): Array<Omit<AuditFinding, "id">> {
  const findings: Array<Omit<AuditFinding, "id">> = [];
  const sourceLines = source.split(/\r?\n/);

  for (const rule of RULES) {
    const pattern = new RegExp(rule.pattern.source, rule.pattern.flags);
    for (const match of source.matchAll(pattern)) {
      const offset = match.index ?? 0;
      const location = lineAndColumn(source, offset);
      const evidence = match[rule.evidenceGroup ?? 0] ?? match[0];
      if (
        rule.id === "privacy.personal-email" &&
        /^\d+x\d+@\d+x\.[a-z0-9]+$/i.test(evidence)
      ) {
        continue;
      }
      const currentLine = sourceLines[location.line - 1] ?? "";
      const previousLine = sourceLines[location.line - 2] ?? "";
      const ignoredOnLine = currentLine.includes(`localis-ignore ${rule.id}`);
      const ignoredByPreviousLine = previousLine.includes(
        `localis-ignore-next-line ${rule.id}`,
      );

      if (ignoredOnLine || ignoredByPreviousLine) {
        continue;
      }

      findings.push({
        ruleId: rule.id,
        title: rule.title,
        description: rule.description,
        remediation: rule.remediation,
        severity: rule.severity,
        category: rule.category,
        file: file.relativePath,
        line: location.line,
        column: location.column,
        evidence: safeEvidence(evidence, rule),
      });
    }
  }

  return findings;
}

export { RULES };
