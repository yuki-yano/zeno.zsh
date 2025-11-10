import { exists, path, xdg, yamlParse } from "../deps.ts";
import type { Settings } from "../type/settings.ts";
import { getEnv } from "./env.ts";
import {
  accumulateHistorySettings,
  createHistoryAccumulatorState,
  finalizeHistorySettings,
  parseHistoryConfig,
} from "./history.ts";

export const DEFAULT_CONFIG_FILENAME = "config.yml";
export const DEFAULT_APP_DIR = "zeno";

const PATH_DELIMITER = (() => {
  const maybePath = path as unknown as {
    delimiter?: string;
    DELIMITER?: string;
  };
  if (typeof maybePath.delimiter === "string") {
    return maybePath.delimiter;
  }
  if (typeof maybePath.DELIMITER === "string") {
    return maybePath.DELIMITER;
  }
  return Deno.build.os === "windows" ? ";" : ":";
})();

export const parseXdgConfigDirs = (raw: string): readonly string[] => {
  if (raw.length === 0) {
    return [];
  }
  return raw
    .split(PATH_DELIMITER)
    .map((dir) => dir.trim())
    .filter((dir) => dir.length > 0);
};

export const getDefaultSettings = (): Settings => ({
  snippets: [],
  completions: [],
  history: finalizeHistorySettings(createHistoryAccumulatorState()),
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

const findFilesInDir = async (
  dir: string,
  predicate: (fileName: string) => boolean,
): Promise<string[]> => {
  const files: string[] = [];
  try {
    for await (const entry of Deno.readDir(dir)) {
      if ((entry.isFile || entry.isSymlink) && predicate(entry.name)) {
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
 * Find YAML files directly under a directory (non-recursive)
 */
export const findYamlFilesInDir = (dir: string): Promise<string[]> =>
  findFilesInDir(dir, isYaml);

/**
 * Find TypeScript config files directly under a directory (non-recursive)
 */
export const findTypeScriptFilesInDir = (
  dir: string,
): Promise<string[]> => findFilesInDir(dir, isTypeScriptConfig);

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

  const configCandidates: string[] = [];

  const xdgConfigHome = Deno.env.get("XDG_CONFIG_HOME");
  if (xdgConfigHome) {
    configCandidates.push(
      path.join(xdgConfigHome, DEFAULT_APP_DIR, DEFAULT_CONFIG_FILENAME),
    );
  }

  const envConfigDirs = parseXdgConfigDirs(
    Deno.env.get("XDG_CONFIG_DIRS") ?? "",
  );

  configCandidates.push(
    ...envConfigDirs.map((baseDir) =>
      path.join(baseDir, DEFAULT_APP_DIR, DEFAULT_CONFIG_FILENAME)
    ),
  );

  configCandidates.push(
    ...xdg.configDirs().map((baseDir) =>
      path.join(baseDir, DEFAULT_APP_DIR, DEFAULT_CONFIG_FILENAME)
    ),
  );

  const seen = new Set<string>();
  for (const candidate of configCandidates) {
    if (seen.has(candidate)) {
      continue;
    }
    seen.add(candidate);
    if (await exists(candidate)) {
      return candidate;
    }
  }

  const [firstCandidate] = seen;
  if (firstCandidate) {
    return firstCandidate;
  }

  // Fallback: emulate previous behavior when no candidates are available.
  return path.join(Deno.cwd(), DEFAULT_CONFIG_FILENAME);
};

/**
 * Load and parse config file
 */
export const loadConfigFile = async (configPath: string): Promise<Settings> => {
  try {
    const content = await Deno.readTextFile(configPath);
    const parsed = yamlParse(content) as Record<string, unknown> | undefined;

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
      history: parseHistoryConfig(parsed.history),
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

  const historyState = validSettings.reduce(
    (state, settings) => accumulateHistorySettings(state, settings.history),
    createHistoryAccumulatorState(),
  );

  return {
    snippets: validSettings.flatMap((s) => s.snippets),
    completions: validSettings.flatMap((s) => s.completions),
    history: finalizeHistorySettings(historyState),
  };
};
