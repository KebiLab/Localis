import { createHash } from "node:crypto";
import path from "node:path";

import { redactSensitiveText } from "./privacy.js";
import { readProjectFile, scanProject } from "./scanner.js";

export interface ContextFilePreview {
  path: string;
  inputBytes: number;
  outputBytes: number;
  redactions: number;
  truncated: boolean;
}

export interface ContextRedactionSummary {
  SECRET: number;
  TOKEN: number;
  PII: number;
}

export interface ContextPreview {
  schemaVersion: 1;
  root: string;
  files: ContextFilePreview[];
  inputBytes: number;
  outputBytes: number;
  redactions: ContextRedactionSummary;
  payloadSha256: string;
  truncated: boolean;
}

export interface PreparedContext {
  preview: ContextPreview;
  payload: string;
}

export interface PrepareContextOptions {
  root?: string;
  include?: string[];
  maxFiles?: number;
  maxFileBytes?: number;
  maxTotalBytes?: number;
}

const DEFAULT_MAX_FILES = 24;
const DEFAULT_MAX_FILE_BYTES = 96 * 1024;
const DEFAULT_MAX_TOTAL_BYTES = 384 * 1024;

function isInsideRoot(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function matchesInclude(
  root: string,
  absolutePath: string,
  include: string[],
): boolean {
  if (include.length === 0) {
    return true;
  }

  return include.some((entry) => {
    const resolved = path.resolve(root, entry);
    if (!isInsideRoot(root, resolved)) {
      throw new Error(`Context path leaves the project root: ${entry}`);
    }
    return absolutePath === resolved || isInsideRoot(resolved, absolutePath);
  });
}

function priority(relativePath: string): number {
  const name = path.basename(relativePath).toLowerCase();
  if (name === "readme.md") return 0;
  if (/^(package\.json|pyproject\.toml|cargo\.toml|go\.mod)$/.test(name)) return 1;
  if (/^(src|app|lib)\//.test(relativePath)) return 2;
  if (/\.(test|spec)\.[jt]sx?$/.test(relativePath)) return 5;
  return 3;
}

export async function prepareProjectContext(
  options: PrepareContextOptions = {},
): Promise<PreparedContext> {
  const root = path.resolve(options.root ?? ".");
  const include = options.include ?? [];
  const maxFiles = options.maxFiles ?? DEFAULT_MAX_FILES;
  const maxFileBytes = options.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES;
  const maxTotalBytes = options.maxTotalBytes ?? DEFAULT_MAX_TOTAL_BYTES;

  for (const entry of include) {
    const resolved = path.resolve(root, entry);
    if (!isInsideRoot(root, resolved)) {
      throw new Error(`Context path leaves the project root: ${entry}`);
    }
  }

  const scan = await scanProject(root, {
    maxFiles: Math.max(maxFiles * 20, 1_000),
    maxFileBytes,
  });
  const candidates = scan.files
    .filter((file) => matchesInclude(root, file.absolutePath, include))
    .sort(
      (left, right) =>
        priority(left.relativePath) - priority(right.relativePath) ||
        left.relativePath.localeCompare(right.relativePath),
    );

  if (include.length > 0 && candidates.length === 0) {
    throw new Error("None of the requested context paths contain readable text files.");
  }

  const files: ContextFilePreview[] = [];
  const payloadParts: string[] = [];
  const redactions: ContextRedactionSummary = { SECRET: 0, TOKEN: 0, PII: 0 };
  let inputBytes = 0;
  let outputBytes = 0;
  let truncated = scan.truncated || candidates.length > maxFiles;

  for (const file of candidates) {
    if (files.length >= maxFiles || inputBytes >= maxTotalBytes) {
      truncated = true;
      break;
    }

    const source = await readProjectFile(file);
    if (source === null) {
      continue;
    }

    const availableBytes = Math.max(0, maxTotalBytes - inputBytes);
    const sourceBuffer = Buffer.from(source, "utf8");
    const fileWasTruncated = sourceBuffer.length > availableBytes;
    const selectedBuffer = fileWasTruncated
      ? sourceBuffer.subarray(0, availableBytes)
      : sourceBuffer;
    const selectedSource = selectedBuffer.toString("utf8");
    const result = redactSensitiveText(selectedSource);
    const safeBytes = Buffer.byteLength(result.text, "utf8");

    for (const finding of result.findings) {
      redactions[finding.kind] += 1;
    }

    files.push({
      path: file.relativePath,
      inputBytes: selectedBuffer.length,
      outputBytes: safeBytes,
      redactions: result.findings.length,
      truncated: fileWasTruncated,
    });
    payloadParts.push(
      `<localis-file path=${JSON.stringify(file.relativePath)}>\n${result.text}\n</localis-file>`,
    );
    inputBytes += selectedBuffer.length;
    outputBytes += safeBytes;

    if (fileWasTruncated) {
      truncated = true;
    }
  }

  const payload = payloadParts.join("\n\n");
  const payloadSha256 = createHash("sha256").update(payload).digest("hex");

  return {
    payload,
    preview: {
      schemaVersion: 1,
      root,
      files,
      inputBytes,
      outputBytes,
      redactions,
      payloadSha256,
      truncated,
    },
  };
}
