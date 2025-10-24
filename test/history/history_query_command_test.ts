import { describe, it } from "../deps.ts";
import {
  assertEquals,
  assertStrictEquals,
  assertStringIncludes,
} from "../deps.ts";
import { createHistoryQueryCommand } from "../../src/history/query-command.ts";
import type {
  HistoryModule,
  HistoryRecord,
  HistoryScope,
} from "../../src/history/types.ts";

const createWriter = () => {
  const lines: string[] = [];
  return {
    writer: {
      write: ({ text }: { format: string; text: string }) => {
        lines.push(text);
        return Promise.resolve();
      },
    },
    lines,
  };
};

const createSettings = () => ({
  defaultScope: "global" as const,
  redact: [],
  keymap: {
    deleteSoft: "ctrl-d",
    deleteHard: "alt-d",
    toggleScope: "ctrl-r",
  },
  fzfCommand: undefined,
  fzfOptions: undefined,
});

const createModule = (
  overrides: Partial<HistoryModule> = {},
): HistoryModule => ({
  logCommand: async () => ({ ok: true, value: undefined }),
  setRedactPatterns() {},
  queryHistory: async () => ({
    ok: true as const,
    value: { items: [] as HistoryRecord[] },
  }),
  deleteHistory: async () => ({ ok: true as const, value: undefined }),
  exportHistory: async () => ({ ok: true as const, value: undefined }),
  importHistory: async () => ({
    ok: true as const,
    value: { added: 0, skipped: 0, total: 0 },
  }),
  ...overrides,
});

describe("history query command", () => {
  it("fails when historyQuery payload is missing", async () => {
    const command = createHistoryQueryCommand({
      async getHistoryModule() {
        return createModule();
      },
      async loadHistorySettings() {
        return createSettings();
      },
      now: () => new Date("2024-01-02T00:00:00Z"),
    });

    const { writer, lines } = createWriter();

    await command.execute({
      input: {},
      writer,
    });

    assertStrictEquals(lines[0], "failure");
    assertEquals(lines[1], "historyQuery payload is required");
  });

  it("prints formatted lines when format is lines", async () => {
    const module = createModule({
      async queryHistory() {
        return {
          ok: true as const,
          value: {
            items: [
              {
                id: "01HISTORYA00000000000000000",
                ts: "2024-01-02T00:00:00.000Z",
                command: "git status",
                exit: 0,
                pwd: "/repo/app",
                session: "sess-1",
                host: "host",
                user: "user",
                shell: "zsh",
                repo_root: "/repo",
                deleted_at: null,
                duration_ms: null,
                meta: null,
              },
              {
                id: "01HISTORYB00000000000000000",
                ts: "2024-01-01T23:00:00.000Z",
                command: "npm test",
                exit: 1,
                pwd: "/repo/app",
                session: "sess-1",
                host: "host",
                user: "user",
                shell: "zsh",
                repo_root: "/repo",
                deleted_at: null,
                duration_ms: 1234,
                meta: null,
              },
            ],
          },
        };
      },
    });

    const command = createHistoryQueryCommand({
      async getHistoryModule() {
        return module;
      },
      async loadHistorySettings() {
        return createSettings();
      },
      now: () => new Date("2024-01-02T00:05:00.000Z"),
    });

    const { writer, lines } = createWriter();

    await command.execute({
      input: {
        historyQuery: {
          scope: "repository",
          cwd: "/repo/app",
          format: "lines",
        },
      },
      writer,
    });

    assertStrictEquals(lines[0], "success");
    assertStringIncludes(lines[1], "scope:repository");
    assertStringIncludes(lines[1], "items:2");
    assertStringIncludes(lines[2], "01HISTORYA00000000000000000");
    assertStringIncludes(lines[2], "git status");
    assertEquals(lines[2].includes("repo"), false);
    assertEquals(lines[2].includes("./"), false);
    assertStringIncludes(lines[3], "01HISTORYB00000000000000000");
    assertStringIncludes(lines[3], "npm test");
    assertStringIncludes(lines[3], "✘");
    assertEquals(lines[3].includes("repo"), false);
    assertEquals(lines[3].includes("./"), false);
  });

  it("prints formatted lines for all scopes when scope is all", async () => {
    const calls: HistoryScope[] = [];
    const module = createModule({
      async queryHistory(request) {
        calls.push(request.scope);
        const base = {
          ts: "2024-01-02T00:00:00.000Z",
          exit: 0,
          pwd: "/repo/app",
          session: "sess-1",
          host: "host",
          user: "user",
          shell: "zsh",
          repo_root: "/repo",
          deleted_at: null,
          duration_ms: null,
          meta: null,
        };
        const items: HistoryRecord[] = (() => {
          switch (request.scope) {
            case "global":
              return [{
                id: "01GLOBAL0000000000000000000",
                command: "git status",
                ...base,
              }];
            case "repository":
              return [{
                id: "01REPO00000000000000000000",
                command: "npm test",
                ...base,
              }];
            default:
              return [];
          }
        })();
        return { ok: true as const, value: { items } };
      },
    });

    const command = createHistoryQueryCommand({
      async getHistoryModule() {
        return module;
      },
      async loadHistorySettings() {
        return createSettings();
      },
      now: () => new Date("2024-01-02T00:05:00.000Z"),
    });

    const { writer, lines } = createWriter();

    await command.execute({
      input: {
        historyQuery: {
          scope: "all",
          cwd: "/repo/app",
          format: "lines",
        },
      },
      writer,
    });

    assertStrictEquals(lines[0], "success");
    assertEquals(calls, ["global", "repository", "directory", "session"]);
    const hasGlobalHeader = lines.some((line) =>
      line.startsWith("global\t") && line.includes("scope:global")
    );
    assertStrictEquals(hasGlobalHeader, true);
    const hasGlobalCommand = lines.some((line) =>
      line.includes("01GLOBAL0000000000000000000")
    );
    assertStrictEquals(hasGlobalCommand, true);
    const hasRepositoryHeader = lines.some((line) =>
      line.startsWith("repository\t") && line.includes("scope:repository")
    );
    assertStrictEquals(hasRepositoryHeader, true);
    const hasDirectoryHeader = lines.some((line) =>
      line.startsWith("directory\t") && line.includes("scope:directory")
    );
    assertStrictEquals(hasDirectoryHeader, true);
    const hasSessionHeader = lines.some((line) =>
      line.startsWith("session\t") && line.includes("scope:session")
    );
    assertStrictEquals(hasSessionHeader, true);
  });

  it("prints pretty JSON when id is specified", async () => {
    const record: HistoryRecord = {
      id: "01HISTORYA00000000000000000",
      ts: "2024-01-02T00:00:00.000Z",
      command: "git status",
      exit: 0,
      pwd: "/repo/app",
      session: "sess-1",
      host: "host",
      user: "user",
      shell: "zsh",
      repo_root: "/repo",
      deleted_at: null,
      duration_ms: null,
      meta: { duration: 120 },
    };
    const module = createModule({
      async queryHistory() {
        return { ok: true as const, value: { items: [record] } };
      },
    });

    const command = createHistoryQueryCommand({
      async getHistoryModule() {
        return module;
      },
      async loadHistorySettings() {
        return createSettings();
      },
      now: () => new Date("2024-01-02T00:00:00.000Z"),
    });

    const { writer, lines } = createWriter();

    await command.execute({
      input: {
        historyQuery: {
          id: record.id,
          format: "json",
        },
      },
      writer,
    });

    assertStrictEquals(lines[0], "success");
    assertEquals(
      lines[1],
      JSON.stringify(record, null, 2),
    );
  });

  it("toggles scope and prints next scope", async () => {
    const command = createHistoryQueryCommand({
      async getHistoryModule() {
        return createModule();
      },
      async loadHistorySettings() {
        return createSettings();
      },
      now: () => new Date(),
    });

    const { writer, lines } = createWriter();

    await command.execute({
      input: {
        historyQuery: {
          toggleScope: true,
          scope: "repository",
        },
      },
      writer,
    });

    assertStrictEquals(lines[0], "success");
    assertStrictEquals(lines[1], "directory");
  });
});
