import { afterEach, assertEquals, beforeEach, describe, it } from "../deps.ts";
import { Helper, withHistoryDefaults } from "../helpers.ts";
import { completionPreviewCommand } from "../../src/command/commands/index.ts";
import { getCompletionSourceCache } from "../../src/completion/source/cache.ts";
import { clearCache, setSettings } from "../../src/settings.ts";

const createWriter = (buffer: string[]) => ({
  write({ text }: { format: string; text: string }): Promise<void> {
    buffer.push(text);
    return Promise.resolve();
  },
});

describe("completionPreviewCommand", () => {
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

  it("executes callbackPreviewFunction and writes returned preview text", async () => {
    const calls: Array<{
      item: string;
      lbuffer: string;
      rbuffer: string;
    }> = [];

    setSettings(withHistoryDefaults({
      snippets: [],
      completions: [{
        name: "preview",
        patterns: ["^cbp"],
        sourceCommand: "printf ''",
        callbackPreviewFunction: ({ item, lbuffer, rbuffer }) => {
          calls.push({ item, lbuffer, rbuffer });
          return `preview:${item}:${lbuffer}:${rbuffer}`;
        },
      }],
    }));

    const output: string[] = [];
    await completionPreviewCommand.execute({
      input: {
        lbuffer: "cbp ",
        rbuffer: "tail",
        completionPreview: {
          sourceId: "u0001",
          item: "alpha beta",
        },
      },
      writer: createWriter(output),
    });

    assertEquals(output.join(""), "preview:alpha beta:cbp :tail");
    assertEquals(calls.length, 1);
    assertEquals(calls[0], {
      item: "alpha beta",
      lbuffer: "cbp ",
      rbuffer: "tail",
    });
  });

  it("supports async callbackPreviewFunction", async () => {
    setSettings(withHistoryDefaults({
      snippets: [],
      completions: [{
        name: "preview",
        patterns: ["^async"],
        sourceCommand: "printf ''",
        callbackPreviewFunction: ({ item }) => Promise.resolve(`async:${item}`),
      }],
    }));

    const output: string[] = [];
    await completionPreviewCommand.execute({
      input: {
        completionPreview: {
          sourceId: "u0001",
          item: "value",
        },
      },
      writer: createWriter(output),
    });

    assertEquals(output.join(""), "async:value");
  });

  it("does nothing when source has no callbackPreviewFunction", async () => {
    setSettings(withHistoryDefaults({
      snippets: [],
      completions: [{
        name: "no-preview",
        patterns: ["^plain"],
        sourceCommand: "printf ''",
      }],
    }));

    const output: string[] = [];
    await completionPreviewCommand.execute({
      input: {
        completionPreview: {
          sourceId: "u0001",
          item: "value",
        },
      },
      writer: createWriter(output),
    });

    assertEquals(output, []);
  });

  it("does nothing when input is invalid", async () => {
    setSettings(withHistoryDefaults({
      snippets: [],
      completions: [{
        name: "preview",
        patterns: ["^invalid"],
        sourceCommand: "printf ''",
        callbackPreviewFunction: ({ item }) => item,
      }],
    }));

    const output: string[] = [];
    await completionPreviewCommand.execute({
      input: {
        completionPreview: {
          sourceId: "u0001\nbad",
          item: "value",
        },
      },
      writer: createWriter(output),
    });

    assertEquals(output, []);
  });

  it("does nothing when callbackPreviewFunction returns non-string", async () => {
    setSettings(withHistoryDefaults({
      snippets: [],
      completions: [{
        name: "invalid-preview",
        patterns: ["^invalid-preview"],
        sourceCommand: "printf ''",
        callbackPreviewFunction: () => 1 as unknown as string,
      }],
    }));

    const output: string[] = [];
    await completionPreviewCommand.execute({
      input: {
        completionPreview: {
          sourceId: "u0001",
          item: "value",
        },
      },
      writer: createWriter(output),
    });

    assertEquals(output, []);
  });
});
