interface RedactionRule {
  kind: "SECRET" | "TOKEN" | "PII";
  pattern: RegExp;
}

const REDACTION_RULES: RedactionRule[] = [
  {
    kind: "TOKEN",
    pattern: /\b(?:gh[pousr]_[A-Za-z0-9]{16,}|github_pat_[A-Za-z0-9_]{20,})\b/g,
  },
  {
    kind: "SECRET",
    pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g,
  },
  {
    kind: "SECRET",
    pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/g,
  },
  {
    kind: "PII",
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  },
  {
    kind: "SECRET",
    pattern:
      /((?:api[_-]?key|client[_-]?secret|auth[_-]?token|password)\s*[:=]\s*["'`])([^"'`\s]{8,})(["'`])/gi,
  },
];

export interface RedactionFinding {
  kind: RedactionRule["kind"];
  placeholder: string;
}

export interface RedactionResult {
  text: string;
  findings: RedactionFinding[];
  replacements: ReadonlyMap<string, string>;
}

export function redactSensitiveText(input: string): RedactionResult {
  let text = input;
  const findings: RedactionFinding[] = [];
  const replacements = new Map<string, string>();
  const seen = new Map<string, string>();
  const counters: Record<RedactionRule["kind"], number> = {
    SECRET: 0,
    TOKEN: 0,
    PII: 0,
  };

  for (const rule of REDACTION_RULES) {
    const pattern = new RegExp(rule.pattern.source, rule.pattern.flags);
    text = text.replace(pattern, (...args: unknown[]) => {
      const fullMatch = String(args[0]);
      const isAssignment = args.length > 4 && typeof args[2] === "string";
      const sensitiveValue = isAssignment ? String(args[2]) : fullMatch;

      let placeholder = seen.get(sensitiveValue);
      if (!placeholder) {
        counters[rule.kind] += 1;
        placeholder = `<LOCALIS_${rule.kind}_${counters[rule.kind]}>`;
        seen.set(sensitiveValue, placeholder);
        replacements.set(placeholder, sensitiveValue);
        findings.push({ kind: rule.kind, placeholder });
      }

      if (isAssignment) {
        return `${String(args[1])}${placeholder}${String(args[3])}`;
      }
      return placeholder;
    });
  }

  return { text, findings, replacements };
}

export function restoreRedactedText(
  input: string,
  replacements: ReadonlyMap<string, string>,
): string {
  let output = input;
  for (const [placeholder, original] of replacements) {
    output = output.replaceAll(placeholder, original);
  }
  return output;
}
