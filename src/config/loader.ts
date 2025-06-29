import { exists, path, xdg, yamlParse } from "../deps.ts";
import type { Settings } from "../type/settings.ts";
import { getEnv } from "./env.ts";

export const DEFAULT_CONFIG_FILENAME = "config.yml";
export const DEFAULT_APP_DIR = "zeno";

export const getDefaultSettings = (): Settings => ({
  snippets: [],
  completions: [],
});

/**
 * Find config file path
 * Priority:
 * 1. $ZENO_HOME/config.yml
 * 2. XDG config directories
 */
export const findConfigFilePath = async (): Promise<string> => {
  const env = getEnv();

  if (env.HOME) {
    return path.join(env.HOME, DEFAULT_CONFIG_FILENAME);
  }

  const configPaths = xdg.configDirs().map((baseDir) =>
    path.join(baseDir, DEFAULT_APP_DIR, DEFAULT_CONFIG_FILENAME)
  );

  for (const configPath of configPaths) {
    if (await exists(configPath)) {
      return configPath;
    }
  }

  return configPaths[0];
};

/**
 * Load and parse config file
 */
export const loadConfigFile = async (configPath: string): Promise<Settings> => {
  try {
    const content = await Deno.readTextFile(configPath);
    const parsed = yamlParse(content) as Partial<Settings> | undefined;

    if (!parsed || typeof parsed !== "object") {
      return getDefaultSettings();
    }

    const defaults = getDefaultSettings();
    return {
      snippets: Array.isArray(parsed.snippets)
        ? parsed.snippets
        : defaults.snippets,
      completions: Array.isArray(parsed.completions)
        ? parsed.completions
        : defaults.completions,
    };
  } catch (error) {
    if (
      error instanceof Error && error.message.includes("Setting parsed error")
    ) {
      throw error;
    }
    throw new Error(`Failed to load config from ${configPath}: ${error}`);
  }
};
