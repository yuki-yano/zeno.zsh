import { assertEquals } from "../deps.ts";
import {
  createCommandExecutor,
  parseArgs,
} from "../../src/command/executor.ts";
import { createCommandRegistry } from "../../src/command/registry.ts";
import { createCommand } from "../../src/command/types.ts";

Deno.test("parseArgs", async (t) => {
  await t.step("parses mode correctly", () => {
    const result = parseArgs(["--zeno-mode=test"]);
    assertEquals(result.mode, "test");
  });

  await t.step("parses input fields correctly", () => {
    const result = parseArgs([
      "--zeno-mode=test",
      "--input.lbuffer=left",
      "--input.rbuffer=right",
      "--input.snippet=snip",
      "--input.dir=/tmp",
    ]);
    assertEquals(result.mode, "test");
    assertEquals(result.input.lbuffer, "left");
    assertEquals(result.input.rbuffer, "right");
    assertEquals(result.input.snippet, "snip");
    assertEquals(result.input.dir, "/tmp");
  });

  await t.step("handles missing input fields", () => {
    const result = parseArgs(["--zeno-mode=test"]);
    assertEquals(result.input.lbuffer, undefined);
    assertEquals(result.input.rbuffer, undefined);
    assertEquals(result.input.snippet, undefined);
    assertEquals(result.input.dir, undefined);
  });

  await t.step("ignores non-string input fields", () => {
    const result = parseArgs([
      "--zeno-mode=test",
      "--input.lbuffer=123", // Will be parsed as string
      "--input.invalid=true", // Will be ignored
    ]);
    assertEquals(result.input.lbuffer, "123");
  });

  await t.step("handles empty args", () => {
    const result = parseArgs([]);
    assertEquals(result.mode, "");
    assertEquals(result.input, {
      lbuffer: undefined,
      rbuffer: undefined,
      snippet: undefined,
      dir: undefined,
    });
  });
});

Deno.test("createCommandExecutor", async (t) => {
  await t.step("executes registered command", async () => {
    const registry = createCommandRegistry();
    const executor = createCommandExecutor(registry);

    // Track execution
    let executed = false;
    const testCommand = createCommand("test", async ({ writer }) => {
      executed = true;
      await writer.write({ format: "%s\n", text: "test output" });
    });

    registry.register(testCommand);

    // Create mock writer
    const output: string[] = [];
    const mockWriter = {
      write: ({ text }: { format: string; text: string }) => {
        output.push(text);
        return Promise.resolve();
      },
    };

    await executor({
      mode: "test",
      input: {},
      writer: mockWriter,
    });

    assertEquals(executed, true);
    assertEquals(output.includes("test output"), true);
  });

  await t.step("handles non-existent command", async () => {
    const registry = createCommandRegistry();
    const executor = createCommandExecutor(registry);

    const output: string[] = [];
    const mockWriter = {
      write: ({ text }: { format: string; text: string }) => {
        output.push(text);
        return Promise.resolve();
      },
    };

    await executor({
      mode: "non-existent",
      input: {},
      writer: mockWriter,
    });

    assertEquals(output.includes("failure"), true);
    // Check that failure is written and error message includes the mode name
    assertEquals(output[0], "failure");
    assertEquals(output[1], "non-existent");
  });

  await t.step("passes input to command correctly", async () => {
    const registry = createCommandRegistry();
    const executor = createCommandExecutor(registry);

    let receivedInput: Record<string, unknown> | undefined;
    const testCommand = createCommand(
      "test-input",
      async ({ input, writer }) => {
        receivedInput = input;
        await writer.write({ format: "%s\n", text: "ok" });
      },
    );

    registry.register(testCommand);

    const mockWriter = {
      write: () => Promise.resolve(),
    };

    const testInput = {
      lbuffer: "left",
      rbuffer: "right",
      snippet: "test",
      dir: "/home",
    };

    await executor({
      mode: "test-input",
      input: testInput,
      writer: mockWriter,
    });

    assertEquals(receivedInput!, testInput);
  });
});
