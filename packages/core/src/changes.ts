import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";

import { unifiedDiff } from "./diff.js";

const MAX_CHANGE_FILES = 100;
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_PLAN_BYTES = 10 * 1024 * 1024;
const SESSION_ID_PATTERN = /^\d{8}-\d{6}-\d{3}-[a-f0-9]{8}$/;

export interface ChangePlanFile {
  path: string;
  beforeSha256: string | null;
  after: string;
  summary?: string;
}

export interface ChangePlan {
  schemaVersion: 1;
  id: string;
  createdAt: string;
  files: ChangePlanFile[];
}

export interface ChangeFilePreview {
  path: string;
  status: "created" | "modified" | "unchanged";
  beforeSha256: string | null;
  afterSha256: string;
  diff: string;
  diffTruncated: boolean;
}

export interface ChangePreview {
  schemaVersion: 1;
  planId: string;
  root: string;
  files: ChangeFilePreview[];
  changedFiles: number;
}

export interface ChangeSessionEntry {
  path: string;
  existed: boolean;
  beforeSha256: string | null;
  afterSha256: string;
  backupPath: string | null;
}

export interface ChangeSessionManifest {
  schemaVersion: 1;
  id: string;
  planId: string;
  root: string;
  createdAt: string;
  state: "prepared" | "applied" | "rolled-back" | "undone";
  undoneAt?: string;
  entries: ChangeSessionEntry[];
}

export interface ApplyChangeResult {
  sessionId: string | null;
  appliedFiles: string[];
  preview: ChangePreview;
}

export interface UndoChangeResult {
  sessionId: string;
  restoredFiles: string[];
}

export class ChangePlanError extends Error {
  constructor(
    message: string,
    readonly code:
      | "INVALID_PLAN"
      | "UNSAFE_PATH"
      | "CONFLICT"
      | "CONFIRMATION_REQUIRED"
      | "SESSION_NOT_FOUND"
      | "SESSION_STATE",
  ) {
    super(message);
    this.name = "ChangePlanError";
  }
}

export function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function validateRelativePath(value: unknown): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 500) {
    throw new ChangePlanError("Every change requires a valid relative path.", "INVALID_PLAN");
  }
  const normalized = value.replaceAll("\\", "/");
  if (
    path.posix.isAbsolute(normalized) ||
    /^[A-Za-z]:/.test(normalized) ||
    normalized.split("/").some((part) => part === ".." || part === "") ||
    normalized === ".localis" ||
    normalized.startsWith(".localis/")
  ) {
    throw new ChangePlanError(`Unsafe change path: ${value}`, "UNSAFE_PATH");
  }
  return normalized;
}

function validateHash(value: unknown, filePath: string): string | null {
  if (value === null) return null;
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/i.test(value)) {
    throw new ChangePlanError(
      `Invalid beforeSha256 for ${filePath}.`,
      "INVALID_PLAN",
    );
  }
  return value.toLowerCase();
}

export function parseChangePlan(input: unknown): ChangePlan {
  if (!input || typeof input !== "object") {
    throw new ChangePlanError("Change plan must be an object.", "INVALID_PLAN");
  }
  const candidate = input as Record<string, unknown>;
  if (candidate.schemaVersion !== 1) {
    throw new ChangePlanError("Unsupported change plan schemaVersion.", "INVALID_PLAN");
  }
  if (
    typeof candidate.id !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(candidate.id)
  ) {
    throw new ChangePlanError("Change plan id is invalid.", "INVALID_PLAN");
  }
  if (
    typeof candidate.createdAt !== "string" ||
    Number.isNaN(Date.parse(candidate.createdAt))
  ) {
    throw new ChangePlanError("Change plan createdAt is invalid.", "INVALID_PLAN");
  }
  if (
    !Array.isArray(candidate.files) ||
    candidate.files.length === 0 ||
    candidate.files.length > MAX_CHANGE_FILES
  ) {
    throw new ChangePlanError(
      `Change plan files must contain between 1 and ${MAX_CHANGE_FILES} entries.`,
      "INVALID_PLAN",
    );
  }

  let totalBytes = 0;
  const seen = new Set<string>();
  const files = candidate.files.map((rawFile) => {
    if (!rawFile || typeof rawFile !== "object") {
      throw new ChangePlanError("Change plan file is invalid.", "INVALID_PLAN");
    }
    const file = rawFile as Record<string, unknown>;
    const filePath = validateRelativePath(file.path);
    const identity = process.platform === "win32" ? filePath.toLowerCase() : filePath;
    if (seen.has(identity)) {
      throw new ChangePlanError(`Duplicate change path: ${filePath}`, "INVALID_PLAN");
    }
    seen.add(identity);
    if (typeof file.after !== "string" || file.after.includes("\0")) {
      throw new ChangePlanError(`Invalid text content for ${filePath}.`, "INVALID_PLAN");
    }
    const bytes = Buffer.byteLength(file.after, "utf8");
    if (bytes > MAX_FILE_BYTES) {
      throw new ChangePlanError(`Change content is too large: ${filePath}`, "INVALID_PLAN");
    }
    totalBytes += bytes;
    if (totalBytes > MAX_PLAN_BYTES) {
      throw new ChangePlanError("Change plan content exceeds 10 MiB.", "INVALID_PLAN");
    }
    if (file.summary !== undefined && typeof file.summary !== "string") {
      throw new ChangePlanError(`Invalid summary for ${filePath}.`, "INVALID_PLAN");
    }
    return {
      path: filePath,
      beforeSha256: validateHash(file.beforeSha256, filePath),
      after: file.after,
      ...(typeof file.summary === "string" ? { summary: file.summary.slice(0, 500) } : {}),
    };
  });

  return {
    schemaVersion: 1,
    id: candidate.id,
    createdAt: candidate.createdAt,
    files,
  };
}

async function canonicalRoot(root: string): Promise<string> {
  const resolved = path.resolve(root);
  const stat = await fs.stat(resolved);
  if (!stat.isDirectory()) {
    throw new ChangePlanError(`Project root is not a directory: ${root}`, "UNSAFE_PATH");
  }
  return fs.realpath(resolved);
}

async function safeTarget(root: string, relativePath: string): Promise<string> {
  const validated = validateRelativePath(relativePath);
  const parts = validated.split("/");
  let current = root;
  for (const part of parts) {
    current = path.join(current, part);
    try {
      const stat = await fs.lstat(current);
      if (stat.isSymbolicLink()) {
        throw new ChangePlanError(
          `Symbolic links are not allowed in change paths: ${relativePath}`,
          "UNSAFE_PATH",
        );
      }
    } catch (error) {
      if (error instanceof ChangePlanError) throw error;
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") throw error;
    }
  }
  return current;
}

async function readExistingFile(
  root: string,
  relativePath: string,
): Promise<{ absolutePath: string; existed: boolean; content: string }> {
  const absolutePath = await safeTarget(root, relativePath);
  try {
    const stat = await fs.lstat(absolutePath);
    if (!stat.isFile()) {
      throw new ChangePlanError(`Change target is not a file: ${relativePath}`, "UNSAFE_PATH");
    }
    return { absolutePath, existed: true, content: await fs.readFile(absolutePath, "utf8") };
  } catch (error) {
    if (error instanceof ChangePlanError) throw error;
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { absolutePath, existed: false, content: "" };
    }
    throw error;
  }
}

export async function createChangePlan(
  root: string,
  input: Array<{ path: string; after: string; summary?: string }>,
  id = `plan-${Date.now()}`,
): Promise<ChangePlan> {
  const canonical = await canonicalRoot(root);
  const files: ChangePlanFile[] = [];
  for (const proposal of input) {
    const relativePath = validateRelativePath(proposal.path);
    const current = await readExistingFile(canonical, relativePath);
    files.push({
      path: relativePath,
      beforeSha256: current.existed ? sha256(current.content) : null,
      after: proposal.after,
      ...(proposal.summary ? { summary: proposal.summary } : {}),
    });
  }
  return parseChangePlan({
    schemaVersion: 1,
    id,
    createdAt: new Date().toISOString(),
    files,
  });
}

export async function previewChangePlan(
  root: string,
  rawPlan: unknown,
): Promise<ChangePreview> {
  const plan = parseChangePlan(rawPlan);
  const canonical = await canonicalRoot(root);
  const files: ChangeFilePreview[] = [];

  for (const change of plan.files) {
    const current = await readExistingFile(canonical, change.path);
    const currentHash = current.existed ? sha256(current.content) : null;
    if (currentHash !== change.beforeSha256) {
      throw new ChangePlanError(
        `Change conflict for ${change.path}: expected ${change.beforeSha256 ?? "missing"}, found ${currentHash ?? "missing"}.`,
        "CONFLICT",
      );
    }
    const afterSha256 = sha256(change.after);
    const diff = unifiedDiff(current.content, change.after, change.path);
    files.push({
      path: change.path,
      status:
        current.content === change.after
          ? "unchanged"
          : current.existed
            ? "modified"
            : "created",
      beforeSha256: currentHash,
      afterSha256,
      diff: diff.text,
      diffTruncated: diff.truncated,
    });
  }

  return {
    schemaVersion: 1,
    planId: plan.id,
    root: canonical,
    files,
    changedFiles: files.filter((file) => file.status !== "unchanged").length,
  };
}

function sessionId(): string {
  const now = new Date();
  const date = now.toISOString().replace(/[-:TZ]/g, "");
  return `${date.slice(0, 8)}-${date.slice(8, 14)}-${String(now.getMilliseconds()).padStart(3, "0")}-${randomUUID().slice(0, 8)}`;
}

function sessionBase(root: string): string {
  return path.join(root, ".localis", "backups");
}

async function safeSessionBase(root: string, create: boolean): Promise<string | null> {
  let current = root;
  for (const segment of [".localis", "backups"]) {
    current = path.join(current, segment);
    try {
      const stat = await fs.lstat(current);
      if (stat.isSymbolicLink() || !stat.isDirectory()) {
        throw new ChangePlanError(
          `Localis state path is not a safe directory: ${current}`,
          "UNSAFE_PATH",
        );
      }
    } catch (error) {
      if (error instanceof ChangePlanError) throw error;
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      if (!create) return null;
      await fs.mkdir(current, { mode: 0o700 });
    }
  }
  const canonical = await fs.realpath(current);
  const relative = path.relative(root, canonical);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new ChangePlanError(
      "Localis state directory resolves outside the project root.",
      "UNSAFE_PATH",
    );
  }
  return canonical;
}

async function writePrivateFile(filePath: string, value: string | Uint8Array): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true, mode: 0o700 });
  await fs.writeFile(filePath, value, { mode: 0o600 });
  await fs.chmod(filePath, 0o600).catch(() => undefined);
}

async function atomicReplace(
  target: string,
  content: string,
  options: { mode?: number } = {},
): Promise<void> {
  await fs.mkdir(path.dirname(target), { recursive: true });
  let mode = options.mode ?? 0o644;
  try {
    const stat = await fs.lstat(target);
    if (stat.isSymbolicLink() || !stat.isFile()) {
      throw new ChangePlanError(`Atomic target is not a regular file: ${target}`, "UNSAFE_PATH");
    }
    if (options.mode === undefined) mode = stat.mode;
  } catch (error) {
    if (error instanceof ChangePlanError) throw error;
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const temporary = path.join(
    path.dirname(target),
    `.localis-${randomUUID()}.tmp`,
  );
  const previous = path.join(
    path.dirname(target),
    `.localis-${randomUUID()}.previous`,
  );
  await writePrivateFile(temporary, content);
  await fs.chmod(temporary, mode).catch(() => undefined);
  let movedPrevious = false;
  try {
    try {
      await fs.access(target, constants.F_OK);
      await fs.rename(target, previous);
      movedPrevious = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    await fs.rename(temporary, target);
    if (movedPrevious) await fs.rm(previous, { force: true });
  } catch (error) {
    await fs.rm(temporary, { force: true }).catch(() => undefined);
    if (movedPrevious) {
      await fs.rename(previous, target).catch(() => undefined);
    }
    throw error;
  }
}

async function writeManifest(
  directory: string,
  manifest: ChangeSessionManifest,
): Promise<void> {
  await atomicReplace(
    path.join(directory, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    { mode: 0o600 },
  );
}

export async function applyChangePlan(
  root: string,
  rawPlan: unknown,
  options: { confirmed?: boolean } = {},
): Promise<ApplyChangeResult> {
  if (!options.confirmed) {
    throw new ChangePlanError(
      "Applying a change plan requires explicit confirmation.",
      "CONFIRMATION_REQUIRED",
    );
  }
  const plan = parseChangePlan(rawPlan);
  const preview = await previewChangePlan(root, plan);
  const changed = plan.files.filter(
    (_, index) => preview.files[index]?.status !== "unchanged",
  );
  if (changed.length === 0) {
    return { sessionId: null, appliedFiles: [], preview };
  }

  const canonical = await canonicalRoot(root);
  const id = sessionId();
  const base = await safeSessionBase(canonical, true);
  if (!base) {
    throw new ChangePlanError("Could not create Localis state directory.", "SESSION_STATE");
  }
  const directory = path.join(base, id);
  const entries: ChangeSessionEntry[] = [];
  const snapshots: Array<{
    path: string;
    absolutePath: string;
    existed: boolean;
    before: string;
    after: string;
  }> = [];

  await fs.mkdir(directory, { mode: 0o700 });
  try {
    for (const change of changed) {
      const current = await readExistingFile(canonical, change.path);
      const currentHash = current.existed ? sha256(current.content) : null;
      if (currentHash !== change.beforeSha256) {
        throw new ChangePlanError(
          `Change conflict for ${change.path}: the file changed after preview.`,
          "CONFLICT",
        );
      }
      const backupPath = current.existed ? path.posix.join("files", change.path) : null;
      if (backupPath) {
        await writePrivateFile(path.join(directory, backupPath), current.content);
      }
      entries.push({
        path: change.path,
        existed: current.existed,
        beforeSha256: currentHash,
        afterSha256: sha256(change.after),
        backupPath,
      });
      snapshots.push({
        path: change.path,
        absolutePath: current.absolutePath,
        existed: current.existed,
        before: current.content,
        after: change.after,
      });
    }
  } catch (error) {
    await fs.rm(directory, { recursive: true, force: true }).catch(() => undefined);
    throw error;
  }

  const manifest: ChangeSessionManifest = {
    schemaVersion: 1,
    id,
    planId: plan.id,
    root: canonical,
    createdAt: new Date().toISOString(),
    state: "prepared",
    entries,
  };
  await writeManifest(directory, manifest);

  const applied: typeof snapshots = [];
  try {
    for (const snapshot of snapshots) {
      const latest = await readExistingFile(canonical, snapshot.path);
      if (
        latest.existed !== snapshot.existed ||
        latest.content !== snapshot.before
      ) {
        throw new ChangePlanError(
          `Change conflict for ${snapshot.path}: the file changed before apply.`,
          "CONFLICT",
        );
      }
      await atomicReplace(snapshot.absolutePath, snapshot.after);
      applied.push(snapshot);
    }
    manifest.state = "applied";
    await writeManifest(directory, manifest);
  } catch (error) {
    for (const snapshot of applied.reverse()) {
      if (snapshot.existed) {
        await atomicReplace(snapshot.absolutePath, snapshot.before).catch(() => undefined);
      } else {
        await fs.rm(snapshot.absolutePath, { force: true }).catch(() => undefined);
      }
    }
    manifest.state = "rolled-back";
    await writeManifest(directory, manifest).catch(() => undefined);
    throw error;
  }

  return {
    sessionId: id,
    appliedFiles: snapshots.map((snapshot) => snapshot.path),
    preview,
  };
}

function parseManifest(input: unknown): ChangeSessionManifest {
  if (!input || typeof input !== "object") {
    throw new ChangePlanError("Session manifest is invalid.", "SESSION_STATE");
  }
  const candidate = input as Record<string, unknown>;
  if (
    candidate.schemaVersion !== 1 ||
    typeof candidate.id !== "string" ||
    !SESSION_ID_PATTERN.test(candidate.id) ||
    typeof candidate.planId !== "string" ||
    typeof candidate.root !== "string" ||
    typeof candidate.createdAt !== "string" ||
    Number.isNaN(Date.parse(candidate.createdAt)) ||
    !["prepared", "applied", "rolled-back", "undone"].includes(
      String(candidate.state),
    ) ||
    !Array.isArray(candidate.entries) ||
    candidate.entries.length > MAX_CHANGE_FILES
  ) {
    throw new ChangePlanError("Session manifest is invalid.", "SESSION_STATE");
  }

  const seen = new Set<string>();
  const entries = candidate.entries.map((rawEntry) => {
    if (!rawEntry || typeof rawEntry !== "object") {
      throw new ChangePlanError("Session entry is invalid.", "SESSION_STATE");
    }
    const entry = rawEntry as Record<string, unknown>;
    const entryPath = validateRelativePath(entry.path);
    const identity = process.platform === "win32" ? entryPath.toLowerCase() : entryPath;
    if (seen.has(identity)) {
      throw new ChangePlanError("Session contains duplicate paths.", "SESSION_STATE");
    }
    seen.add(identity);
    if (
      typeof entry.existed !== "boolean" ||
      typeof entry.afterSha256 !== "string" ||
      !/^[a-f0-9]{64}$/.test(entry.afterSha256)
    ) {
      throw new ChangePlanError("Session entry hashes are invalid.", "SESSION_STATE");
    }
    const beforeSha256 = validateHash(entry.beforeSha256, entryPath);
    const expectedBackupPath = entry.existed
      ? path.posix.join("files", entryPath)
      : null;
    if (
      (entry.existed ? beforeSha256 === null : beforeSha256 !== null) ||
      entry.backupPath !== expectedBackupPath
    ) {
      throw new ChangePlanError("Session backup metadata is invalid.", "SESSION_STATE");
    }
    return {
      path: entryPath,
      existed: entry.existed,
      beforeSha256,
      afterSha256: entry.afterSha256,
      backupPath: expectedBackupPath,
    };
  });

  if (
    candidate.undoneAt !== undefined &&
    (typeof candidate.undoneAt !== "string" ||
      Number.isNaN(Date.parse(candidate.undoneAt)))
  ) {
    throw new ChangePlanError("Session undoneAt is invalid.", "SESSION_STATE");
  }

  return {
    schemaVersion: 1,
    id: candidate.id,
    planId: candidate.planId,
    root: candidate.root,
    createdAt: candidate.createdAt,
    state: candidate.state as ChangeSessionManifest["state"],
    ...(typeof candidate.undoneAt === "string"
      ? { undoneAt: candidate.undoneAt }
      : {}),
    entries,
  };
}

export async function listChangeSessions(root: string): Promise<ChangeSessionManifest[]> {
  const canonical = await canonicalRoot(root);
  const base = await safeSessionBase(canonical, false);
  if (!base) return [];
  let directories;
  try {
    directories = await fs.readdir(base, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  const manifests: ChangeSessionManifest[] = [];
  for (const directory of directories) {
    if (!directory.isDirectory() || !SESSION_ID_PATTERN.test(directory.name)) continue;
    try {
      const raw = await fs.readFile(path.join(base, directory.name, "manifest.json"), "utf8");
      const manifest = parseManifest(JSON.parse(raw));
      if (manifest.root === canonical && manifest.id === directory.name) {
        manifests.push(manifest);
      }
    } catch {
      // Corrupt sessions are excluded rather than trusted.
    }
  }
  return manifests.sort((left, right) => right.id.localeCompare(left.id));
}

export async function undoChangeSession(
  root: string,
  which = "latest",
  options: { confirmed?: boolean } = {},
): Promise<UndoChangeResult> {
  if (!options.confirmed) {
    throw new ChangePlanError(
      "Undo requires explicit confirmation.",
      "CONFIRMATION_REQUIRED",
    );
  }
  const canonical = await canonicalRoot(root);
  const sessions = await listChangeSessions(canonical);
  const manifest =
    which === "latest"
      ? sessions.find((session) => session.state === "applied")
      : sessions.find((session) => session.id === which);
  if (!manifest) {
    throw new ChangePlanError(`Change session not found: ${which}`, "SESSION_NOT_FOUND");
  }
  if (manifest.state !== "applied") {
    throw new ChangePlanError(
      `Change session ${manifest.id} is ${manifest.state}, not applied.`,
      "SESSION_STATE",
    );
  }

  const base = await safeSessionBase(canonical, false);
  if (!base) {
    throw new ChangePlanError("Localis state directory is missing.", "SESSION_STATE");
  }
  const directory = path.join(base, manifest.id);
  const currentSnapshots: Array<{
    entry: ChangeSessionEntry;
    absolutePath: string;
    current: string;
    restore: string | null;
  }> = [];
  for (const entry of manifest.entries) {
    const current = await readExistingFile(canonical, entry.path);
    if (!current.existed || sha256(current.content) !== entry.afterSha256) {
      throw new ChangePlanError(
        `Undo conflict for ${entry.path}: the file changed after Localis applied it.`,
        "CONFLICT",
      );
    }
    let restore: string | null = null;
    if (entry.existed) {
      if (!entry.backupPath) {
        throw new ChangePlanError(
          `Backup is missing for ${entry.path}.`,
          "SESSION_STATE",
        );
      }
      const backupAbsolute = path.join(directory, entry.backupPath);
      const realBackup = await fs.realpath(backupAbsolute);
      const relativeBackup = path.relative(directory, realBackup);
      if (
        relativeBackup.startsWith("..") ||
        path.isAbsolute(relativeBackup) ||
        !(await fs.lstat(realBackup)).isFile()
      ) {
        throw new ChangePlanError(
          `Backup path is unsafe for ${entry.path}.`,
          "SESSION_STATE",
        );
      }
      restore = await fs.readFile(realBackup, "utf8");
      if (sha256(restore) !== entry.beforeSha256) {
        throw new ChangePlanError(
          `Backup integrity check failed for ${entry.path}.`,
          "SESSION_STATE",
        );
      }
    }
    currentSnapshots.push({
      entry,
      absolutePath: current.absolutePath,
      current: current.content,
      restore,
    });
  }

  const restored: typeof currentSnapshots = [];
  try {
    for (const snapshot of currentSnapshots) {
      const latest = await readExistingFile(canonical, snapshot.entry.path);
      if (!latest.existed || latest.content !== snapshot.current) {
        throw new ChangePlanError(
          `Undo conflict for ${snapshot.entry.path}: the file changed before restore.`,
          "CONFLICT",
        );
      }
      if (snapshot.restore === null) await fs.rm(snapshot.absolutePath);
      else await atomicReplace(snapshot.absolutePath, snapshot.restore);
      restored.push(snapshot);
    }
    manifest.state = "undone";
    manifest.undoneAt = new Date().toISOString();
    await writeManifest(directory, manifest);
  } catch (error) {
    for (const snapshot of restored.reverse()) {
      await atomicReplace(snapshot.absolutePath, snapshot.current).catch(() => undefined);
    }
    throw error;
  }

  return {
    sessionId: manifest.id,
    restoredFiles: currentSnapshots.map((snapshot) => snapshot.entry.path),
  };
}
