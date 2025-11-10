import {
  afterEach,
  assertEquals,
  beforeEach,
  describe,
  it,
  path,
} from "../deps.ts";
import { Helper } from "../helpers.ts";
import { clearCache } from "../../src/settings.ts";
import type { HistorySettings } from "../../src/type/settings.ts";
import { createConfigManager } from "../../src/config/manager.ts";

describe("config manager - multi YAML loading", () => {
  const context = new Helper();
  const defaultHistory: HistorySettings = {
    defaultScope: "global",
    redact: [],
    keymap: {
      deleteSoft: "ctrl-d",
      deleteHard: "alt-d",
      toggleScope: "ctrl-r",
      togglePreview: "?",
    },
    fzfCommand: undefined,
    fzfOptions: undefined,
  };

  beforeEach(() => {
    clearCache();
  });

  afterEach(() => {
    context.restoreAll();
  });

  it("merges all YAML files under $ZENO_HOME (non-recursive)", async () => {
    const tempDir = context.getTempDir();

    // Isolate XDG so local environment won't interfere
    const fakeEnv = {
      ZENO_HOME: path.join(tempDir, "zeno-home"),
      XDG_CONFIG_HOME: path.join(tempDir, "xdg-home-empty"),
      XDG_CONFIG_DIRS: [path.join(tempDir, "xdg1"), path.join(tempDir, "xdg2")],
    };

    // Prepare $ZENO_HOME with two YAML files
    const zenoHome = fakeEnv.ZENO_HOME;
    Deno.mkdirSync(zenoHome, { recursive: true });
    // use envProvider instead of mutating process env

    const aYml = path.join(zenoHome, "a.yml");
    const bYaml = path.join(zenoHome, "b.yaml");
    Deno.writeTextFileSync(
      aYml,
      `
snippets:
  - keyword: a
    snippet: from-a
completions:
  - name: comp-a
    patterns: ["^a "]
    sourceCommand: echo a
    callback: echo a {}
history:
  defaultScope: repository
  redact:
    - secret
  keymap:
    deleteSoft: ctrl-d
    deleteHard: alt-d
    toggleScope: ctrl-r
`,
    );
    Deno.writeTextFileSync(
      bYaml,
      `
snippets:
  - keyword: b
    snippet: from-b
completions:
  - name: comp-b
    patterns: ["^b "]
    sourceCommand: echo b
    callback: echo b {}
history:
  redact:
    - token
`,
    );

    const manager = createConfigManager({
      envProvider: () => ({
        DEFAULT_FZF_OPTIONS: "",
        SOCK: undefined,
        GIT_CAT: "cat",
        GIT_TREE: "tree",
        DISABLE_BUILTIN_COMPLETION: false,
        HOME: fakeEnv.ZENO_HOME,
      }),
      xdgConfigDirsProvider: () => fakeEnv.XDG_CONFIG_DIRS,
    });
    const settings = await manager.getSettings();
    assertEquals(settings.snippets.map((s) => s.keyword), ["a", "b"]);
    assertEquals(settings.completions.map((c) => c.name), ["comp-a", "comp-b"]);
    assertEquals(settings.history.defaultScope, "repository");
    assertEquals(settings.history.redact, ["secret", "token"]);
    assertEquals(settings.history.keymap.deleteSoft, "ctrl-d");
  });

  it("skips broken YAML in $ZENO_HOME and loads the rest", async () => {
    const tempDir = context.getTempDir();

    const fakeEnv = {
      ZENO_HOME: path.join(tempDir, "zeno-bad"),
      XDG_CONFIG_HOME: path.join(tempDir, "xdg-home-empty"),
      XDG_CONFIG_DIRS: [path.join(tempDir, "xdg1"), path.join(tempDir, "xdg2")],
    };

    const zenoHome = fakeEnv.ZENO_HOME;
    Deno.mkdirSync(zenoHome, { recursive: true });
    // valid
    Deno.writeTextFileSync(
      path.join(zenoHome, "01.yml"),
      `\nsnippets:\n  - keyword: ok\n    snippet: fine\n`,
    );
    // invalid YAML
    Deno.writeTextFileSync(
      path.join(zenoHome, "02.yml"),
      `snippets: [ - ]`,
    );

    const manager = createConfigManager({
      envProvider: () => ({
        DEFAULT_FZF_OPTIONS: "",
        SOCK: undefined,
        GIT_CAT: "cat",
        GIT_TREE: "tree",
        DISABLE_BUILTIN_COMPLETION: false,
        HOME: fakeEnv.ZENO_HOME,
      }),
      xdgConfigDirsProvider: () => fakeEnv.XDG_CONFIG_DIRS,
    });

    const settings = await manager.getSettings();
    assertEquals(settings.snippets.map((s) => s.keyword), ["ok"]);
    assertEquals(settings.history, defaultHistory);
  });

  it("merges YAML files under first XDG config dir's zeno/ when $ZENO_HOME has none", async () => {
    const tempDir = context.getTempDir();

    const xdgHome = path.join(tempDir, "xdg-home");
    const appDir = path.join(xdgHome, "zeno");
    Deno.mkdirSync(appDir, { recursive: true });
    const fakeEnv = {
      ZENO_HOME: undefined as string | undefined,
      XDG_CONFIG_HOME: xdgHome,
      XDG_CONFIG_DIRS: [path.join(tempDir, "xdg1"), path.join(tempDir, "xdg2")],
    };

    const aYml = path.join(appDir, "01.yml");
    const bYaml = path.join(appDir, "02.yaml");
    Deno.writeTextFileSync(
      aYml,
      `
snippets:
  - keyword: x
    snippet: from-x
history:
  defaultScope: directory
  keymap:
    toggleScope: alt-r
`,
    );
    Deno.writeTextFileSync(
      bYaml,
      `
completions:
  - name: comp-y
    patterns: ["^y "]
    sourceCommand: echo y
    callback: echo y {}
history:
  redact:
    - password
`,
    );

    const manager = createConfigManager({
      envProvider: () => ({
        DEFAULT_FZF_OPTIONS: "",
        SOCK: undefined,
        GIT_CAT: "cat",
        GIT_TREE: "tree",
        DISABLE_BUILTIN_COMPLETION: false,
        HOME: fakeEnv.ZENO_HOME,
      }),
      xdgConfigDirsProvider:
        () => [fakeEnv.XDG_CONFIG_HOME, ...fakeEnv.XDG_CONFIG_DIRS],
    });
    const settings = await manager.getSettings();
    assertEquals(settings.snippets.map((s) => s.keyword), ["x"]);
    assertEquals(settings.completions.map((c) => c.name), ["comp-y"]);
    assertEquals(settings.history.defaultScope, "directory");
    assertEquals(settings.history.keymap.toggleScope, "alt-r");
    assertEquals(settings.history.redact, ["password"]);
  });

  it("falls back to $ZENO_HOME/config.yml when no YAML groups exist", async () => {
    const tempDir = context.getTempDir();

    const fakeEnv = {
      ZENO_HOME: path.join(tempDir, "zeno-home2"),
      XDG_CONFIG_HOME: path.join(tempDir, "xdg-home-empty"),
      XDG_CONFIG_DIRS: [path.join(tempDir, "xdg1"), path.join(tempDir, "xdg2")],
    };

    // Prepare $ZENO_HOME with a single config.yml
    const zenoHome = fakeEnv.ZENO_HOME;
    Deno.mkdirSync(zenoHome, { recursive: true });
    // use envProvider instead of mutating process env
    const configYml = path.join(zenoHome, "config.yml");
    Deno.writeTextFileSync(
      configYml,
      `
snippets:
  - keyword: only
    snippet: legacy
`,
    );

    const manager = createConfigManager({
      envProvider: () => ({
        DEFAULT_FZF_OPTIONS: "",
        SOCK: undefined,
        GIT_CAT: "cat",
        GIT_TREE: "tree",
        DISABLE_BUILTIN_COMPLETION: false,
        HOME: fakeEnv.ZENO_HOME,
      }),
      xdgConfigDirsProvider: () => fakeEnv.XDG_CONFIG_DIRS,
    });
    const settings = await manager.getSettings();
    assertEquals(settings.snippets.map((s) => s.keyword), ["only"]);
    assertEquals(settings.history, defaultHistory);
  });

  it("falls back to XDG zeno/config.yml when $ZENO_HOME has no YAML and no config.yml", async () => {
    const tempDir = context.getTempDir();

    const emptyHome = path.join(tempDir, "empty-home");
    Deno.mkdirSync(emptyHome, { recursive: true });
    const xdgHome = path.join(tempDir, "xdg-home-single");
    const appDir = path.join(xdgHome, "zeno");
    Deno.mkdirSync(appDir, { recursive: true });
    const fakeEnv = {
      ZENO_HOME: emptyHome,
      XDG_CONFIG_HOME: xdgHome,
      XDG_CONFIG_DIRS: [path.join(tempDir, "xdg1"), path.join(tempDir, "xdg2")],
    };

    const cfg = path.join(appDir, "config.yml");
    Deno.writeTextFileSync(
      cfg,
      `
snippets:
  - keyword: xdg
    snippet: single
`,
    );

    const manager = createConfigManager({
      envProvider: () => ({
        DEFAULT_FZF_OPTIONS: "",
        SOCK: undefined,
        GIT_CAT: "cat",
        GIT_TREE: "tree",
        DISABLE_BUILTIN_COMPLETION: false,
        HOME: fakeEnv.ZENO_HOME,
      }),
      xdgConfigDirsProvider:
        () => [fakeEnv.XDG_CONFIG_HOME, ...fakeEnv.XDG_CONFIG_DIRS],
    });
    const settings = await manager.getSettings();
    assertEquals(settings.snippets.map((s) => s.keyword), ["xdg"]);
    assertEquals(settings.history, defaultHistory);
  });
});
