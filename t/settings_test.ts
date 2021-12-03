import {
  afterEach,
  beforeEach,
  describe,
  it,
} from "https://deno.land/x/test_suite@0.9.1/mod.ts";
import { assertEquals } from "https://deno.land/std@0.113.0/testing/asserts.ts";
import * as path from "https://deno.land/std@0.113.0/path/mod.ts";

import {
  clearCache,
  findConfigFile,
  getSettings,
  loadConfigFile,
  setSettings,
} from "../src/settings.ts";
import { Snippet, UserCompletionSource } from "../src/type/settings.ts";
import { Helper } from "./helpers.ts";

describe("settings", () => {
  const context = new Helper();

  beforeEach(() => {
    clearCache();
  });

  afterEach(() => {
    context.restoreAll();
  });

  describe("findConfigFile()", () => {
    it("returns path in $ZENO_HOME, even if the path does not exist", () => {
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
      Deno.env.set("XDG_CONFIG_DIRS", xdgConfigDirs.join(path.delimiter));

      const configFile = findConfigFile();

      assertEquals(configFile, expectedPath);
    });

    it("returns path in $XDG_CONFIG_HOME, even if the path does not exist", () => {
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
      Deno.env.set("XDG_CONFIG_DIRS", xdgConfigDirs.join(path.delimiter));

      const configFile = findConfigFile();

      assertEquals(configFile, expectedPath);
    });

    it("returns first exist path in $XDG_CONFIG_DIRS", () => {
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
      Deno.mkdirSync(existZenoDir, { recursive: true });
      Deno.writeTextFileSync(expectedPath, "foobar:");
      Deno.env.set("XDG_CONFIG_DIRS", xdgConfigDirs.join(path.delimiter));

      const configFile = findConfigFile();

      assertEquals(configFile, expectedPath);
    });
  });

  describe("loadConfigFile()", () => {
    it("returns default Settings, if the file is empty", () => {
      // Generate config file
      const tempDir = context.getTempDir();
      const configFile = path.join(tempDir, "config.yml");
      Deno.writeTextFileSync(configFile, "");

      const settings = loadConfigFile(configFile);

      assertEquals(settings, {
        snippets: [],
        completions: [],
      });
    });

    it("returns parsed Settings", () => {
      // Generate config file
      const tempDir = context.getTempDir();
      const configFile = path.join(tempDir, "config.yml");
      Deno.writeTextFileSync(
        configFile,
        [
          `# zeno config`,
          `snippets:`,
          `  # snippet and keyword abbrev`,
          `  - name: git status`,
          `    keyword: gs`,
          `    snippet: git status --short --branch`,
          `completions:`,
          `  - name: kill`,
          `    patterns:`,
          `      - "^kill( -9)? $"`,
          `    sourceCommand: "ps -ef | sed 1d"`,
          `    options:`,
          `      --multi: true`,
          `      --prompt: "'Kill Process> '"`,
          `    callback: "awk '{print $2}'"`,
        ].join("\n"),
      );

      const settings = loadConfigFile(configFile);

      assertEquals(settings, {
        snippets: [
          {
            keyword: "gs",
            name: "git status",
            snippet: "git status --short --branch",
          },
        ],
        completions: [
          {
            callback: "awk '{print $2}'",
            name: "kill",
            options: {
              "--multi": true,
              "--prompt": "'Kill Process> '",
            },
            patterns: [
              "^kill( -9)? $",
            ],
            sourceCommand: "ps -ef | sed 1d",
          },
        ],
      });
    });
  });

  describe("getSettings()", () => {
    const setupConfigFileNotExist = () => {
      // Set no exists path to ZENO_HOME
      const tempDir = context.getTempDir();
      const notExistDir = path.join(tempDir, "not_exist_dir");
      Deno.env.set("ZENO_HOME", notExistDir);
    };

    const setupConfigFile = () => {
      // Set config file path to ZENO_HOME
      const tempDir = context.getTempDir();
      const configDir = path.join(tempDir, "exist_dir");
      const configFile = path.join(configDir, "config.yml");
      Deno.env.set("ZENO_HOME", configDir);

      // Generate config file
      Deno.mkdirSync(configDir, { recursive: true });
      Deno.writeTextFileSync(
        configFile,
        [
          `# zeno config`,
          `snippets:`,
          `  - name: git status`,
          `completions:`,
          `  - name: kill`,
        ].join("\n"),
      );
    };

    it("returns default Settings, if can not detected config file", () => {
      setupConfigFileNotExist();

      const settings = getSettings();

      assertEquals(settings, {
        snippets: [],
        completions: [],
      });
    });

    it("returns Settings from detected config file", () => {
      setupConfigFile();

      const settings = getSettings();

      assertEquals(settings, {
        snippets: [{ name: "git status" }],
        completions: [{ name: "kill" }],
      });
    });

    it("returns Settings from cache", () => {
      setupConfigFile();

      const _settingsFirst = getSettings();

      setupConfigFileNotExist();

      const settingsSecond = getSettings();

      assertEquals(settingsSecond, {
        snippets: [{ name: "git status" }],
        completions: [{ name: "kill" }],
      });
    });
  });

  describe("setSettings()", () => {
    it("set a Settings", () => {
      setSettings({
        snippets: [{ name: "foo bar" } as unknown as Snippet],
        completions: [{ name: "baz" } as unknown as UserCompletionSource],
      });

      const settings = getSettings();
      assertEquals(settings, {
        snippets: [{ name: "foo bar" }],
        completions: [{ name: "baz" }],
      });
    });
  });

  describe("clearCache()", () => {
    it("clear cached Settings", () => {
      setSettings({
        snippets: [{ name: "foo bar" } as unknown as Snippet],
        completions: [{ name: "baz" } as unknown as UserCompletionSource],
      });

      clearCache();

      const settings = getSettings();
      assertEquals(settings, {
        snippets: [],
        completions: [],
      });
    });
  });
});
