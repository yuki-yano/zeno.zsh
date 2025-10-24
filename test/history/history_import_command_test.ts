import { describe, it } from "../deps.ts";
import { assertEquals, assertStrictEquals } from "../deps.ts";
import { createHistoryImportCommand } from "../../src/history/import-command.ts";
import type { ImportRequest } from "../../src/history/types.ts";

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

describe("history import command", () => {
  it("fails when historyImport payload is missing", async () => {
    const command = createHistoryImportCommand({
      getHistoryModule() {
        return Promise.reject(new Error("should not be called"));
      },
      loadHistorySettings() {
        return Promise.resolve(createSettings());
      },
    });

    const { writer, lines } = createWriter();

    await command.execute({
      input: {},
      writer,
    });

    assertStrictEquals(lines[0], "failure");
    assertEquals(lines[1], "historyImport payload is required");
  });

  it("invokes module with provided options", async () => {
    const calls: ImportRequest[] = [];
    const command = createHistoryImportCommand({
      getHistoryModule() {
        return Promise.resolve({
          setRedactPatterns() {},
          importHistory(request) {
            calls.push(request);
            return Promise.resolve({
              ok: true as const,
              value: {
                added: 1,
                skipped: 0,
                total: 1,
              },
            });
          },
        });
      },
      loadHistorySettings() {
        return Promise.resolve(createSettings());
      },
    });

    const { writer, lines } = createWriter();

    await command.execute({
      input: {
        historyImport: {
          format: "ndjson",
          inputPath: "/tmp/in.ndjson",
          dedupe: "off",
          dryRun: false,
        },
      },
      writer,
    });

    assertStrictEquals(lines[0], "success");
    assertEquals(lines[1], "added=1 skipped=0 total=1");
    assertEquals(calls.length, 1);
    assertEquals(calls[0].format, "ndjson");
    assertEquals(calls[0].inputPath, "/tmp/in.ndjson");
  });
});
