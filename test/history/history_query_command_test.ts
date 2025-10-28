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

const NBSP = "\u00a0";

const splitSmartLine = (line: string) => line.split(NBSP);

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
    const originalHome = Deno.env.get("HOME");
    try {
      Deno.env.set("HOME", "/repo");

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
      const parts1 = splitSmartLine(lines[1]);
      const parts2 = splitSmartLine(lines[2]);
      assertEquals(parts1.length, 7);
      assertEquals(parts2.length, 7);
      assertEquals(parts1[0], "01HISTORYA00000000000000000");
      assertStringIncludes(parts1[1], "5m");
      assertStringIncludes(parts1[2], "✔");
      assertEquals(parts1[3], "  git status");
      assertStringIncludes(parts1[4], "~/app");
      assertEquals(parts1[5], "");
      assertEquals(parts1[6], "git status");
      assertEquals(parts2[0], "01HISTORYB00000000000000000");
      assertStringIncludes(parts2[1], "1h");
      assertStringIncludes(parts2[2], "✘");
      assertEquals(parts2[3], "  npm test");
      assertStringIncludes(parts2[4], "~/app");
      assertStringIncludes(parts2[5], "1.2s");
      assertStringIncludes(parts2[5], "\u001b[33m");
      assertEquals(parts2[6], "npm test");
    } finally {
      if (originalHome === undefined) {
        Deno.env.delete("HOME");
      } else {
        Deno.env.set("HOME", originalHome);
      }
    }
  });

  it("prints canonical lines when format is omitted", async () => {
    const originalHome = Deno.env.get("HOME");
    try {
      Deno.env.set("HOME", "/repo");

      const module = createModule({
        queryHistory() {
          return Promise.resolve({
            ok: true as const,
            value: {
              items: [
                {
                  id: "01HISTORYA00000000000000000",
                  command: "git status",
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
                },
                {
                  id: "01HISTORYB00000000000000000",
                  command: "npm test",
                  ts: "2024-01-01T23:58:30.000Z",
                  exit: 1,
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
          },
        },
        writer,
      });

      assertStrictEquals(lines[0], "success");
      assertEquals(lines.length, 3);
      const first = splitSmartLine(lines[1]);
      const second = splitSmartLine(lines[2]);
      assertEquals(first.length, 7);
      assertEquals(second.length, 7);
      assertEquals(first[0], "01HISTORYA00000000000000000");
      assertStringIncludes(first[1], "5m");
      assertStringIncludes(first[2], "✔");
      assertEquals(first[3], "  git status");
      assertStringIncludes(first[4], "~/app");
      assertEquals(first[5], "");
      assertEquals(first[6], "git status");
      assertEquals(second[0], "01HISTORYB00000000000000000");
      assertStringIncludes(second[1], "6m");
      assertStringIncludes(second[2], "✘");
      assertEquals(second[3], "  npm test");
      assertStringIncludes(second[4], "~/app");
      assertEquals(second[5], "");
      assertEquals(second[6], "npm test");
    } finally {
      if (originalHome === undefined) {
        Deno.env.delete("HOME");
      } else {
        Deno.env.set("HOME", originalHome);
      }
    }
  });

  it("prints formatted lines for all scopes when scope is all", async () => {
    const originalHome = Deno.env.get("HOME");
    try {
      Deno.env.set("HOME", "/repo");

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
      const globalLine = lines.find((line) => line.includes("[global]"));
      const repoLine = lines.find((line) => line.includes("[repository]"));
      assertEquals(globalLine !== undefined, true);
      assertEquals(repoLine !== undefined, true);
      const globalParts = splitSmartLine(globalLine ?? "");
      const repoParts = splitSmartLine(repoLine ?? "");
      assertEquals(globalParts.length, 7);
      assertEquals(repoParts.length, 7);
      assertEquals(globalParts[0], "01GLOBAL0000000000000000000");
      assertStringIncludes(globalParts[1], "[global]");
      assertStringIncludes(globalParts[2], "✔");
      assertStringIncludes(globalParts[3], "git status");
      assertStringIncludes(globalParts[4], "~/app");
      assertEquals(globalParts[5], "");
      assertEquals(globalParts[6], "git status");
      assertEquals(repoParts[0], "01REPO00000000000000000000");
      assertStringIncludes(repoParts[1], "[repository]");
      assertStringIncludes(repoParts[2], "✔");
      assertStringIncludes(repoParts[3], "npm test");
      assertStringIncludes(repoParts[4], "~/app");
      assertEquals(repoParts[5], "");
      assertEquals(repoParts[6], "npm test");
    } finally {
      if (originalHome === undefined) {
        Deno.env.delete("HOME");
      } else {
        Deno.env.set("HOME", originalHome);
      }
    }
  });

  it("prints canonical lines for all scopes when format is omitted", async () => {
    const originalHome = Deno.env.get("HOME");
    try {
      Deno.env.set("HOME", "/repo");

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
          },
        },
        writer,
      });

      assertStrictEquals(lines[0], "success");
      assertEquals(calls, ["global", "repository", "directory", "session"]);
      const globalLine = lines.find((line) => line.includes("[global]"));
      const repositoryLine = lines.find((line) => line.includes("[repository]"));
      assertEquals(globalLine !== undefined, true);
      assertEquals(repositoryLine !== undefined, true);
      assertStringIncludes(globalLine ?? "", "01GLOBAL0000000000000000000");
      assertStringIncludes(repositoryLine ?? "", "01REPO00000000000000000000");
      const hasScopeMeta = lines.some((line) => line.includes("scope:"));
      assertStrictEquals(hasScopeMeta, false);
      const globalParts = splitSmartLine(globalLine ?? "");
      const repoParts = splitSmartLine(repositoryLine ?? "");
      assertEquals(globalParts.length, 7);
      assertEquals(repoParts.length, 7);
      assertEquals(globalParts[6], "git status");
      assertEquals(repoParts[6], "npm test");
      const directoryLine = lines.find((line) => line.includes("[directory]"));
      const sessionLine = lines.find((line) => line.includes("[session]"));
      assertStrictEquals(directoryLine, undefined);
      assertStrictEquals(sessionLine, undefined);
    } finally {
      if (originalHome === undefined) {
        Deno.env.delete("HOME");
      } else {
        Deno.env.set("HOME", originalHome);
      }
    }
  });

  it("fails when settings include invalid redact patterns", async () => {
    const module = createModule();
    const command = createHistoryQueryCommand({
      getHistoryModule() {
        return Promise.resolve(module);
      },
      loadHistorySettings() {
        return Promise.resolve({
          ...createSettings(),
          redact: ["[unclosed"],
        });
      },
      now: () => new Date("2024-01-02T00:00:00.000Z"),
    });

    const { writer, lines } = createWriter();

    await command.execute({
      input: {
        historyQuery: {
          scope: "global",
        },
      },
      writer,
    });

    assertStrictEquals(lines[0], "failure");
    assertStringIncludes(lines[1], "invalid redact pattern");
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
