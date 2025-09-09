import {
  afterEach,
  assertEquals,
  beforeEach,
  describe,
  it,
  path,
} from "../deps.ts";
import { Helper } from "../helpers.ts";
import { clearCache, getSettings } from "../../src/settings.ts";

describe("config manager - multi YAML loading", () => {
  const context = new Helper();

  beforeEach(() => {
    clearCache();
  });

  afterEach(() => {
    context.restoreAll();
  });

  it("merges all YAML files under $ZENO_HOME (non-recursive)", async () => {
    const tempDir = context.getTempDir();

    // Isolate XDG so local environment won't interfere
    Deno.env.set(
      "XDG_CONFIG_DIRS",
      [path.join(tempDir, "xdg1"), path.join(tempDir, "xdg2")].join(
        path.DELIMITER,
      ),
    );
    Deno.env.set("XDG_CONFIG_HOME", path.join(tempDir, "xdg-home-empty"));

    // Prepare $ZENO_HOME with two YAML files
    const zenoHome = path.join(tempDir, "zeno-home");
    Deno.mkdirSync(zenoHome, { recursive: true });
    Deno.env.set("ZENO_HOME", zenoHome);

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
`,
    );

    const settings = await getSettings();
    assertEquals(settings.snippets.map((s) => s.keyword), ["a", "b"]);
    assertEquals(settings.completions.map((c) => c.name), ["comp-a", "comp-b"]);
  });

  it("merges YAML files under first XDG config dir's zeno/ when $ZENO_HOME has none", async () => {
    const tempDir = context.getTempDir();

    // Ensure $ZENO_HOME does not point to a directory with YAMLs
    Deno.env.delete("ZENO_HOME");

    // Isolate XDG directories
    Deno.env.set(
      "XDG_CONFIG_DIRS",
      [path.join(tempDir, "xdg1"), path.join(tempDir, "xdg2")].join(
        path.DELIMITER,
      ),
    );

    // Set XDG_CONFIG_HOME and place YAMLs under zeno/
    const xdgHome = path.join(tempDir, "xdg-home");
    const appDir = path.join(xdgHome, "zeno");
    Deno.mkdirSync(appDir, { recursive: true });
    Deno.env.set("XDG_CONFIG_HOME", xdgHome);

    const aYml = path.join(appDir, "01.yml");
    const bYaml = path.join(appDir, "02.yaml");
    Deno.writeTextFileSync(
      aYml,
      `
snippets:
  - keyword: x
    snippet: from-x
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
`,
    );

    const settings = await getSettings();
    assertEquals(settings.snippets.map((s) => s.keyword), ["x"]);
    assertEquals(settings.completions.map((c) => c.name), ["comp-y"]);
  });

  it("falls back to $ZENO_HOME/config.yml when no YAML groups exist", async () => {
    const tempDir = context.getTempDir();

    // Isolate XDG so it doesn't pick up real config
    Deno.env.set(
      "XDG_CONFIG_DIRS",
      [path.join(tempDir, "xdg1"), path.join(tempDir, "xdg2")].join(
        path.DELIMITER,
      ),
    );
    Deno.env.set("XDG_CONFIG_HOME", path.join(tempDir, "xdg-home-empty"));

    // Prepare $ZENO_HOME with a single config.yml
    const zenoHome = path.join(tempDir, "zeno-home2");
    Deno.mkdirSync(zenoHome, { recursive: true });
    Deno.env.set("ZENO_HOME", zenoHome);
    const configYml = path.join(zenoHome, "config.yml");
    Deno.writeTextFileSync(
      configYml,
      `
snippets:
  - keyword: only
    snippet: legacy
`,
    );

    const settings = await getSettings();
    assertEquals(settings.snippets.map((s) => s.keyword), ["only"]);
  });

  it("falls back to XDG zeno/config.yml when $ZENO_HOME has no YAML and no config.yml", async () => {
    const tempDir = context.getTempDir();

    // Point $ZENO_HOME to an empty dir without YAML/config.yml
    const emptyHome = path.join(tempDir, "empty-home");
    Deno.mkdirSync(emptyHome, { recursive: true });
    Deno.env.set("ZENO_HOME", emptyHome);

    // Provide XDG config with single-file legacy config
    const xdgHome = path.join(tempDir, "xdg-home-single");
    const appDir = path.join(xdgHome, "zeno");
    Deno.mkdirSync(appDir, { recursive: true });
    Deno.env.set("XDG_CONFIG_HOME", xdgHome);

    // Isolate XDG directories to avoid real system dirs
    Deno.env.set(
      "XDG_CONFIG_DIRS",
      [path.join(tempDir, "xdg1"), path.join(tempDir, "xdg2")].join(
        path.DELIMITER,
      ),
    );

    const cfg = path.join(appDir, "config.yml");
    Deno.writeTextFileSync(
      cfg,
      `
snippets:
  - keyword: xdg
    snippet: single
`,
    );

    const settings = await getSettings();
    assertEquals(settings.snippets.map((s) => s.keyword), ["xdg"]);
  });
});
