import {
  afterEach,
  assertEquals,
  assertRejects,
  assertStringIncludes,
  beforeEach,
  describe,
  it,
} from "../deps.ts";
import { Helper, withHistoryDefaults } from "../helpers.ts";
import {
  applyCallbackFunctionCommand,
  completionCommand,
} from "../../src/command/commands/index.ts";
import { getCompletionSourceCache } from "../../src/completion/source/cache.ts";
import { loadCompletions } from "../../src/completion/settings.ts";
import { clearCache, setSettings } from "../../src/settings.ts";

const createWriter = (buffer: string[]) => ({
  write({ text }: { format: string; text: string }): Promise<void> {
    buffer.push(text);
    return Promise.resolve();
  },
});

describe("completionCommand with sourceFunction", () => {
  const helper = new Helper();

  beforeEach(() => {
    helper.saveEnvs();
    clearCache();
    getCompletionSourceCache().clear();
    Deno.env.set("ZENO_DISABLE_BUILTIN_COMPLETION", "1");
  });

  afterEach(() => {
    clearCache();
    getCompletionSourceCache().clear();
    helper.restoreAll();
  });

  it("evaluates sourceFunction and encodes newline separated results", async () => {
    const captured: string[] = [];
    setSettings(withHistoryDefaults({
      snippets: [],
      completions: [{
        name: "dynamic",
        patterns: ["^foo"],
        sourceFunction: (context) => {
          captured.push(context.currentDirectory);
          return ["alpha", "beta"];
        },
      }],
    }));

    const output: string[] = [];
    await completionCommand.execute({
      input: {
        lbuffer: "foo",
        rbuffer: "",
        snippet: undefined,
        dir: undefined,
      },
      writer: createWriter(output),
    });

    assertEquals(output[0], "success");
    assertEquals(output[1], "printf '%s\\n' 'alpha' 'beta'");
    assertEquals(captured.length, 1);
    assertEquals(captured[0], Deno.cwd());
  });

  it("uses null separated encoding when --read0 is specified", async () => {
    const invoked: number[] = [];
    setSettings(withHistoryDefaults({
      snippets: [],
      completions: [{
        name: "dynamic",
        patterns: ["^bar"],
        sourceFunction: (_context) => {
          invoked.push(1);
          return ["one", "two"];
        },
        options: { "--read0": true },
      }],
    }));

    const output: string[] = [];
    await completionCommand.execute({
      input: {
        lbuffer: "bar",
        rbuffer: "",
        snippet: undefined,
        dir: undefined,
      },
      writer: createWriter(output),
    });

    assertEquals(output[0], "success");
    assertEquals(output[1], "printf '%s\\0' 'one' 'two'");
    assertEquals(invoked.length, 1);
  });

  it("quotes candidates with spaces and single quotes", async () => {
    setSettings(withHistoryDefaults({
      snippets: [],
      completions: [{
        name: "quote",
        patterns: ["^q"],
        sourceFunction: (_context) => ["O'Reilly", "spaced name"],
      }],
    }));

    const output: string[] = [];
    await completionCommand.execute({
      input: {
        lbuffer: "q",
        rbuffer: "",
        snippet: undefined,
        dir: undefined,
      },
      writer: createWriter(output),
    });

    assertEquals(output[0], "success");
    const expected = "printf '%s\\n' 'O'\"'\"'Reilly' 'spaced name'";
    assertEquals(output[1], expected);
  });

  it("encodes empty result as printf ''", async () => {
    setSettings(withHistoryDefaults({
      snippets: [],
      completions: [{
        name: "empty",
        patterns: ["^e"],
        sourceFunction: (_context) => [],
      }],
    }));

    const output: string[] = [];
    await completionCommand.execute({
      input: {
        lbuffer: "e",
        rbuffer: "",
        snippet: undefined,
        dir: undefined,
      },
      writer: createWriter(output),
    });

    assertEquals(output[0], "success");
    assertEquals(output[1], "printf ''");
  });

  it("supports async sourceFunction", async () => {
    setSettings(withHistoryDefaults({
      snippets: [],
      completions: [{
        name: "async",
        patterns: ["^a"],
        sourceFunction: (_context) => Promise.resolve(["async-value"]),
      }],
    }));

    const output: string[] = [];
    await completionCommand.execute({
      input: {
        lbuffer: "a",
        rbuffer: "",
        snippet: undefined,
        dir: undefined,
      },
      writer: createWriter(output),
    });

    assertEquals(output[0], "success");
    assertEquals(output[1], "printf '%s\\n' 'async-value'");
  });

  it("returns failure when sourceFunction throws", async () => {
    setSettings(withHistoryDefaults({
      snippets: [],
      completions: [{
        name: "dynamic",
        patterns: ["^err"],
        sourceFunction: () => {
          throw new Error("boom");
        },
      }],
    }));

    const output: string[] = [];
    await completionCommand.execute({
      input: {
        lbuffer: "err",
        rbuffer: "",
        snippet: undefined,
        dir: undefined,
      },
      writer: createWriter(output),
    });

    assertEquals(output[0], "failure");
    assertEquals(output.length, 1);
  });

  it("returns callback function marker when callbackFunction is defined", async () => {
    setSettings(withHistoryDefaults({
      snippets: [],
      completions: [{
        name: "with-callback-fn",
        patterns: ["^cb"],
        sourceFunction: () => ["item1", "item2"],
        callbackFunction: (items) => items.map((item) => item.toUpperCase()),
      }],
    }));

    const output: string[] = [];
    await completionCommand.execute({
      input: {
        lbuffer: "cb",
        rbuffer: "",
        snippet: undefined,
        dir: undefined,
      },
      writer: createWriter(output),
    });

    assertEquals(output[0], "success");
    assertEquals(output[1], "printf '%s\\n' 'item1' 'item2'");
    // Check that callback contains the marker with an ID
    assertStringIncludes(output[2], "__CALLBACK_FUNCTION__:");
  });
});

describe("applyCallbackFunctionCommand", () => {
  const helper = new Helper();

  beforeEach(() => {
    helper.saveEnvs();
    clearCache();
    getCompletionSourceCache().clear();
  });

  afterEach(() => {
    clearCache();
    getCompletionSourceCache().clear();
    helper.restoreAll();
  });

  it("applies callbackFunction to selected items", async () => {
    // First, create a completion with callbackFunction to get the ID
    setSettings(withHistoryDefaults({
      snippets: [],
      completions: [{
        name: "test-callback",
        patterns: ["^test"],
        sourceFunction: () => ["apple", "banana", "cherry"],
        callbackFunction: (items) => items.map((item) => item.toUpperCase()),
      }],
    }));

    const completionOutput: string[] = [];
    await completionCommand.execute({
      input: {
        lbuffer: "test",
        rbuffer: "",
        snippet: undefined,
        dir: undefined,
      },
      writer: createWriter(completionOutput),
    });

    // Extract callback ID from the marker
    const callbackMarker = completionOutput[2];
    const callbackId = callbackMarker.replace("__CALLBACK_FUNCTION__:", "");

    // Now test applyCallbackFunctionCommand
    const items = ["apple", "banana"];
    const output: string[] = [];
    await applyCallbackFunctionCommand.execute({
      input: {
        callbackId,
        items: JSON.stringify(items),
        zero: "false",
      },
      writer: createWriter(output),
    });

    assertEquals(output[0], "success");
    assertEquals(output[1], "APPLE\n");
    assertEquals(output[2], "BANANA\n");
  });

  it("uses null separator when zero is true", async () => {
    setSettings(withHistoryDefaults({
      snippets: [],
      completions: [{
        name: "test-zero",
        patterns: ["^test"],
        sourceFunction: () => ["file1.txt", "file2.txt"],
        callbackFunction: (items) => items.map((item) => `path/to/${item}`),
        callbackZero: true,
      }],
    }));

    const completionOutput: string[] = [];
    await completionCommand.execute({
      input: {
        lbuffer: "test",
        rbuffer: "",
        snippet: undefined,
        dir: undefined,
      },
      writer: createWriter(completionOutput),
    });

    const callbackMarker = completionOutput[2];
    const callbackId = callbackMarker.replace("__CALLBACK_FUNCTION__:", "");

    const items = ["file1.txt"];
    const output: string[] = [];
    await applyCallbackFunctionCommand.execute({
      input: {
        callbackId,
        items: JSON.stringify(items),
        zero: "true",
      },
      writer: createWriter(output),
    });

    assertEquals(output[0], "success");
    assertEquals(output[1], "path/to/file1.txt\0");
  });

  it("supports async callbackFunction", async () => {
    setSettings(withHistoryDefaults({
      snippets: [],
      completions: [{
        name: "test-async",
        patterns: ["^async"],
        sourceFunction: () => ["a", "b"],
        callbackFunction: async (items) => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return items.map((item) => `processed-${item}`);
        },
      }],
    }));

    const completionOutput: string[] = [];
    await completionCommand.execute({
      input: {
        lbuffer: "async",
        rbuffer: "",
        snippet: undefined,
        dir: undefined,
      },
      writer: createWriter(completionOutput),
    });

    const callbackMarker = completionOutput[2];
    const callbackId = callbackMarker.replace("__CALLBACK_FUNCTION__:", "");

    const items = ["x", "y"];
    const output: string[] = [];
    await applyCallbackFunctionCommand.execute({
      input: {
        callbackId,
        items: JSON.stringify(items),
        zero: "false",
      },
      writer: createWriter(output),
    });

    assertEquals(output[0], "success");
    assertEquals(output[1], "processed-x\n");
    assertEquals(output[2], "processed-y\n");
  });

  it("returns failure when callback ID is not found", async () => {
    const output: string[] = [];
    await applyCallbackFunctionCommand.execute({
      input: {
        callbackId: "invalid-id",
        items: JSON.stringify(["item"]),
        zero: "false",
      },
      writer: createWriter(output),
    });

    assertEquals(output[0], "failure");
    assertEquals(output.length, 1);
  });
});

describe("callbackFunction validation", () => {
  const helper = new Helper();

  beforeEach(() => {
    helper.saveEnvs();
    clearCache();
    getCompletionSourceCache().clear();
    Deno.env.set("ZENO_DISABLE_BUILTIN_COMPLETION", "1");
  });

  afterEach(() => {
    clearCache();
    getCompletionSourceCache().clear();
    helper.restoreAll();
  });

  it("throws error when both callback and callbackFunction are defined", async () => {
    setSettings(withHistoryDefaults({
      snippets: [],
      completions: [{
        name: "invalid-completion",
        patterns: ["^test"],
        sourceFunction: () => ["item1", "item2"],
        callback: "awk '{print $1}'",
        callbackFunction: (items) => items.map((item) => item.toUpperCase()),
      }],
    }));

    await assertRejects(
      async () => {
        await loadCompletions();
      },
      Error,
      'cannot use both "callback" and "callbackFunction"',
    );
  });

  it("allows callback without callbackFunction", async () => {
    setSettings(withHistoryDefaults({
      snippets: [],
      completions: [{
        name: "valid-with-callback",
        patterns: ["^test"],
        sourceFunction: () => ["item1", "item2"],
        callback: "awk '{print $1}'",
      }],
    }));

    const completions = await loadCompletions();
    assertEquals(completions.length, 1);
    assertEquals(completions[0].callback, "awk '{print $1}'");
  });

  it("allows callbackFunction without callback", async () => {
    setSettings(withHistoryDefaults({
      snippets: [],
      completions: [{
        name: "valid-with-callback-fn",
        patterns: ["^test"],
        sourceFunction: () => ["item1", "item2"],
        callbackFunction: (items) => items.map((item) => item.toUpperCase()),
      }],
    }));

    const completions = await loadCompletions();
    assertEquals(completions.length, 1);
    assertEquals(typeof completions[0].callbackFunction, "function");
  });

  it("allows neither callback nor callbackFunction", async () => {
    setSettings(withHistoryDefaults({
      snippets: [],
      completions: [{
        name: "valid-without-callbacks",
        patterns: ["^test"],
        sourceFunction: () => ["item1", "item2"],
      }],
    }));

    const completions = await loadCompletions();
    assertEquals(completions.length, 1);
    assertEquals(completions[0].callback, undefined);
    assertEquals(completions[0].callbackFunction, undefined);
  });
});
