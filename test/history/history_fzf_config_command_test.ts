import { assertEquals, describe, it } from "../deps.ts";
import { createHistoryFzfConfigCommand } from "../../src/history/fzf-config-command.ts";

const createWriter = () => {
  const lines: string[] = [];
  return {
    lines,
    write: ({ text }: { text: string }) => {
      lines.push(text);
      return Promise.resolve();
    },
  };
};

describe("history-fzf-config command", () => {
  it("returns configured command and options", async () => {
    const command = createHistoryFzfConfigCommand({
      loadHistorySettings() {
        return Promise.resolve({
          defaultScope: "global",
          redact: [],
          keymap: {
            deleteSoft: "ctrl-d",
            deleteHard: "alt-d",
            toggleScope: "ctrl-r",
          },
          fzfCommand: "fzf-tmux",
          fzfOptions: ["-p", "80%"],
        });
      },
    });

    const writer = createWriter();
    await command.execute({
      input: {},
      writer,
    });

    assertEquals(writer.lines, [
      "success",
      "fzf-tmux",
      "-p\t80%",
    ]);
  });

  it("handles missing values", async () => {
    const command = createHistoryFzfConfigCommand({
      loadHistorySettings() {
        return Promise.resolve({
          defaultScope: "global",
          redact: [],
          keymap: {
            deleteSoft: "ctrl-d",
            deleteHard: "alt-d",
            toggleScope: "ctrl-r",
          },
        });
      },
    });

    const writer = createWriter();
    await command.execute({
      input: {},
      writer,
    });

    assertEquals(writer.lines, ["success", "", ""]);
  });

  it("reports errors", async () => {
    const command = createHistoryFzfConfigCommand({
      loadHistorySettings() {
        return Promise.reject(new Error("boom"));
      },
    });

    const writer = createWriter();
    await command.execute({
      input: {},
      writer,
    });

    assertEquals(writer.lines.at(0), "failure");
    assertEquals(writer.lines.length, 2);
  });
});
