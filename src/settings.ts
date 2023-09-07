import { existsSync, path, xdg, yamlParse } from "./deps.ts";
import type { Settings } from "./type/settings.ts";

export const ZENO_DEFAULT_FZF_OPTIONS =
  Deno.env.get("ZENO_DEFAULT_FZF_OPTIONS") ?? "";

export const ZENO_SOCK = Deno.env.get("ZENO_SOCK");

export const ZENO_GIT_CAT = Deno.env.get("ZENO_GIT_CAT") ?? "cat";
export const ZENO_GIT_TREE = Deno.env.get("ZENO_GIT_TREE") ?? "tree";

export const ZENO_DISABLE_BUILTIN_COMPLETION =
  Deno.env.get("ZENO_DISABLE_BUILTIN_COMPLETION") == null ? false : true;

const cache = {} as Partial<{
  settings: Settings;
}>;

export const getDefaultSettings = (): Settings => ({
  snippets: [],
  completions: [],
});

export const findConfigFile = (): string => {
  const configFile = "config.yml";
  const zenoHome = Deno.env.get("ZENO_HOME");
  if (zenoHome) {
    return path.join(zenoHome, configFile);
  }
  const appDir = "zeno";
  const configPaths = xdg.configDirs().map((baseDir) =>
    path.join(baseDir, appDir, configFile)
  );
  return configPaths.find((configPath) => existsSync(configPath)) ??
    configPaths[0];
};

export const loadConfigFile = (configFile: string): Settings => {
  const file = Deno.readTextFileSync(configFile);

  let parsedSettings: Partial<Settings> | undefined;
  try {
    parsedSettings = yamlParse(file) as Partial<Settings> | undefined;
  } catch (e: unknown) {
    console.error("Setting parsed error");
    throw e;
  }

  const settings = getDefaultSettings();
  return {
    snippets: parsedSettings?.snippets ?? settings.snippets,
    completions: parsedSettings?.completions ?? settings.completions,
  };
};

export const getSettings = (): Settings => {
  if (!cache.settings) {
    const configFile = findConfigFile();
    if (existsSync(configFile)) {
      cache.settings = loadConfigFile(configFile);
    } else {
      cache.settings = getDefaultSettings();
    }
  }
  return cache.settings;
};

export const setSettings = (settings: Settings) => {
  cache.settings = settings;
};

export const clearCache = () => {
  cache.settings = undefined;
};
