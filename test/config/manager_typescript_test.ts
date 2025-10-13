import {
  afterEach,
  assertEquals,
  assertNotStrictEquals,
  assertStrictEquals,
  beforeEach,
  describe,
  it,
  path,
} from "../deps.ts";
import { Helper } from "../helpers.ts";
import { clearCache } from "../../src/settings.ts";
import { createConfigManager } from "../../src/config/manager.ts";

const modUrl = path.toFileUrl(path.join(Deno.cwd(), "src/mod.ts")).href;

describe("config manager - TypeScript configs", () => {
  const helper = new Helper();

  beforeEach(() => {
    clearCache();
  });

  afterEach(() => {
    helper.restoreAll();
    clearCache();
  });

  it("loads TypeScript configs and provides context values", async () => {
    const tempDir = helper.getTempDir();
    const zenoHome = path.join(tempDir, "zeno-home-ts");
    Deno.mkdirSync(zenoHome, { recursive: true });

    const projectDir = path.join(tempDir, "project");
    Deno.mkdirSync(path.join(projectDir, ".git"), { recursive: true });

    const yamlConfig = path.join(zenoHome, "01.yml");
    Deno.writeTextFileSync(
      yamlConfig,
      `
snippets:
  - keyword: yaml
    snippet: from-yaml
`,
    );

    const tsConfig = path.join(zenoHome, "02.ts");
    Deno.writeTextFileSync(
      tsConfig,
      `
import { defineConfig } from "${modUrl}";

export default defineConfig(async ({ projectRoot, currentDirectory }) => {
  return {
    snippets: [
      { keyword: "root", snippet: projectRoot },
      { keyword: "cwd", snippet: currentDirectory }
    ],
    completions: []
  };
});
`,
    );

    const manager = createConfigManager({
      envProvider: () => ({
        DEFAULT_FZF_OPTIONS: "",
        SOCK: undefined,
        GIT_CAT: "cat",
        GIT_TREE: "tree",
        DISABLE_BUILTIN_COMPLETION: false,
        HOME: zenoHome,
      }),
      xdgConfigDirsProvider: () => [],
      cwdProvider: () => projectDir,
    });

    const settings = await manager.getSettings();

    assertEquals(
      settings.snippets.map((snippet) => snippet.keyword),
      ["yaml", "root", "cwd"],
    );
    const cwdSnippet = settings.snippets.find((snippet) =>
      snippet.keyword === "cwd"
    );
    const rootSnippet = settings.snippets.find((snippet) =>
      snippet.keyword === "root"
    );
    assertEquals(cwdSnippet?.snippet, projectDir);
    assertEquals(rootSnippet?.snippet, projectDir);
  });

  it("logs errors and continues when defineConfig marker is missing", async () => {
    const tempDir = helper.getTempDir();
    const zenoHome = path.join(tempDir, "zeno-home-ts-error");
    Deno.mkdirSync(zenoHome, { recursive: true });

    const tsConfig = path.join(zenoHome, "config.ts");
    Deno.writeTextFileSync(
      tsConfig,
      `
export default () => ({
  snippets: [{ keyword: "bad", snippet: "should-not-load" }],
  completions: []
});
`,
    );

    const errors: string[] = [];
    const originalError = console.error;
    console.error = (message?: unknown, ...rest: unknown[]) => {
      errors.push([message, ...rest].map((v) => String(v)).join(" "));
    };

    try {
      const manager = createConfigManager({
        envProvider: () => ({
          DEFAULT_FZF_OPTIONS: "",
          SOCK: undefined,
          GIT_CAT: "cat",
          GIT_TREE: "tree",
          DISABLE_BUILTIN_COMPLETION: false,
          HOME: zenoHome,
        }),
        xdgConfigDirsProvider: () => [],
        cwdProvider: () => zenoHome,
      });

      const settings = await manager.getSettings();
      assertEquals(settings.snippets.length, 0);
      assertEquals(settings.completions.length, 0);
      assertEquals(
        errors.some((msg) =>
          msg.includes("TypeScript config must wrap the exported function")
        ),
        true,
      );
    } finally {
      console.error = originalError;
    }
  });

  it("re-evaluates settings when the current directory changes", async () => {
    const tempDir = helper.getTempDir();
    const zenoHome = path.join(tempDir, "zeno-home-ts-cwd");
    Deno.mkdirSync(zenoHome, { recursive: true });

    const tsConfig = path.join(zenoHome, "config.ts");
    Deno.writeTextFileSync(
      tsConfig,
      `
import { defineConfig } from "${modUrl}";

export default defineConfig(({ currentDirectory }) => ({
  snippets: [{ keyword: "cwd", snippet: currentDirectory }],
  completions: []
}));
`,
    );

    const projectA = path.join(tempDir, "project-a");
    const projectB = path.join(tempDir, "project-b");
    Deno.mkdirSync(path.join(projectA, ".git"), { recursive: true });
    Deno.mkdirSync(path.join(projectB, ".git"), { recursive: true });

    let currentDir = projectA;
    const manager = createConfigManager({
      envProvider: () => ({
        DEFAULT_FZF_OPTIONS: "",
        SOCK: undefined,
        GIT_CAT: "cat",
        GIT_TREE: "tree",
        DISABLE_BUILTIN_COMPLETION: false,
        HOME: zenoHome,
      }),
      xdgConfigDirsProvider: () => [],
      cwdProvider: () => currentDir,
    });

    const settingsA = await manager.getSettings();
    const snippetA = settingsA.snippets.find((s) => s.keyword === "cwd");
    assertEquals(snippetA?.snippet, projectA);

    const cached = await manager.getSettings();
    assertStrictEquals(cached, settingsA);

    currentDir = projectB;
    const settingsB = await manager.getSettings();
    const snippetB = settingsB.snippets.find((s) => s.keyword === "cwd");
    assertEquals(snippetB?.snippet, projectB);
    assertNotStrictEquals(settingsB, settingsA);
  });
});
