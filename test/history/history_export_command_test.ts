import { describe, it } from "../deps.ts";
import { assertEquals, assertStrictEquals } from "../deps.ts";
import { createHistoryExportCommand } from "../../src/history/export-command.ts";
import type { ExportRequest } from "../../src/history/types.ts";

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
  redact: [/apiKey/],
  keymap: {
    deleteSoft: "ctrl-d",
    deleteHard: "alt-d",
    toggleScope: "ctrl-r",
  },
  fzfCommand: undefined,
  fzfOptions: undefined,
});

describe("history export command", () => {
  it("fails when historyExport payload is missing", async () => {
    const command = createHistoryExportCommand({
      async getHistoryModule() {
        throw new Error("should not be called");
      },
      async loadHistorySettings() {
        return createSettings();
      },
      now: () => new Date(),
    });

    const { writer, lines } = createWriter();

    await command.execute({
      input: {},
      writer,
    });

    assertStrictEquals(lines[0], "failure");
    assertEquals(lines[1], "historyExport payload is required");
  });

  it("invokes module with combined redact patterns", async () => {
    const patterns: RegExp[][] = [];
    const calls: ExportRequest[] = [];
    const command = createHistoryExportCommand({
      async getHistoryModule() {
        return {
          setRedactPatterns(next) {
            patterns.push(next);
          },
          async exportHistory(request) {
            calls.push(request);
            return { ok: true as const, value: undefined };
          },
        };
      },
      async loadHistorySettings() {
        return createSettings();
      },
      now: () => new Date("2024-01-05T00:00:00.000Z"),
    });

    const { writer, lines } = createWriter();

    await command.execute({
      input: {
        historyExport: {
          format: "ndjson",
          scope: "repository",
          cwd: "/repo/app",
          outputPath: "/tmp/out.ndjson",
          redact: ["token"],
        },
      },
      writer,
    });

    assertStrictEquals(lines[0], "success");
    assertEquals(patterns.length, 1);
    assertEquals(patterns[0].length, 2);
    assertEquals(String(patterns[0][0]), "/apiKey/");
    assertEquals(patterns[0][1].source, "token");
    assertEquals(calls[0]?.format, "ndjson");
    assertEquals(calls[0]?.scope, "repository");
  });
});
