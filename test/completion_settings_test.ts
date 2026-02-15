import {
  afterEach,
  assertEquals,
  assertStringIncludes,
  beforeEach,
  describe,
  it,
} from "./deps.ts";
import { Helper, withHistoryDefaults } from "./helpers.ts";
import { loadCompletions } from "../src/completion/settings.ts";
import { clearCache, setSettings } from "../src/settings.ts";

const captureError = async (
  fn: () => Promise<unknown>,
): Promise<Error | undefined> => {
  try {
    await fn();
    return undefined;
  } catch (error) {
    if (error instanceof Error) {
      return error;
    }
    return new Error(String(error));
  }
};

describe("completion settings", () => {
  const helper = new Helper();

  beforeEach(() => {
    helper.saveEnvs();
    clearCache();
    Deno.env.set("ZENO_DISABLE_BUILTIN_COMPLETION", "1");
  });

  afterEach(() => {
    clearCache();
    helper.restoreAll();
  });

  it("throws when previewFunction and options['--preview'] are both specified", async () => {
    setSettings(withHistoryDefaults({
      snippets: [],
      completions: [{
        name: "invalid-preview",
        patterns: ["^invalid"],
        sourceCommand: "printf ''",
        options: {
          "--preview": "echo {}",
        },
        previewFunction: ({ item }) => item,
      }],
    }));

    const error = await captureError(() => loadCompletions());
    assertEquals(error instanceof Error, true);
    assertStringIncludes(
      error?.message ?? "",
      "previewFunction cannot be used together with static preview options",
    );
  });

  it("throws when preview and options['--preview'] are both specified", async () => {
    setSettings(withHistoryDefaults({
      snippets: [],
      completions: [{
        name: "duplicate-static-preview",
        patterns: ["^dup"],
        sourceCommand: "printf ''",
        preview: "echo from preview",
        options: {
          "--preview": "echo from options",
        },
      }],
    }));

    const error = await captureError(() => loadCompletions());
    assertEquals(error instanceof Error, true);
    assertStringIncludes(
      error?.message ?? "",
      'preview and options["--preview"] cannot be specified together',
    );
  });
});
