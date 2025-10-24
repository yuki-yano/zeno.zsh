import { describe, it } from "../deps.ts";
import { assertEquals, assertStrictEquals } from "../deps.ts";
import { createHistoryModule } from "../../src/history/module.ts";
import { createRedactor } from "../../src/history/redactor.ts";
import type { RepoFinder } from "../../src/history/repo-finder.ts";
import type { SQLiteStore } from "../../src/history/sqlite-store.ts";
import type {
  ExportRequest,
  HistoryRecord,
  ImportRequest,
  LogCommandInput,
} from "../../src/history/types.ts";
import type {
  HistfileEditor,
  HistfileEntry,
} from "../../src/history/histfile-editor.ts";
import type { HistoryIO, ImportOutcome } from "../../src/history/io.ts";

const createStubStore = (
  overrides: Partial<SQLiteStore> = {},
): SQLiteStore => {
  const base: SQLiteStore = {
    async insert() {},
    async select() {
      return { items: [] };
    },
    async selectById() {
      return null;
    },
    async markDeleted() {},
    async close() {},
  };

  return { ...base, ...overrides };
};

const createStubHistfileEditor = (
  overrides: Partial<HistfileEditor> = {},
): HistfileEditor => ({
  async prune() {
    return { ok: true, value: undefined };
  },
  ...overrides,
});

const createStubHistoryIO = (
  overrides: Partial<HistoryIO> = {},
): HistoryIO => ({
  async exportAll() {},
  async importFile() {
    const outcome: ImportOutcome = {
      records: [],
      summary: {
        added: 0,
        skipped: 0,
        total: 0,
      },
    };
    return outcome;
  },
  ...overrides,
});

describe("HistoryModule.logCommand", () => {
  it("redacts command text and resolves repository before persisting", async () => {
    let inserted: HistoryRecord | undefined;
    const store = createStubStore({
      async insert(record) {
        inserted = record;
      },
    });

    const repoFinder: RepoFinder = {
      async resolve() {
        return "/repos/example";
      },
    };

    const redactor = createRedactor([/token-\w+/g]);
    const module = createHistoryModule({
      store,
      repoFinder,
      redactor,
      histfileEditor: createStubHistfileEditor(),
      historyIO: createStubHistoryIO(),
      now: () => "2024-01-01T00:00:00.000Z",
    });

    const input: LogCommandInput = {
      id: "01HISTORYTESTID000000000000",
      ts: "2024-01-01T00:00:00.000Z",
      command: "echo token-abc123",
      exit: 0,
      pwd: "/repos/example/app",
      session: "session-1",
      host: "host",
      user: "user",
      shell: "zsh",
      repo_root: null,
      duration_ms: 120,
      meta: { startedAtRealtime: "1700000000.000000" },
    };

    const result = await module.logCommand(input);
    assertStrictEquals(result.ok, true);
    assertStrictEquals(inserted?.command, "echo ***");
    assertStrictEquals(inserted?.repo_root, "/repos/example");
    assertStrictEquals(inserted?.deleted_at, null);
  });

  it("returns error result when store insertion throws", async () => {
    const store = createStubStore({
      async insert() {
        throw new Error("disk full");
      },
    });

    const repoFinder: RepoFinder = {
      async resolve() {
        return null;
      },
    };

    const redactor = createRedactor([]);
    const module = createHistoryModule({
      store,
      repoFinder,
      redactor,
      histfileEditor: createStubHistfileEditor(),
      historyIO: createStubHistoryIO(),
      now: () => "2024-01-01T00:00:00.000Z",
    });

    const input: LogCommandInput = {
      id: "01HISTORYTESTID000000000000",
      ts: "2024-01-01T00:00:00.000Z",
      command: "echo failure",
      exit: 1,
      pwd: "/tmp",
      session: "session-err",
      host: "host",
      user: "user",
      shell: "zsh",
      repo_root: null,
      duration_ms: null,
      meta: null,
    };

    const result = await module.logCommand(input);
    assertStrictEquals(result.ok, false);
    assertEquals(result.error.type, "io");
    assertEquals(result.error.message.includes("insert"), true);
  });
});

describe("HistoryModule.queryHistory", () => {
  it("fetches record by id when provided", async () => {
    let selectCalled = false;
    const target: HistoryRecord = {
      id: "01HISTORYQUERYTEST000000000000",
      ts: "2024-01-02T00:00:00.000Z",
      command: "git status",
      exit: 0,
      pwd: "/repo/app",
      session: "session-1",
      host: "host",
      user: "user",
      shell: "zsh",
      repo_root: "/repo",
      deleted_at: null,
      duration_ms: 10,
      meta: null,
    };

    const store = createStubStore({
      async select() {
        selectCalled = true;
        return { items: [] };
      },
      async selectById(id) {
        return id === target.id ? target : null;
      },
    });

    const module = createHistoryModule({
      store,
      repoFinder: {
        async resolve() {
          return "/repo";
        },
      },
      redactor: createRedactor([]),
      histfileEditor: createStubHistfileEditor(),
      historyIO: createStubHistoryIO(),
      now: () => "2024-01-01T00:00:00.000Z",
    });

    const result = await module.queryHistory({
      id: target.id,
      scope: "global",
      limit: 10,
      deleted: "exclude",
    });

    assertStrictEquals(result.ok, true);
    assertEquals(result.value.items.length, 1);
    assertEquals(result.value.items[0]?.id, target.id);
    assertStrictEquals(selectCalled, false);
  });

  it("resolves repository when scope is repository", async () => {
    let receivedFilter: unknown;
    const store = createStubStore({
      async select(filter) {
        receivedFilter = filter;
        return {
          items: [{
            id: "01REPOREC000000000000000000",
            ts: "2024-01-02T00:00:00.000Z",
            command: "npm test",
            exit: 0,
            pwd: "/work/app",
            session: "session-1",
            host: "host",
            user: "user",
            shell: "zsh",
            repo_root: "/repo/root",
            deleted_at: null,
            duration_ms: null,
            meta: null,
          }],
        };
      },
    });

    const repoFinder: RepoFinder = {
      async resolve(path) {
        return path === "/work/app" ? "/repo/root" : null;
      },
    };

    const module = createHistoryModule({
      store,
      repoFinder,
      redactor: createRedactor([]),
      histfileEditor: createStubHistfileEditor(),
      historyIO: createStubHistoryIO(),
      now: () => "2024-01-01T00:00:00.000Z",
    });

    const result = await module.queryHistory({
      scope: "repository",
      cwd: "/work/app",
      limit: 30,
      deleted: "exclude",
    });

    assertStrictEquals(result.ok, true);
    assertEquals(result.value.items.length, 1);
    assertEquals(
      (receivedFilter as { repoRoot?: string }).repoRoot,
      "/repo/root",
    );
  });

  it("returns io error when store select throws", async () => {
    const store = createStubStore({
      async select() {
        throw new Error("db down");
      },
    });

    const module = createHistoryModule({
      store,
      repoFinder: {
        async resolve() {
          return null;
        },
      },
      redactor: createRedactor([]),
      histfileEditor: createStubHistfileEditor(),
      historyIO: createStubHistoryIO(),
      now: () => "2024-01-01T00:00:00.000Z",
    });

    const result = await module.queryHistory({
      scope: "global",
      limit: 5,
      deleted: "exclude",
    });

    assertStrictEquals(result.ok, false);
    assertEquals(result.error.type, "io");
  });
});

describe("HistoryModule.deleteHistory", () => {
  const baseRecord: HistoryRecord = {
    id: "01DELETEID0000000000000000",
    ts: "2024-01-02T00:00:00.000Z",
    command: "echo secret-123",
    exit: 0,
    pwd: "/repo/app",
    session: "sess",
    host: "host",
    user: "user",
    shell: "zsh",
    repo_root: "/repo",
    deleted_at: null,
    duration_ms: null,
    meta: null,
  };

  it("marks record as deleted on soft delete", async () => {
    let marked: { id: string; at: string } | undefined;
    const store = createStubStore({
      async selectById(id) {
        return id === baseRecord.id ? { ...baseRecord } : null;
      },
      async markDeleted(id, at) {
        marked = { id, at };
      },
    });

    const module = createHistoryModule({
      store,
      repoFinder: {
        async resolve() {
          return "/repo";
        },
      },
      redactor: createRedactor([]),
      histfileEditor: createStubHistfileEditor(),
      historyIO: createStubHistoryIO(),
      now: () => "2024-01-03T00:00:00.000Z",
    });

    const result = await module.deleteHistory({
      id: baseRecord.id,
      hard: false,
    });

    assertStrictEquals(result.ok, true);
    assertEquals(marked?.id, baseRecord.id);
    assertEquals(marked?.at, "2024-01-03T00:00:00.000Z");
  });

  it("invokes histfile editor for hard delete", async () => {
    let pruneEntry: HistfileEntry | undefined;
    const store = createStubStore({
      async selectById(id) {
        return id === baseRecord.id ? { ...baseRecord } : null;
      },
      async markDeleted() {},
    });
    const histfileEditor = createStubHistfileEditor({
      async prune(entry) {
        pruneEntry = entry;
        return { ok: true, value: undefined };
      },
    });

    const module = createHistoryModule({
      store,
      repoFinder: {
        async resolve() {
          return "/repo";
        },
      },
      redactor: createRedactor([/secret-\d+/g]),
      histfileEditor,
      historyIO: createStubHistoryIO(),
      now: () => "2024-01-03T00:00:00.000Z",
    });

    await module.deleteHistory({
      id: baseRecord.id,
      hard: true,
    });

    assertStrictEquals(pruneEntry?.command, "echo ***");
  });

  it("returns validation error when record not found", async () => {
    const store = createStubStore({
      async selectById() {
        return null;
      },
    });

    const module = createHistoryModule({
      store,
      repoFinder: {
        async resolve() {
          return null;
        },
      },
      redactor: createRedactor([]),
      histfileEditor: createStubHistfileEditor(),
      historyIO: createStubHistoryIO(),
      now: () => "2024-01-03T00:00:00.000Z",
    });

    const result = await module.deleteHistory({
      id: "missing",
      hard: false,
    });

    assertStrictEquals(result.ok, false);
    assertEquals(result.error.type, "validation");
  });
});

describe("HistoryModule.exportHistory", () => {
  it("passes redacted records to history IO", async () => {
    const store = createStubStore({
      async select() {
        return {
          items: [{
            id: "01EXPORT000000000000000000",
            ts: "2024-01-01T00:00:00.000Z",
            command: "print secret-token",
            exit: 0,
            pwd: "/work",
            session: "s",
            host: "host",
            user: "user",
            shell: "zsh",
            repo_root: null,
            deleted_at: null,
            duration_ms: null,
            meta: null,
          }],
        };
      },
    });

    let exportedRecords: HistoryRecord[] | undefined;
    const historyIO = createStubHistoryIO({
      async exportAll(request) {
        exportedRecords = request.records;
      },
    });

    const module = createHistoryModule({
      store,
      repoFinder: {
        async resolve() {
          return null;
        },
      },
      redactor: createRedactor([/secret-token/]),
      histfileEditor: createStubHistfileEditor(),
      historyIO,
      now: () => "2024-01-03T00:00:00.000Z",
    });

    const request: ExportRequest = {
      format: "ndjson",
      outputPath: "/tmp/out.ndjson",
      scope: "global",
      limit: 100,
      deleted: "exclude",
    };

    const result = await module.exportHistory(request);
    assertStrictEquals(result.ok, true);
    assertEquals(exportedRecords?.[0]?.command, "print ***");
  });
});

describe("HistoryModule.importHistory", () => {
  it("inserts redacted records when not dry-run", async () => {
    const inserted: HistoryRecord[] = [];
    const store = createStubStore({
      async selectById() {
        return null;
      },
      async insert(record) {
        inserted.push(record);
      },
    });

    const historyIO = createStubHistoryIO({
      async importFile(_request) {
        const outcome: ImportOutcome = {
          records: [{
            id: "01IMPORT000000000000000000",
            ts: "2024-01-04T00:00:00.000Z",
            command: "echo secret",
            exit: 0,
            pwd: null,
            session: null,
            host: null,
            user: null,
            shell: "zsh",
            repo_root: null,
            deleted_at: null,
            duration_ms: null,
            meta: null,
          }],
          summary: {
            added: 1,
            skipped: 0,
            total: 1,
          },
        };
        return outcome;
      },
    });

    const module = createHistoryModule({
      store,
      repoFinder: {
        async resolve() {
          return null;
        },
      },
      redactor: createRedactor([/secret/]),
      histfileEditor: createStubHistfileEditor(),
      historyIO,
      now: () => "2024-01-05T00:00:00.000Z",
    });

    const request: ImportRequest = {
      format: "ndjson",
      inputPath: "/tmp/in.ndjson",
      dedupe: "off",
      dryRun: false,
    };

    const result = await module.importHistory(request);
    assertStrictEquals(result.ok, true);
    assertEquals(result.value.added, 1);
    assertEquals(inserted.length, 1);
    assertEquals(inserted[0].command, "echo ***");
  });

  it("skips insert when dry-run", async () => {
    let inserted = false;
    const store = createStubStore({
      async selectById() {
        return null;
      },
      async insert() {
        inserted = true;
      },
    });

    const historyIO = createStubHistoryIO({
      async importFile() {
        const outcome: ImportOutcome = {
          records: [{
            id: "01IMPORT000000000000000001",
            ts: "2024-01-04T01:00:00.000Z",
            command: "echo dry",
            exit: 0,
            pwd: null,
            session: null,
            host: null,
            user: null,
            shell: "zsh",
            repo_root: null,
            deleted_at: null,
            duration_ms: null,
            meta: null,
          }],
          summary: {
            added: 0,
            skipped: 1,
            total: 1,
          },
        };
        return outcome;
      },
    });

    const module = createHistoryModule({
      store,
      repoFinder: {
        async resolve() {
          return null;
        },
      },
      redactor: createRedactor([]),
      histfileEditor: createStubHistfileEditor(),
      historyIO,
      now: () => "2024-01-05T00:00:00.000Z",
    });

    const result = await module.importHistory({
      format: "ndjson",
      inputPath: "/tmp/in.ndjson",
      dedupe: "off",
      dryRun: true,
    });

    assertStrictEquals(result.ok, true);
    assertEquals(inserted, false);
    assertEquals(result.value.skipped, 1);
  });
});
