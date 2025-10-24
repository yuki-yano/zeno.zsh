import { describe, it } from "../deps.ts";
import { assertEquals, assertStrictEquals } from "../deps.ts";
import { createHistoryDeleteCommand } from "../../src/history/delete-command.ts";

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

describe("history delete command", () => {
  it("fails when historyDelete payload is missing", async () => {
    const command = createHistoryDeleteCommand({
      async getHistoryModule() {
        throw new Error("should not be called");
      },
    });

    const { writer, lines } = createWriter();

    await command.execute({
      input: {},
      writer,
    });

    assertStrictEquals(lines[0], "failure");
    assertEquals(lines[1], "historyDelete payload is required");
  });

  it("invokes module with provided id", async () => {
    const calls: Array<{ id: string; hard: boolean }> = [];
    const command = createHistoryDeleteCommand({
      async getHistoryModule() {
        return {
          async deleteHistory(request) {
            calls.push(request);
            return { ok: true as const, value: undefined };
          },
        };
      },
    });

    const { writer, lines } = createWriter();

    await command.execute({
      input: {
        historyDelete: {
          id: "01TESTDELETE0000000000000000",
        },
      },
      writer,
    });

    assertStrictEquals(lines[0], "success");
    assertEquals(calls.length, 1);
    assertEquals(calls[0].id, "01TESTDELETE0000000000000000");
    assertEquals(calls[0].hard, false);
  });

  it("respects hard flag", async () => {
    let receivedHard = false;
    const command = createHistoryDeleteCommand({
      async getHistoryModule() {
        return {
          async deleteHistory(request) {
            receivedHard = request.hard;
            return { ok: true as const, value: undefined };
          },
        };
      },
    });

    const { writer } = createWriter();

    await command.execute({
      input: {
        historyDelete: {
          id: "01TESTDELETEHARD000000000000",
          hard: true,
        },
      },
      writer,
    });

    assertStrictEquals(receivedHard, true);
  });
});
