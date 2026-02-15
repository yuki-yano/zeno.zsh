import { assertEquals, assertExists, assertStrictEquals } from "../deps.ts";
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
      template: undefined,
      dir: undefined,
      completionCallback: undefined,
      completionPreview: undefined,
    });
  });

  await t.step("parses completionCallback input fields", () => {
    const result = parseArgs([
      "--zeno-mode=completion-callback",
      "--input.lbuffer=left",
      "--input.rbuffer=right",
      "--input.completionCallback.sourceId=u0001",
      "--input.completionCallback.selectedFile=/tmp/selected.bin",
      "--input.completionCallback.expectKey=alt-enter",
    ]);

    assertEquals(result.mode, "completion-callback");
    assertEquals(result.input.lbuffer, "left");
    assertEquals(result.input.rbuffer, "right");
    assertEquals(result.input.completionCallback, {
      sourceId: "u0001",
      selectedFile: "/tmp/selected.bin",
      expectKey: "alt-enter",
    });
  });

  await t.step("parses completionPreview input fields", () => {
    const result = parseArgs([
      "--zeno-mode=completion-preview",
      "--input.lbuffer=left",
      "--input.rbuffer=right",
      "--input.completionPreview.sourceId=u0001",
      "--input.completionPreview.item=alpha beta",
    ]);

    assertEquals(result.mode, "completion-preview");
    assertEquals(result.input.lbuffer, "left");
    assertEquals(result.input.rbuffer, "right");
    assertEquals(result.input.completionPreview, {
      sourceId: "u0001",
      item: "alpha beta",
    });
  });

  await t.step("parses history log positional command", () => {
    const result = parseArgs([
      "history",
      "log",
      "--cmd",
      "echo hi",
      "--exit",
      "0",
      "--ts",
      "2024-01-02T03:04:05.000Z",
    ]);

    assertEquals(result.mode, "history-log");
    const historyLog = (result.input as Record<string, unknown>).historyLog as
      | Record<string, unknown>
      | undefined;
    assertExists(historyLog);
    assertEquals(historyLog?.command, "echo hi");
    assertEquals(historyLog?.ts, "2024-01-02T03:04:05.000Z");
  });

  await t.step("parses history query positional command", () => {
    const result = parseArgs([
      "history",
      "query",
      "--scope",
      "repository",
      "--format",
      "lines",
      "--limit",
      "100",
      "--toggle-scope",
    ]);

    assertEquals(result.mode, "history-query");
    const historyQuery = (result.input as Record<string, unknown>)
      .historyQuery as
        | Record<string, unknown>
        | undefined;
    assertExists(historyQuery);
    assertEquals(historyQuery?.scope, "repository");
    assertEquals(historyQuery?.format, "lines");
    assertEquals(historyQuery?.limit, "100");
    assertStrictEquals(historyQuery?.toggleScope, true);
  });

  await t.step("parses history delete positional command", () => {
    const result = parseArgs([
      "history",
      "delete",
      "--id",
      "01DELETE000000000000000000",
      "--hard",
    ]);

    assertEquals(result.mode, "history-delete");
    const historyDelete = (result.input as Record<string, unknown>)
      .historyDelete as
        | Record<string, unknown>
        | undefined;
    assertExists(historyDelete);
    assertEquals(historyDelete?.id, "01DELETE000000000000000000");
    assertStrictEquals(historyDelete?.hard, true);
  });

  await t.step("parses history export positional command", () => {
    const result = parseArgs([
      "history",
      "export",
      "--format",
      "ndjson",
      "--out",
      "/tmp/out.ndjson",
      "--scope",
      "global",
    ]);

    assertEquals(result.mode, "history-export");
    const historyExport = (result.input as Record<string, unknown>)
      .historyExport as
        | Record<string, unknown>
        | undefined;
    assertExists(historyExport);
    assertEquals(historyExport?.format, "ndjson");
    assertEquals(historyExport?.outputPath, "/tmp/out.ndjson");
  });

  await t.step("parses history import positional command", () => {
    const result = parseArgs([
      "history",
      "import",
      "--format",
      "ndjson",
      "--in",
      "/tmp/in.ndjson",
      "--dedupe",
      "off",
      "--dry-run",
    ]);

    assertEquals(result.mode, "history-import");
    const historyImport = (result.input as Record<string, unknown>)
      .historyImport as
        | Record<string, unknown>
        | undefined;
    assertExists(historyImport);
    assertEquals(historyImport?.format, "ndjson");
    assertEquals(historyImport?.inputPath, "/tmp/in.ndjson");
    assertStrictEquals(historyImport?.dryRun, true);
  });

  await t.step("parses history fzf-config positional command", () => {
    const result = parseArgs([
      "history",
      "fzf-config",
    ]);

    assertEquals(result.mode, "history-fzf-config");
    const historyFzfConfig = (result.input as Record<string, unknown>)
      .historyFzfConfig as
        | Record<string, unknown>
        | undefined;
    assertExists(historyFzfConfig);
    assertEquals(historyFzfConfig, {});
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
