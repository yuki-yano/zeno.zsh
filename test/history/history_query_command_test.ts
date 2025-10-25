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
  logCommand: () => Promise.resolve({ ok: true, value: undefined }),
  setRedactPatterns() {},
  queryHistory: () =>
    Promise.resolve({
      ok: true as const,
      value: { items: [] as HistoryRecord[] },
    }),
  deleteHistory: () => Promise.resolve({ ok: true as const, value: undefined }),
  exportHistory: () => Promise.resolve({ ok: true as const, value: undefined }),
  importHistory: () =>
    Promise.resolve({
      ok: true as const,
      value: { added: 0, skipped: 0, total: 0 },
    }),
  ...overrides,
});

describe("history query command", () => {
  it("fails when historyQuery payload is missing", async () => {
    const command = createHistoryQueryCommand({
      getHistoryModule() {
        return Promise.resolve(createModule());
      },
      loadHistorySettings() {
        return Promise.resolve(createSettings());
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
      queryHistory() {
        return Promise.resolve({
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
        });
      },
    });

    const command = createHistoryQueryCommand({
      getHistoryModule() {
        return Promise.resolve(module);
      },
      loadHistorySettings() {
        return Promise.resolve(createSettings());
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
    assertEquals(lines.length, 3);
    const repoParts = lines[1].split("\t");
    assertEquals(repoParts.length, 4);
    assertEquals(repoParts[0], "01HISTORYA00000000000000000");
    assertEquals(repoParts[1], "git status");
    assertStringIncludes(repoParts[2], "✔");
    assertEquals(repoParts[3], "git status");
    assertEquals(lines[1].includes("scope:"), false);
    assertEquals(lines[1].includes("repo"), false);
    assertEquals(lines[1].includes("./"), false);
    const repoParts2 = lines[2].split("\t");
    assertEquals(repoParts2.length, 4);
    assertEquals(repoParts2[0], "01HISTORYB00000000000000000");
    assertEquals(repoParts2[1], "npm test");
    assertStringIncludes(repoParts2[2], "✘");
    assertEquals(repoParts2[3], "npm test");
    assertEquals(lines[2].includes("scope:"), false);
    assertEquals(lines[2].includes("repo"), false);
    assertEquals(lines[2].includes("./"), false);
  });

  it("prints formatted lines for all scopes when scope is all", async () => {
    const calls: HistoryScope[] = [];
    const module = createModule({
      queryHistory(request) {
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
        return Promise.resolve({ ok: true as const, value: { items } });
      },
    });

    const command = createHistoryQueryCommand({
      getHistoryModule() {
        return Promise.resolve(module);
      },
      loadHistorySettings() {
        return Promise.resolve(createSettings());
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
    const globalLine = lines.find((line) => line.startsWith("global\t"));
    const repositoryLine = lines.find((line) =>
      line.startsWith("repository\t")
    );
    assertEquals(globalLine !== undefined, true);
    assertEquals(repositoryLine !== undefined, true);
    assertStringIncludes(globalLine ?? "", "01GLOBAL0000000000000000000");
    assertStringIncludes(repositoryLine ?? "", "01REPO00000000000000000000");
    const hasScopeMeta = lines.some((line) => line.includes("scope:"));
    assertStrictEquals(hasScopeMeta, false);
    const globalParts = (globalLine ?? "").split("\t");
    const repoParts = (repositoryLine ?? "").split("\t");
    assertEquals(globalParts.length, 5);
    assertEquals(repoParts.length, 5);
    assertEquals(globalParts[4], "git status");
    assertEquals(repoParts[4], "npm test");
    const directoryLine = lines.find((line) => line.startsWith("directory\t"));
    const sessionLine = lines.find((line) => line.startsWith("session\t"));
    assertStrictEquals(directoryLine, undefined);
    assertStrictEquals(sessionLine, undefined);
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
      queryHistory() {
        return Promise.resolve({
          ok: true as const,
          value: { items: [record] },
        });
      },
    });

    const command = createHistoryQueryCommand({
      getHistoryModule() {
        return Promise.resolve(module);
      },
      loadHistorySettings() {
        return Promise.resolve(createSettings());
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
      getHistoryModule() {
        return Promise.resolve(createModule());
      },
      loadHistorySettings() {
        return Promise.resolve(createSettings());
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
