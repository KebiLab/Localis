export interface UnifiedDiffResult {
  text: string;
  truncated: boolean;
}

function lines(value: string): string[] {
  if (value === "") return [];
  return value.replaceAll("\r\n", "\n").split("\n");
}

export function unifiedDiff(
  before: string,
  after: string,
  filename: string,
  maxOutputLines = 800,
): UnifiedDiffResult {
  if (before === after) {
    return { text: "", truncated: false };
  }

  const oldLines = lines(before);
  const newLines = lines(after);
  let prefix = 0;
  while (
    prefix < oldLines.length &&
    prefix < newLines.length &&
    oldLines[prefix] === newLines[prefix]
  ) {
    prefix += 1;
  }

  let suffix = 0;
  while (
    suffix < oldLines.length - prefix &&
    suffix < newLines.length - prefix &&
    oldLines[oldLines.length - 1 - suffix] ===
      newLines[newLines.length - 1 - suffix]
  ) {
    suffix += 1;
  }

  const context = 3;
  const oldStartIndex = Math.max(0, prefix - context);
  const newStartIndex = Math.max(0, prefix - context);
  const oldEndIndex = Math.min(oldLines.length, oldLines.length - suffix + context);
  const newEndIndex = Math.min(newLines.length, newLines.length - suffix + context);
  const oldCount = oldEndIndex - oldStartIndex;
  const newCount = newEndIndex - newStartIndex;
  const output = [
    `--- a/${filename}`,
    `+++ b/${filename}`,
    `@@ -${oldStartIndex + 1},${oldCount} +${newStartIndex + 1},${newCount} @@`,
  ];

  for (let index = oldStartIndex; index < prefix; index += 1) {
    output.push(` ${oldLines[index] ?? ""}`);
  }
  for (let index = prefix; index < oldLines.length - suffix; index += 1) {
    output.push(`-${oldLines[index] ?? ""}`);
  }
  for (let index = prefix; index < newLines.length - suffix; index += 1) {
    output.push(`+${newLines[index] ?? ""}`);
  }
  const suffixStart = Math.max(prefix, oldLines.length - suffix);
  for (let index = suffixStart; index < oldEndIndex; index += 1) {
    output.push(` ${oldLines[index] ?? ""}`);
  }

  if (output.length <= maxOutputLines) {
    return { text: output.join("\n"), truncated: false };
  }

  return {
    text: [
      ...output.slice(0, maxOutputLines),
      `... diff truncated after ${maxOutputLines} lines ...`,
    ].join("\n"),
    truncated: true,
  };
}
