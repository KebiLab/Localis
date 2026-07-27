interface RedactionRule {
  kind: "SECRET" | "TOKEN" | "PII";
  pattern: RegExp;
  valueGroup?: number;
}

const REDACTION_RULES: RedactionRule[] = [
  {
    kind: "SECRET",
    pattern:
      /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/g,
  },
  {
    kind: "TOKEN",
    pattern: /\b(?:gh[pousr]_[A-Za-z0-9]{16,}|github_pat_[A-Za-z0-9_]{20,})\b/g,
  },
  {
    kind: "TOKEN",
    pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,
  },
  {
    kind: "TOKEN",
    pattern: /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\b/g,
  },
  {
    kind: "SECRET",
    pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g,
  },
  {
    kind: "SECRET",
    pattern: /\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{20,}\b/g,
  },
  {
    kind: "SECRET",
    pattern: /\bAIza[0-9A-Za-z_-]{35}\b/g,
  },
  {
    kind: "SECRET",
    pattern:
      /((?:postgres|postgresql|mysql|mongodb(?:\+srv)?|redis|amqp):\/\/[^\s:@/]+:)([^\s@/]+)(@)/gi,
    valueGroup: 2,
  },
  {
    kind: "PII",
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  },
  {
    kind: "SECRET",
    pattern:
      /((?:api[_-]?key|client[_-]?secret|auth[_-]?token|password)\s*[:=]\s*["'`])([^"'`\s]{8,})(["'`])/gi,
    valueGroup: 2,
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
      const sensitiveValue = rule.valueGroup
        ? String(args[rule.valueGroup] ?? "")
        : fullMatch;

      if (/^<?LOCALIS_(?:SECRET|TOKEN|PII)_\d+>?/.test(sensitiveValue)) {
        return fullMatch;
      }

      let placeholder = seen.get(sensitiveValue);
      if (!placeholder) {
        counters[rule.kind] += 1;
        placeholder = `<LOCALIS_${rule.kind}_${counters[rule.kind]}>`;
        seen.set(sensitiveValue, placeholder);
        replacements.set(placeholder, sensitiveValue);
        findings.push({ kind: rule.kind, placeholder });
      }

      if (rule.valueGroup) {
        const valueOffset = fullMatch.indexOf(sensitiveValue);
        if (valueOffset === -1) return fullMatch;
        return `${fullMatch.slice(0, valueOffset)}${placeholder}${fullMatch.slice(
          valueOffset + sensitiveValue.length,
        )}`;
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
