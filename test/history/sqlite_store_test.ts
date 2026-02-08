import { afterEach, beforeEach, describe, it } from "../deps.ts";
import { assertEquals, assertExists } from "../deps.ts";
import { path } from "../../src/deps.ts";
import { createSQLiteStore } from "../../src/history/sqlite-store.ts";
import type { HistoryRecord } from "../../src/history/types.ts";

const createRecord = (
  overrides: Partial<HistoryRecord> = {},
): HistoryRecord => ({
  id: crypto.randomUUID().replace(/-/g, "").slice(0, 26),
  ts: new Date().toISOString(),
  command: "echo test",
  exit: 0,
  pwd: "/tmp/project",
  session: "session-1",
  host: "host",
  user: "user",
  shell: "zsh",
  repo_root: "/tmp",
  deleted_at: null,
  meta: null,
  duration_ms: 10,
  ...overrides,
});

describe("SQLiteStore", () => {
  let tempDir: string;
  let dbPath: string;

  beforeEach(async () => {
    tempDir = await Deno.makeTempDir({ prefix: "zeno-history-test-" });
    dbPath = path.join(tempDir, "history.db");
  });

  afterEach(async () => {
    await Deno.remove(tempDir, { recursive: true });
  });

  it("creates database file and inserts records", async () => {
    const store = await createSQLiteStore({ databasePath: dbPath });
    try {
      const record = createRecord();

      await store.insert(record);

      const byId = await store.selectById(record.id);
      assertExists(byId);
      assertEquals(byId.command, record.command);
      assertEquals(byId.repo_root, record.repo_root);
    } finally {
      await store.close();
    }
  });

  it("filters records by scope and deleted flag", async () => {
    const store = await createSQLiteStore({ databasePath: dbPath });
    try {
      const globalRecord = createRecord({
        id: "01GLOB" + crypto.randomUUID().slice(0, 20),
      });
      const repoRecord = createRecord({
        id: "01REPO" + crypto.randomUUID().slice(0, 20),
        repo_root: "/repos/one",
        pwd: "/repos/one/app",
        command: "echo repo",
      });
      const deletedRecord = createRecord({
        id: "01DELE" + crypto.randomUUID().slice(0, 20),
        repo_root: "/repos/one",
        command: "echo deleted",
        deleted_at: new Date().toISOString(),
      });

      await store.insert(globalRecord);
      await store.insert(repoRecord);
      await store.insert(deletedRecord);

      const repoResults = await store.select({
        scope: "repository",
        repoRoot: "/repos/one",
        limit: 10,
        deleted: "exclude",
      });
      assertEquals(repoResults.items.length, 1);
      assertEquals(repoResults.items[0].id, repoRecord.id);

      const includeDeleted = await store.select({
        scope: "repository",
        repoRoot: "/repos/one",
        limit: 10,
        deleted: "include",
      });
      assertEquals(includeDeleted.items.length, 2);
    } finally {
      await store.close();
    }
  });

  it("marks records as deleted", async () => {
    const store = await createSQLiteStore({ databasePath: dbPath });
    try {
      const record = createRecord();
      await store.insert(record);

      await store.markDeleted(record.id, new Date().toISOString());

      const result = await store.select({
        scope: "global",
        limit: 10,
        deleted: "exclude",
      });
      assertEquals(result.items.length, 0);

      const withDeleted = await store.select({
        scope: "global",
        limit: 10,
        deleted: "include",
      });
      assertEquals(withDeleted.items.length, 1);
      assertEquals(withDeleted.items[0].deleted_at !== null, true);
    } finally {
      await store.close();
    }
  });

  it("returns only deleted records when requested", async () => {
    const store = await createSQLiteStore({ databasePath: dbPath });
    try {
      const active = createRecord();
      const deleted = createRecord({
        id: "01DELETED" + crypto.randomUUID().slice(0, 18),
        deleted_at: new Date().toISOString(),
      });
      await store.insert(active);
      await store.insert(deleted);

      const results = await store.select({
        scope: "global",
        limit: 10,
        deleted: "only",
      });
      assertEquals(results.items.length, 1);
      assertEquals(results.items[0].id, deleted.id);
    } finally {
      await store.close();
    }
  });

  it("deduplicates same command and keeps the latest timestamp", async () => {
    const store = await createSQLiteStore({ databasePath: dbPath });
    try {
      const oldRecord = createRecord({
        id: "01OLD" + crypto.randomUUID().slice(0, 21),
        ts: "2024-01-01T00:00:00.000Z",
        command: "git status",
      });
      const newRecord = createRecord({
        id: "01NEW" + crypto.randomUUID().slice(0, 21),
        ts: "2024-01-02T00:00:00.000Z",
        command: "git status",
      });
      const another = createRecord({
        id: "01ANOTHER" + crypto.randomUUID().slice(0, 17),
        ts: "2024-01-03T00:00:00.000Z",
        command: "npm test",
      });

      await store.insert(oldRecord);
      await store.insert(newRecord);
      await store.insert(another);

      const result = await store.select({
        scope: "global",
        limit: 10,
        deleted: "exclude",
      });

      assertEquals(result.items.length, 2);
      assertEquals(result.items[0].id, another.id);
      assertEquals(result.items[1].id, newRecord.id);
    } finally {
      await store.close();
    }
  });
});
