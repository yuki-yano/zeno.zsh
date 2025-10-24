import { assertEquals, describe, it } from "../deps.ts";
import { createHistoryFzfConfigCommand } from "../../src/history/fzf-config-command.ts";
import { createCommandRegistry } from "../../src/command/registry.ts";

const createWriter = () => {
  const lines: string[] = [];
  return {
    lines,
    write: async ({ text }: { text: string }) => {
      lines.push(text);
    },
  };
};

describe("history-fzf-config command", () => {
  it("returns configured command and options", async () => {
    const command = createHistoryFzfConfigCommand({
      async loadHistorySettings() {
        return {
          defaultScope: "global",
          redact: [],
          keymap: {
            deleteSoft: "ctrl-d",
            deleteHard: "alt-d",
            toggleScope: "ctrl-r",
          },
          fzfCommand: "fzf-tmux",
          fzfOptions: ["-p", "80%"],
        };
      },
    });

    const registry = createCommandRegistry();
    registry.register(command);

    const writer = createWriter();
    await command.execute({
      input: {},
      writer,
      env: {},
      registry,
    });

    assertEquals(writer.lines, [
      "success",
      "fzf-tmux",
      "-p\t80%",
    ]);
  });

  it("handles missing values", async () => {
    const command = createHistoryFzfConfigCommand({
      async loadHistorySettings() {
        return {
          defaultScope: "global",
          redact: [],
          keymap: {
            deleteSoft: "ctrl-d",
            deleteHard: "alt-d",
            toggleScope: "ctrl-r",
          },
        };
      },
    });

    const registry = createCommandRegistry();
    registry.register(command);

    const writer = createWriter();
    await command.execute({
      input: {},
      writer,
      env: {},
      registry,
    });

    assertEquals(writer.lines, ["success", "", ""]);
  });

  it("reports errors", async () => {
    const command = createHistoryFzfConfigCommand({
      async loadHistorySettings() {
        throw new Error("boom");
      },
    });

    const registry = createCommandRegistry();
    registry.register(command);

    const writer = createWriter();
    await command.execute({
      input: {},
      writer,
      env: {},
      registry,
    });

    assertEquals(writer.lines.at(0), "failure");
    assertEquals(writer.lines.length, 2);
  });
});
