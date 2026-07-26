import { promises as fs } from "node:fs";
import path from "node:path";

import type { ProjectFile, ProjectScan } from "./types.js";

const ALWAYS_IGNORED = new Set([
  ".git",
  ".hg",
  ".svn",
  ".next",
  ".nuxt",
  ".turbo",
  ".cache",
  ".localis",
  "node_modules",
  "coverage",
  "dist",
  "build",
  "out",
  "target",
  "vendor",
  "__pycache__",
  ".venv",
  "venv",
]);

const TEXT_EXTENSIONS = new Set([
  ".c",
  ".cc",
  ".cpp",
  ".cs",
  ".css",
  ".env",
  ".go",
  ".graphql",
  ".h",
  ".hpp",
  ".html",
  ".ini",
  ".java",
  ".js",
  ".json",
  ".jsx",
  ".kt",
  ".kts",
  ".md",
  ".mjs",
  ".php",
  ".properties",
  ".py",
  ".rb",
  ".rs",
  ".sh",
  ".sql",
  ".svelte",
  ".swift",
  ".toml",
  ".ts",
  ".tsx",
  ".vue",
  ".xml",
  ".yaml",
  ".yml",
]);

const TEXT_FILENAMES = new Set([
  "dockerfile",
  "gemfile",
  "makefile",
  "procfile",
]);

export interface ScanOptions {
  maxDepth?: number;
  maxFiles?: number;
  maxFileBytes?: number;
}

function globToRegExp(pattern: string): RegExp {
  const prefix = pattern.includes("/") ? "" : "(?:.*/)?";
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replaceAll("**", "\u0000")
    .replaceAll("*", "[^/]*")
    .replaceAll("\u0000", ".*");
  return new RegExp(`^${prefix}(?:${escaped})(?:/.*)?$`);
}

async function loadRootIgnorePatterns(root: string): Promise<RegExp[]> {
  try {
    const source = await fs.readFile(path.join(root, ".gitignore"), "utf8");
    return source
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && !line.startsWith("!"))
      .map((line) => line.replace(/^\/+|\/+$/g, ""))
      .filter(Boolean)
      .map(globToRegExp);
  } catch {
    return [];
  }
}

function isTextCandidate(name: string, extension: string): boolean {
  return TEXT_EXTENSIONS.has(extension) || TEXT_FILENAMES.has(name.toLowerCase());
}

export async function scanProject(
  root: string,
  options: ScanOptions = {},
): Promise<ProjectScan> {
  const maxDepth = options.maxDepth ?? 16;
  const maxFiles = options.maxFiles ?? 8_000;
  const maxFileBytes = options.maxFileBytes ?? 768 * 1024;
  const absoluteRoot = path.resolve(root);
  const rootStat = await fs.stat(absoluteRoot);
  const ignoredPatterns = await loadRootIgnorePatterns(absoluteRoot);

  if (!rootStat.isDirectory()) {
    throw new Error(`Not a directory: ${root}`);
  }

  const files: ProjectFile[] = [];
  let skippedFiles = 0;
  let truncated = false;

  function isIgnored(absolutePath: string): boolean {
    const relativePath = path
      .relative(absoluteRoot, absolutePath)
      .replaceAll("\\", "/");
    return ignoredPatterns.some((pattern) => pattern.test(relativePath));
  }

  async function walk(directory: string, depth: number): Promise<void> {
    if (depth > maxDepth || truncated) {
      truncated = true;
      return;
    }

    let entries;
    try {
      entries = await fs.readdir(directory, { withFileTypes: true });
    } catch {
      return;
    }

    entries.sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      if (files.length >= maxFiles) {
        truncated = true;
        return;
      }

      const absolutePath = path.join(directory, entry.name);

      if (isIgnored(absolutePath)) {
        continue;
      }

      if (entry.isSymbolicLink()) {
        skippedFiles += 1;
        continue;
      }

      if (entry.isDirectory()) {
        if (ALWAYS_IGNORED.has(entry.name)) {
          continue;
        }
        await walk(absolutePath, depth + 1);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const extension = path.extname(entry.name).toLowerCase();
      if (!isTextCandidate(entry.name, extension)) {
        skippedFiles += 1;
        continue;
      }

      try {
        const stat = await fs.stat(absolutePath);
        if (stat.size > maxFileBytes) {
          skippedFiles += 1;
          continue;
        }

        files.push({
          absolutePath,
          relativePath: path.relative(absoluteRoot, absolutePath).replaceAll("\\", "/"),
          extension,
          size: stat.size,
        });
      } catch {
        skippedFiles += 1;
      }
    }
  }

  await walk(absoluteRoot, 0);

  return {
    root: absoluteRoot,
    files,
    skippedFiles,
    truncated,
  };
}

export async function readProjectFile(file: ProjectFile): Promise<string | null> {
  try {
    const buffer = await fs.readFile(file.absolutePath);
    if (buffer.subarray(0, 1_024).includes(0)) {
      return null;
    }
    return buffer.toString("utf8");
  } catch {
    return null;
  }
}
