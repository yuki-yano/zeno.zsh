import { afterEach, assertEquals, beforeEach, describe, it } from "../deps.ts";
import { Helper } from "../helpers.ts";
import { completionCommand } from "../../src/command/commands/index.ts";
import { getCompletionSourceCache } from "../../src/completion/source/cache.ts";
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
    setSettings({
      snippets: [],
      completions: [{
        name: "dynamic",
        patterns: ["^foo"],
        sourceFunction: (context) => {
          captured.push(context.currentDirectory);
          return ["alpha", "beta"];
        },
      }],
    });

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
    setSettings({
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
    });

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
    setSettings({
      snippets: [],
      completions: [{
        name: "quote",
        patterns: ["^q"],
        sourceFunction: (_context) => ["O'Reilly", "spaced name"],
      }],
    });

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
    const expected = "printf '%s\\n' 'O'\\''Reilly' 'spaced name'";
    assertEquals(output[1], expected);
  });

  it("encodes empty result as printf ''", async () => {
    setSettings({
      snippets: [],
      completions: [{
        name: "empty",
        patterns: ["^e"],
        sourceFunction: (_context) => [],
      }],
    });

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
    setSettings({
      snippets: [],
      completions: [{
        name: "async",
        patterns: ["^a"],
        sourceFunction: (_context) => Promise.resolve(["async-value"]),
      }],
    });

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
    setSettings({
      snippets: [],
      completions: [{
        name: "dynamic",
        patterns: ["^err"],
        sourceFunction: () => {
          throw new Error("boom");
        },
      }],
    });

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
});
