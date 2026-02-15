import { afterEach, assertEquals, beforeEach, describe, it } from "../deps.ts";
import { createBufferWriter, Helper, withHistoryDefaults } from "../helpers.ts";
import { completionPreviewCommand } from "../../src/command/commands/index.ts";
import { getCompletionSourceCache } from "../../src/completion/source/cache.ts";
import { clearCache, setSettings } from "../../src/settings.ts";

const encodeUtf8Base64 = (value: string): string => {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
};

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

  it("executes previewFunction and writes returned preview text", async () => {
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
        previewFunction: ({ item, lbuffer, rbuffer }) => {
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
      writer: createBufferWriter(output),
    });

    assertEquals(output.join(""), "preview:alpha beta:cbp :tail");
    assertEquals(calls.length, 1);
    assertEquals(calls[0], {
      item: "alpha beta",
      lbuffer: "cbp ",
      rbuffer: "tail",
    });
  });

  it("supports async previewFunction", async () => {
    setSettings(withHistoryDefaults({
      snippets: [],
      completions: [{
        name: "preview",
        patterns: ["^async"],
        sourceCommand: "printf ''",
        previewFunction: ({ item }) => Promise.resolve(`async:${item}`),
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
      writer: createBufferWriter(output),
    });

    assertEquals(output.join(""), "async:value");
  });

  it("decodes lbuffer/rbuffer from base64 payload", async () => {
    const calls: Array<{ lbuffer: string; rbuffer: string }> = [];

    setSettings(withHistoryDefaults({
      snippets: [],
      completions: [{
        name: "preview",
        patterns: ["^b64"],
        sourceCommand: "printf ''",
        previewFunction: ({ lbuffer, rbuffer }) => {
          calls.push({ lbuffer, rbuffer });
          return `${lbuffer}|${rbuffer}`;
        },
      }],
    }));

    const lbuffer = 'echo "a`\n$\\';
    const rbuffer = "x\ny'z";
    const output: string[] = [];
    await completionPreviewCommand.execute({
      input: {
        completionPreview: {
          sourceId: "u0001",
          item: "value",
          lbufferB64: encodeUtf8Base64(lbuffer),
          rbufferB64: encodeUtf8Base64(rbuffer),
        },
      },
      writer: createBufferWriter(output),
    });

    assertEquals(calls.length, 1);
    assertEquals(calls[0], { lbuffer, rbuffer });
    assertEquals(output.join(""), `${lbuffer}|${rbuffer}`);
  });

  it("does nothing when source has no previewFunction", async () => {
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
      writer: createBufferWriter(output),
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
        previewFunction: ({ item }) => item,
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
      writer: createBufferWriter(output),
    });

    assertEquals(output, []);
  });

  it("does nothing when previewFunction returns non-string", async () => {
    setSettings(withHistoryDefaults({
      snippets: [],
      completions: [{
        name: "invalid-preview",
        patterns: ["^invalid-preview"],
        sourceCommand: "printf ''",
        previewFunction: () => 1 as unknown as string,
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
      writer: createBufferWriter(output),
    });

    assertEquals(output, []);
  });
});
