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
 * Utility: determine if file name is YAML
 */
const isYaml = (fileName: string): boolean => {
  const lower = fileName.toLowerCase();
  return lower.endsWith(".yml") || lower.endsWith(".yaml");
};

/**
 * Utility: determine if file name is a TypeScript config
 */
const isTypeScriptConfig = (fileName: string): boolean => {
  const lower = fileName.toLowerCase();
  return lower.endsWith(".ts");
};

/**
 * Find YAML files directly under a directory (non-recursive)
 */
export const findYamlFilesInDir = async (dir: string): Promise<string[]> => {
  const files: string[] = [];
  try {
    for await (const entry of Deno.readDir(dir)) {
      if (entry.isFile && isYaml(entry.name)) {
        files.push(path.join(dir, entry.name));
      }
    }
  } catch (_) {
    // If directory cannot be read, treat as no files
    return [];
  }
  files.sort();
  return files;
};

/**
 * Find TypeScript config files directly under a directory (non-recursive)
 */
export const findTypeScriptFilesInDir = async (
  dir: string,
): Promise<string[]> => {
  const files: string[] = [];
  try {
    for await (const entry of Deno.readDir(dir)) {
      if (entry.isFile && isTypeScriptConfig(entry.name)) {
        files.push(path.join(dir, entry.name));
      }
    }
  } catch (_) {
    return [];
  }
  files.sort();
  return files;
};

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

/**
 * Load and merge multiple config files
 * - Concatenates array fields in alphabetical file order
 */
export const loadConfigFiles = async (
  paths: readonly string[],
): Promise<Settings> => {
  const results = await Promise.all(
    paths.map((p) =>
      loadConfigFile(p).catch((error) => {
        console.error(`Skipping broken config file ${p}: ${error}`);
        return null;
      })
    ),
  );

  const validSettings = results.filter((s): s is Settings => s != null);

  return {
    snippets: validSettings.flatMap((s) => s.snippets),
    completions: validSettings.flatMap((s) => s.completions),
  };
};
