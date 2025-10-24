import { describe, it } from "../deps.ts";
import { assertEquals, assertStrictEquals } from "../deps.ts";
import { createHistoryLogCommand } from "../../src/history/log-command.ts";
import type { LogCommandInput } from "../../src/history/types.ts";

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

const createHistorySettings = () => ({
  defaultScope: "global" as const,
  redact: [/secret/g],
  keymap: {
    deleteSoft: "ctrl-d",
    deleteHard: "alt-d",
    toggleScope: "ctrl-r",
  },
  fzfCommand: undefined,
  fzfOptions: undefined,
});

describe("history log command", () => {
  it("fails when historyLog payload is absent", async () => {
    const command = createHistoryLogCommand({
      getHistoryModule() {
        return Promise.reject(new Error("should not be called"));
      },
      loadHistorySettings() {
        return Promise.resolve(createHistorySettings());
      },
      generateId: () => "01TESTID000000000000000000",
      now: () => "2024-01-01T00:00:00.000Z",
    });

    const { writer, lines } = createWriter();

    await command.execute({
      input: {},
      writer,
    });

    assertStrictEquals(lines[0], "failure");
    assertEquals(lines[1], "historyLog payload is required");
  });

  it("invokes module with parsed payload and reports success", async () => {
    const captured: LogCommandInput[] = [];
    const command = createHistoryLogCommand({
      getHistoryModule() {
        return Promise.resolve({
          logCommand(payload) {
            captured.push(payload);
            return Promise.resolve({ ok: true as const, value: undefined });
          },
          setRedactPatterns() {},
          queryHistory() {
            return Promise.resolve({ ok: true as const, value: { items: [] } });
          },
          deleteHistory() {
            return Promise.resolve({ ok: true as const, value: undefined });
          },
          exportHistory() {
            return Promise.resolve({ ok: true as const, value: undefined });
          },
          importHistory() {
            return Promise.resolve({
              ok: true as const,
              value: { added: 0, skipped: 0, total: 0 },
            });
          },
        });
      },
      loadHistorySettings() {
        return Promise.resolve(createHistorySettings());
      },
      generateId: () => "01TESTID000000000000000000",
      now: () => "2024-01-01T00:00:00.000Z",
    });

    const { writer, lines } = createWriter();

    await command.execute({
      input: {
        historyLog: {
          command: "echo hello",
          exit: 0,
          pwd: "/tmp/project",
          session: "session-123",
          host: "localhost",
          user: "user",
          shell: "zsh",
          ts: "2024-01-02T03:04:05.000Z",
          durationMs: 150,
          meta: { rawCommand: "echo hello" },
        },
      },
      writer,
    });

    assertStrictEquals(lines[0], "success");
    assertEquals(captured.length, 1);
    assertEquals(captured[0].id, "01TESTID000000000000000000");
    assertEquals(captured[0].command, "echo hello");
    assertEquals(captured[0].duration_ms, 150);
    assertEquals(captured[0].repo_root, null);
  });

  it("reports failure when module returns an error", async () => {
    const command = createHistoryLogCommand({
      getHistoryModule() {
        return Promise.resolve({
          logCommand() {
            return Promise.resolve({
              ok: false as const,
              error: {
                type: "io" as const,
                message: "failed to write database",
              },
            });
          },
          setRedactPatterns() {},
          queryHistory() {
            return Promise.resolve({ ok: true as const, value: { items: [] } });
          },
          deleteHistory() {
            return Promise.resolve({ ok: true as const, value: undefined });
          },
          exportHistory() {
            return Promise.resolve({ ok: true as const, value: undefined });
          },
          importHistory() {
            return Promise.resolve({
              ok: true as const,
              value: { added: 0, skipped: 0, total: 0 },
            });
          },
        });
      },
      loadHistorySettings() {
        return Promise.resolve(createHistorySettings());
      },
      generateId: () => "01TESTID000000000000000000",
      now: () => "2024-01-01T00:00:00.000Z",
    });

    const { writer, lines } = createWriter();

    await command.execute({
      input: {
        historyLog: {
          command: "echo err",
          exit: 1,
        },
      },
      writer,
    });

    assertStrictEquals(lines[0], "failure");
    assertEquals(lines[1], "failed to write database");
  });
});
