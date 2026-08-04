const VALUE_OPTIONS = new Set([
  "--endpoint",
  "--check",
  "--file",
  "--max-files",
  "--model",
  "--out",
  "--provider",
]);

export interface ParsedArguments {
  positional: string[];
  flags: Set<string>;
  values: Map<string, string[]>;
}

export function parseArguments(args: string[]): ParsedArguments {
  const positional: string[] = [];
  const flags = new Set<string>();
  const values = new Map<string, string[]>();

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index] ?? "";

    if (!argument.startsWith("-")) {
      positional.push(argument);
      continue;
    }

    const equalsIndex = argument.indexOf("=");
    const name = equalsIndex === -1 ? argument : argument.slice(0, equalsIndex);
    const inlineValue = equalsIndex === -1 ? undefined : argument.slice(equalsIndex + 1);

    if (VALUE_OPTIONS.has(name)) {
      const value = inlineValue ?? args[index + 1];
      if (!value || (inlineValue === undefined && value.startsWith("-"))) {
        throw new Error(`Option ${name} requires a value.`);
      }
      const existing = values.get(name) ?? [];
      existing.push(value);
      values.set(name, existing);
      if (inlineValue === undefined) {
        index += 1;
      }
      continue;
    }

    flags.add(name);
  }

  return { positional, flags, values };
}

export function optionValue(
  parsed: ParsedArguments,
  name: string,
): string | undefined {
  return parsed.values.get(name)?.at(-1);
}

export function optionValues(parsed: ParsedArguments, name: string): string[] {
  return parsed.values.get(name) ?? [];
}
