import { afterEach, assertEquals, beforeEach, describe, it } from "../deps.ts";
import { Helper, withHistoryDefaults } from "../helpers.ts";
import { completionCallbackCommand } from "../../src/command/commands/index.ts";
import { getCompletionSourceCache } from "../../src/completion/source/cache.ts";
import { clearCache, setSettings } from "../../src/settings.ts";

const createWriter = (buffer: string[]) => ({
  write({ text }: { format: string; text: string }): Promise<void> {
    buffer.push(text);
    return Promise.resolve();
  },
});

const writeSelectedFile = async (
  values: readonly string[],
): Promise<string> => {
  const file = await Deno.makeTempFile({ prefix: "zeno-selected-" });
  const payload = values.length > 0 ? `${values.join("\0")}\0` : "";
  await Deno.writeFile(file, new TextEncoder().encode(payload));
  return file;
};

describe("completionCallbackCommand", () => {
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

  it("executes callbackFunction with selected values restored from null-separated file", async () => {
    const selectedFile = await writeSelectedFile(["alpha", "beta"]);
    const calls: Array<{
      selected: readonly string[];
      expectKey?: string;
      lbuffer: string;
      rbuffer: string;
    }> = [];

    try {
      setSettings(withHistoryDefaults({
        snippets: [],
        completions: [{
          name: "callback",
          patterns: ["^cb"],
          sourceCommand: "printf ''",
          callbackFunction: ({ selected, expectKey, lbuffer, rbuffer }) => {
            calls.push({ selected, expectKey, lbuffer, rbuffer });
            return selected.map((item) => item.toUpperCase());
          },
        }],
      }));

      const output: string[] = [];
      await completionCallbackCommand.execute({
        input: {
          lbuffer: "cb ",
          rbuffer: "",
          completionCallback: {
            sourceId: "u0001",
            selectedFile,
            expectKey: "alt-enter",
          },
        },
        writer: createWriter(output),
      });

      assertEquals(output[0], "success");
      assertEquals(output[1], "printf '%s\\0' 'ALPHA' 'BETA'");
      assertEquals(calls.length, 1);
      assertEquals(calls[0], {
        selected: ["alpha", "beta"],
        expectKey: "alt-enter",
        lbuffer: "cb ",
        rbuffer: "",
      });
    } finally {
      await Deno.remove(selectedFile).catch(() => undefined);
    }
  });

  it("returns failure when sourceId does not match", async () => {
    const selectedFile = await writeSelectedFile(["alpha"]);
    let callbackCalled = false;

    try {
      setSettings(withHistoryDefaults({
        snippets: [],
        completions: [{
          name: "callback",
          patterns: ["^cb"],
          sourceCommand: "printf ''",
          callbackFunction: ({ selected }) => {
            callbackCalled = true;
            return selected;
          },
        }],
      }));

      const output: string[] = [];
      await completionCallbackCommand.execute({
        input: {
          completionCallback: {
            sourceId: "u9999",
            selectedFile,
          },
        },
        writer: createWriter(output),
      });

      assertEquals(output[0], "failure");
      assertEquals(callbackCalled, false);
    } finally {
      await Deno.remove(selectedFile).catch(() => undefined);
    }
  });

  it("returns failure when sourceId contains invalid characters", async () => {
    const selectedFile = await writeSelectedFile(["alpha"]);

    try {
      setSettings(withHistoryDefaults({
        snippets: [],
        completions: [{
          name: "callback",
          patterns: ["^cb"],
          sourceCommand: "printf ''",
          callbackFunction: ({ selected }) => selected,
        }],
      }));

      const output: string[] = [];
      await completionCallbackCommand.execute({
        input: {
          completionCallback: {
            sourceId: "u0001\nbad",
            selectedFile,
          },
        },
        writer: createWriter(output),
      });

      assertEquals(output[0], "failure");
    } finally {
      await Deno.remove(selectedFile).catch(() => undefined);
    }
  });

  it("returns failure when completionCallback input is missing", async () => {
    const output: string[] = [];
    await completionCallbackCommand.execute({
      input: {},
      writer: createWriter(output),
    });

    assertEquals(output[0], "failure");
  });

  it("returns failure when selectedFile is missing", async () => {
    setSettings(withHistoryDefaults({
      snippets: [],
      completions: [{
        name: "callback",
        patterns: ["^cb"],
        sourceCommand: "printf ''",
      }],
    }));

    const output: string[] = [];
    await completionCallbackCommand.execute({
      input: {
        completionCallback: {
          sourceId: "u0001",
          selectedFile: "/tmp/not-found-file",
        },
      },
      writer: createWriter(output),
    });

    assertEquals(output[0], "failure");
  });

  it("passes selected values through when callbackFunction is not set", async () => {
    const selectedFile = await writeSelectedFile(["foo", "bar"]);

    try {
      setSettings(withHistoryDefaults({
        snippets: [],
        completions: [{
          name: "no-callback",
          patterns: ["^plain"],
          sourceCommand: "printf ''",
        }],
      }));

      const output: string[] = [];
      await completionCallbackCommand.execute({
        input: {
          completionCallback: {
            sourceId: "u0001",
            selectedFile,
          },
        },
        writer: createWriter(output),
      });

      assertEquals(output[0], "success");
      assertEquals(output[1], "printf '%s\\0' 'foo' 'bar'");
    } finally {
      await Deno.remove(selectedFile).catch(() => undefined);
    }
  });

  it("returns failure when callbackFunction throws", async () => {
    const selectedFile = await writeSelectedFile(["foo"]);

    try {
      setSettings(withHistoryDefaults({
        snippets: [],
        completions: [{
          name: "throw",
          patterns: ["^throw"],
          sourceCommand: "printf ''",
          callbackFunction: () => {
            throw new Error("boom");
          },
        }],
      }));

      const output: string[] = [];
      await completionCallbackCommand.execute({
        input: {
          completionCallback: {
            sourceId: "u0001",
            selectedFile,
          },
        },
        writer: createWriter(output),
      });

      assertEquals(output[0], "failure");
    } finally {
      await Deno.remove(selectedFile).catch(() => undefined);
    }
  });

  it("supports async callbackFunction", async () => {
    const selectedFile = await writeSelectedFile(["foo"]);

    try {
      setSettings(withHistoryDefaults({
        snippets: [],
        completions: [{
          name: "async",
          patterns: ["^async"],
          sourceCommand: "printf ''",
          callbackFunction: async ({ selected }) =>
            selected.map((item) => `${item}-done`),
        }],
      }));

      const output: string[] = [];
      await completionCallbackCommand.execute({
        input: {
          completionCallback: {
            sourceId: "u0001",
            selectedFile,
          },
        },
        writer: createWriter(output),
      });

      assertEquals(output[0], "success");
      assertEquals(output[1], "printf '%s\\0' 'foo-done'");
    } finally {
      await Deno.remove(selectedFile).catch(() => undefined);
    }
  });

  it("returns failure when callbackFunction returns non-string items", async () => {
    const selectedFile = await writeSelectedFile(["foo"]);

    try {
      setSettings(withHistoryDefaults({
        snippets: [],
        completions: [{
          name: "invalid",
          patterns: ["^invalid"],
          sourceCommand: "printf ''",
          callbackFunction: () => [1 as unknown as string],
        }],
      }));

      const output: string[] = [];
      await completionCallbackCommand.execute({
        input: {
          completionCallback: {
            sourceId: "u0001",
            selectedFile,
          },
        },
        writer: createWriter(output),
      });

      assertEquals(output[0], "failure");
    } finally {
      await Deno.remove(selectedFile).catch(() => undefined);
    }
  });

  it("returns printf '' when selected list is empty", async () => {
    const selectedFile = await writeSelectedFile([]);

    try {
      setSettings(withHistoryDefaults({
        snippets: [],
        completions: [{
          name: "empty",
          patterns: ["^empty"],
          sourceCommand: "printf ''",
          callbackFunction: ({ selected }) => selected,
        }],
      }));

      const output: string[] = [];
      await completionCallbackCommand.execute({
        input: {
          completionCallback: {
            sourceId: "u0001",
            selectedFile,
          },
        },
        writer: createWriter(output),
      });

      assertEquals(output[0], "success");
      assertEquals(output[1], "printf ''");
    } finally {
      await Deno.remove(selectedFile).catch(() => undefined);
    }
  });
});
