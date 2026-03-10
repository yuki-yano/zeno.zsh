import {
  afterEach,
  assertEquals,
  beforeEach,
  describe,
  it,
  path,
} from "./deps.ts";
import { Helper } from "./helpers.ts";

import {
  clearCache,
  findConfigFile,
  getSettings,
  loadConfigFile,
  setSettings,
} from "../src/settings.ts";
import type { Snippet, UserCompletionSource } from "../src/type/settings.ts";
import { withHistoryDefaults } from "./helpers.ts";

describe("settings", () => {
  const context = new Helper();

  beforeEach(() => {
    clearCache();
  });

  afterEach(() => {
    context.restoreAll();
  });

  describe("findConfigFile()", () => {
    it("returns path in $ZENO_HOME, even if the path does not exist", async () => {
      const tempDir = context.getTempDir();

      // Set no exists path to ZENO_HOME
      const notExistDir = path.join(tempDir, "not_exist_dir");
      const expectedPath = path.join(notExistDir, "config.yml");
      Deno.env.set("ZENO_HOME", notExistDir);

      // Set the exist path to XDG_CONFIG_HOME, but it will not be used
      const existConfigDir = path.join(tempDir, "exist_dir");
      const existZenoDir = path.join(existConfigDir, "zeno");
      const existConfigFile = path.join(existZenoDir, "config.yml");
      Deno.mkdirSync(existZenoDir, { recursive: true });
      Deno.writeTextFileSync(existConfigFile, "foobar:");
      Deno.env.set("XDG_CONFIG_HOME", existConfigDir);

      // Set the exist path to XDG_CONFIG_DIRS
      const xdgConfigDirs = [
        path.join(tempDir, "foo"), // no exists
        path.join(tempDir, "bar"), // no exists
        existConfigDir,
        path.join(tempDir, "baz"), // no exists
      ];
      Deno.env.set("XDG_CONFIG_DIRS", xdgConfigDirs.join(path.DELIMITER));

      const configFile = await findConfigFile();

      assertEquals(configFile, expectedPath);
    });

    it("returns path in $XDG_CONFIG_HOME, even if the path does not exist", async () => {
      const tempDir = context.getTempDir();

      // delete ZENO_HOME
      Deno.env.delete("ZENO_HOME");

      // Set no exists path to XDG_CONFIG_HOME
      const notExistDir = path.join(tempDir, "not_exist_dir");
      const expectedPath = path.join(notExistDir, "zeno/config.yml");
      Deno.env.set("XDG_CONFIG_HOME", notExistDir);

      // Set no exist paths to XDG_CONFIG_DIRS
      const xdgConfigDirs = [
        path.join(tempDir, "foo"), // no exists
        path.join(tempDir, "bar"), // no exists
        path.join(tempDir, "baz"), // no exists
      ];
      Deno.env.set("XDG_CONFIG_DIRS", xdgConfigDirs.join(path.DELIMITER));

      const configFile = await findConfigFile();

      assertEquals(configFile, expectedPath);
    });

    it("returns first exist path in $XDG_CONFIG_DIRS", async () => {
      const tempDir = context.getTempDir();

      // delete ZENO_HOME
      Deno.env.delete("ZENO_HOME");

      // Set no exists path to XDG_CONFIG_HOME
      Deno.env.set("XDG_CONFIG_HOME", path.join(tempDir, "not_exist_dir"));

      // Set the exist path to XDG_CONFIG_DIRS
      const existConfigDir = path.join(tempDir, "exist_dir");
      const existZenoDir = path.join(existConfigDir, "zeno");
      const expectedPath = path.join(existZenoDir, "config.yml");
      const xdgConfigDirs = [
        path.join(tempDir, "foo"), // no exists
        path.join(tempDir, "bar"), // no exists
        existConfigDir,
        path.join(tempDir, "baz"), // no exists
      ];
      Deno.env.set("XDG_CONFIG_DIRS", xdgConfigDirs.join(path.DELIMITER));

      Deno.mkdirSync(existZenoDir, { recursive: true });
      Deno.writeTextFileSync(expectedPath, "foobar:");

      const configFile = await findConfigFile();

      assertEquals(configFile, expectedPath);
    });

    it("returns path in ~/.config/zeno when $XDG_CONFIG_HOME is unset", async () => {
      const tempDir = context.getTempDir();

      Deno.env.delete("ZENO_HOME");
      Deno.env.delete("XDG_CONFIG_HOME");
      Deno.env.set("XDG_CONFIG_DIRS", "");
      Deno.env.set("HOME", tempDir);

      const configFile = await findConfigFile();

      assertEquals(
        configFile,
        path.join(tempDir, ".config", "zeno", "config.yml"),
      );
    });
  });

  describe("loadConfigFile()", () => {
    it("returns default Settings, if the file is empty", async () => {
      const tempDir = context.getTempDir();
      const existConfigFile = path.join(tempDir, "empty.yml");
      Deno.writeTextFileSync(existConfigFile, "");

      const settings = await loadConfigFile(existConfigFile);

      assertEquals(
        settings,
        withHistoryDefaults({
          snippets: [],
          completions: [],
        }),
      );
    });

    it("returns parsed Settings", async () => {
      const tempDir = context.getTempDir();
      const expectedSnippets: Snippet[] = [
        {
          keyword: "gs",
          snippet: "git status",
        },
        {
          name: "list files",
          keyword: "ls",
          snippet: "ls -al",
        },
      ];
      const expectedCompletions: UserCompletionSource[] = [
        {
          name: "git add",
          patterns: ["^git add "],
          sourceCommand: "git diff --name-only",
          options: {
            "--multi": true,
          },
          callback: "git add {{}}",
        },
      ];
      const configContent = `
snippets:
  - keyword: gs
    snippet: git status
  - name: list files
    keyword: ls
    snippet: ls -al

completions:
  - name: git add
    patterns:
      - "^git add "
    sourceCommand: "git diff --name-only"
    options:
      --multi: true
    callback: "git add {{}}"
`;
      const existConfigFile = path.join(tempDir, "exist.yml");
      Deno.writeTextFileSync(existConfigFile, configContent);

      const settings = await loadConfigFile(existConfigFile);

      assertEquals(
        settings,
        withHistoryDefaults({
          snippets: expectedSnippets,
          completions: expectedCompletions,
        }),
      );
    });
  });

  describe("getSettings()", () => {
    it("returns default Settings, if can not detected config file", async () => {
      const tempDir = context.getTempDir();

      // delete ZENO_HOME
      Deno.env.delete("ZENO_HOME");

      // Set no exists path to XDG_CONFIG_HOME
      Deno.env.set("XDG_CONFIG_HOME", path.join(tempDir, "not_exist_dir"));

      // Set no exist paths to XDG_CONFIG_DIRS
      const xdgConfigDirs = [
        path.join(tempDir, "foo"), // no exists
        path.join(tempDir, "bar"), // no exists
        path.join(tempDir, "baz"), // no exists
      ];
      Deno.env.set("XDG_CONFIG_DIRS", xdgConfigDirs.join(path.DELIMITER));

      const settings = await getSettings();

      assertEquals(
        settings,
        withHistoryDefaults({
          snippets: [],
          completions: [],
        }),
      );
    });

    it("returns Settings from detected config file", async () => {
      const tempDir = context.getTempDir();

      // delete ZENO_HOME
      Deno.env.delete("ZENO_HOME");

      // Set the exist path to XDG_CONFIG_HOME
      const existConfigDir = path.join(tempDir, "exist_dir");
      const existZenoDir = path.join(existConfigDir, "zeno");
      const existConfigFile = path.join(existZenoDir, "config.yml");
      Deno.mkdirSync(existZenoDir, { recursive: true });
      const expectedSnippets: Snippet[] = [
        {
          keyword: "gs",
          snippet: "git status",
        },
      ];
      const configContent = `
snippets:
  - keyword: gs
    snippet: git status
`;
      Deno.writeTextFileSync(existConfigFile, configContent);
      Deno.env.set("XDG_CONFIG_HOME", existConfigDir);

      const settings = await getSettings();

      assertEquals(
        settings,
        withHistoryDefaults({
          snippets: expectedSnippets,
          completions: [],
        }),
      );
    });

    it("returns Settings from ~/.config/zeno/config.yml when $XDG_CONFIG_HOME is unset", async () => {
      const tempDir = context.getTempDir();

      Deno.env.delete("ZENO_HOME");
      Deno.env.delete("XDG_CONFIG_HOME");
      Deno.env.set("XDG_CONFIG_DIRS", "");
      Deno.env.set("HOME", tempDir);

      const configDir = path.join(tempDir, ".config", "zeno");
      const configFile = path.join(configDir, "config.yml");
      Deno.mkdirSync(configDir, { recursive: true });
      Deno.writeTextFileSync(
        configFile,
        `
snippets:
  - keyword: home
    snippet: from-home-config
`,
      );

      const settings = await getSettings();

      assertEquals(
        settings,
        withHistoryDefaults({
          snippets: [{ keyword: "home", snippet: "from-home-config" }],
          completions: [],
        }),
      );
    });

    it("reloads Settings when $XDG_CONFIG_HOME changes", async () => {
      const tempDir = context.getTempDir();

      Deno.env.delete("ZENO_HOME");
      Deno.env.set("XDG_CONFIG_DIRS", "");

      const xdgHomeA = path.join(tempDir, "xdg-home-a");
      const xdgHomeB = path.join(tempDir, "xdg-home-b");
      const configDirA = path.join(xdgHomeA, "zeno");
      const configDirB = path.join(xdgHomeB, "zeno");
      Deno.mkdirSync(configDirA, { recursive: true });
      Deno.mkdirSync(configDirB, { recursive: true });
      Deno.writeTextFileSync(
        path.join(configDirA, "config.yml"),
        `
snippets:
  - keyword: from-a
    snippet: a
`,
      );
      Deno.writeTextFileSync(
        path.join(configDirB, "config.yml"),
        `
snippets:
  - keyword: from-b
    snippet: b
`,
      );

      Deno.env.set("XDG_CONFIG_HOME", xdgHomeA);
      const settingsA = await getSettings();
      assertEquals(
        settingsA,
        withHistoryDefaults({
          snippets: [{ keyword: "from-a", snippet: "a" }],
          completions: [],
        }),
      );

      Deno.env.set("XDG_CONFIG_HOME", xdgHomeB);
      const settingsB = await getSettings();
      assertEquals(
        settingsB,
        withHistoryDefaults({
          snippets: [{ keyword: "from-b", snippet: "b" }],
          completions: [],
        }),
      );
    });

    it("returns Settings from cache", async () => {
      const tempDir = context.getTempDir();

      // delete ZENO_HOME
      Deno.env.delete("ZENO_HOME");

      // Set no exists path to XDG_CONFIG_HOME
      Deno.env.set("XDG_CONFIG_HOME", path.join(tempDir, "not_exist_dir"));

      // Call getSettings to generate cache.
      const settings = await getSettings();
      assertEquals(
        settings,
        withHistoryDefaults({
          snippets: [],
          completions: [],
        }),
      );

      // Update cache.
      const expectedSnippets: Snippet[] = [
        {
          keyword: "gs",
          snippet: "git status",
        },
      ];
      setSettings(
        withHistoryDefaults({
          snippets: expectedSnippets,
          completions: [],
        }),
      );

      // Call getSettings again
      const cachedSettings = await getSettings();

      assertEquals(
        cachedSettings,
        withHistoryDefaults({
          snippets: expectedSnippets,
          completions: [],
        }),
      );
    });
  });

  describe("setSettings()", () => {
    it("set a Settings", async () => {
      const expectedSnippets: Snippet[] = [
        {
          keyword: "gs",
          snippet: "git status",
        },
      ];
      const expectedSettings = withHistoryDefaults({
        snippets: expectedSnippets,
        completions: [],
      });

      setSettings(expectedSettings);
      const settings = await getSettings();

      assertEquals(settings, expectedSettings);
    });
  });

  describe("clearCache()", () => {
    it("clear cached Settings", async () => {
      const tempDir = context.getTempDir();

      // delete ZENO_HOME
      Deno.env.delete("ZENO_HOME");

      // Set no exists path to XDG_CONFIG_HOME
      Deno.env.set("XDG_CONFIG_HOME", path.join(tempDir, "not_exist_dir"));

      // Set cache
      const expectedSnippets: Snippet[] = [
        {
          keyword: "gs",
          snippet: "git status",
        },
      ];
      setSettings(
        withHistoryDefaults({
          snippets: expectedSnippets,
          completions: [],
        }),
      );

      // Clear cache
      clearCache();

      // Call getSettings again
      const settings = await getSettings();

      // It should not return the cached value
      assertEquals(
        settings,
        withHistoryDefaults({
          snippets: [],
          completions: [],
        }),
      );
    });
  });
});
