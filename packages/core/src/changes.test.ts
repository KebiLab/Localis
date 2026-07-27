import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  applyChangePlan,
  ChangePlanError,
  createChangePlan,
  listChangeSessions,
  parseChangePlan,
  previewChangePlan,
  undoChangeSession,
} from "./changes.js";

test("change plan previews, applies, records, and undoes a transaction", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "localis-change-"));

  try {
    await fs.mkdir(path.join(root, "src"));
    await fs.writeFile(path.join(root, "src", "existing.ts"), "export const value = 1;\n");
    if (process.platform !== "win32") {
      await fs.chmod(path.join(root, "src", "existing.ts"), 0o755);
    }
    const plan = await createChangePlan(
      root,
      [
        { path: "src/existing.ts", after: "export const value = 2;\n" },
        { path: "src/created.ts", after: "export const created = true;\n" },
      ],
      "transaction-test",
    );

    const preview = await previewChangePlan(root, plan);
    assert.equal(preview.changedFiles, 2);
    assert.deepEqual(
      preview.files.map((file) => file.status),
      ["modified", "created"],
    );
    assert.match(preview.files[0]?.diff ?? "", /-export const value = 1/);
    assert.match(preview.files[0]?.diff ?? "", /\+export const value = 2/);

    await assert.rejects(
      applyChangePlan(root, plan),
      (error: unknown) =>
        error instanceof ChangePlanError && error.code === "CONFIRMATION_REQUIRED",
    );

    const applied = await applyChangePlan(root, plan, { confirmed: true });
    assert.ok(applied.sessionId);
    assert.equal(
      await fs.readFile(path.join(root, "src", "existing.ts"), "utf8"),
      "export const value = 2;\n",
    );
    if (process.platform !== "win32") {
      assert.equal((await fs.stat(path.join(root, "src", "existing.ts"))).mode & 0o777, 0o755);
    }
    assert.equal(
      await fs.readFile(path.join(root, "src", "created.ts"), "utf8"),
      "export const created = true;\n",
    );

    const sessions = await listChangeSessions(root);
    assert.equal(sessions.length, 1);
    assert.equal(sessions[0]?.state, "applied");
    assert.equal(sessions[0]?.entries.length, 2);

    const undone = await undoChangeSession(root, applied.sessionId ?? "", {
      confirmed: true,
    });
    assert.equal(undone.restoredFiles.length, 2);
    assert.equal(
      await fs.readFile(path.join(root, "src", "existing.ts"), "utf8"),
      "export const value = 1;\n",
    );
    await assert.rejects(fs.access(path.join(root, "src", "created.ts")));
    assert.equal((await listChangeSessions(root))[0]?.state, "undone");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("change plan stops when a source hash is stale", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "localis-conflict-"));

  try {
    const target = path.join(root, "index.ts");
    await fs.writeFile(target, "version one\n");
    const plan = await createChangePlan(
      root,
      [{ path: "index.ts", after: "version two\n" }],
      "stale-test",
    );
    await fs.writeFile(target, "changed outside localis\n");

    await assert.rejects(
      applyChangePlan(root, plan, { confirmed: true }),
      (error: unknown) =>
        error instanceof ChangePlanError && error.code === "CONFLICT",
    );
    assert.equal(await fs.readFile(target, "utf8"), "changed outside localis\n");
    assert.equal((await listChangeSessions(root)).length, 0);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("undo refuses to overwrite edits made after apply", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "localis-undo-conflict-"));

  try {
    const target = path.join(root, "index.ts");
    await fs.writeFile(target, "before\n");
    const plan = await createChangePlan(
      root,
      [{ path: "index.ts", after: "after\n" }],
      "undo-conflict-test",
    );
    const applied = await applyChangePlan(root, plan, { confirmed: true });
    await fs.writeFile(target, "developer edit\n");

    await assert.rejects(
      undoChangeSession(root, applied.sessionId ?? "", { confirmed: true }),
      (error: unknown) =>
        error instanceof ChangePlanError && error.code === "CONFLICT",
    );
    assert.equal(await fs.readFile(target, "utf8"), "developer edit\n");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("history excludes sessions with tampered backup metadata", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "localis-tampered-session-"));

  try {
    const target = path.join(root, "index.ts");
    await fs.writeFile(target, "before\n");
    const plan = await createChangePlan(
      root,
      [{ path: "index.ts", after: "after\n" }],
      "tampered-session-test",
    );
    const applied = await applyChangePlan(root, plan, { confirmed: true });
    const sessionId = applied.sessionId;
    assert.ok(sessionId);
    const manifestPath = path.join(
      root,
      ".localis",
      "backups",
      sessionId,
      "manifest.json",
    );
    const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8")) as {
      entries: Array<{ backupPath: string | null }>;
    };
    manifest.entries[0]!.backupPath = "../../outside";
    await fs.writeFile(manifestPath, JSON.stringify(manifest));

    assert.equal((await listChangeSessions(root)).length, 0);
    await assert.rejects(
      undoChangeSession(root, sessionId, { confirmed: true }),
      (error: unknown) =>
        error instanceof ChangePlanError && error.code === "SESSION_NOT_FOUND",
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("apply refuses an unsafe Localis state path", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "localis-unsafe-state-"));

  try {
    const target = path.join(root, "index.ts");
    await fs.writeFile(target, "before\n");
    await fs.writeFile(path.join(root, ".localis"), "not a directory\n");
    const plan = await createChangePlan(
      root,
      [{ path: "index.ts", after: "after\n" }],
      "unsafe-state-test",
    );

    await assert.rejects(
      applyChangePlan(root, plan, { confirmed: true }),
      (error: unknown) =>
        error instanceof ChangePlanError && error.code === "UNSAFE_PATH",
    );
    assert.equal(await fs.readFile(target, "utf8"), "before\n");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("change plan rejects traversal, internal state, and duplicate paths", () => {
  const base = {
    schemaVersion: 1,
    id: "unsafe-test",
    createdAt: new Date().toISOString(),
  };

  for (const unsafePath of ["../outside.ts", "/absolute.ts", ".localis/manifest.json"]) {
    assert.throws(
      () =>
        parseChangePlan({
          ...base,
          files: [{ path: unsafePath, beforeSha256: null, after: "x" }],
        }),
      (error: unknown) =>
        error instanceof ChangePlanError && error.code === "UNSAFE_PATH",
    );
  }

  assert.throws(
    () =>
      parseChangePlan({
        ...base,
        files: [
          { path: "src/a.ts", beforeSha256: null, after: "x" },
          { path: "src/a.ts", beforeSha256: null, after: "y" },
        ],
      }),
    /Duplicate change path/,
  );
});
