import { exists, path, xdg } from "../deps.ts";
import type { Settings } from "../type/settings.ts";
import {
  DEFAULT_APP_DIR,
  findYamlFilesInDir,
  getDefaultSettings,
  loadConfigFile,
  loadConfigFiles,
} from "./loader.ts";
import { getEnv } from "./env.ts";

/**
 * Create a config manager with caching using closure
 */
export const createConfigManager = (opts?: {
  envProvider?: () => ReturnType<typeof getEnv>;
  xdgConfigDirsProvider?: () => readonly string[];
}) => {
  let cache: Settings | undefined;

  const loadSettings = async (): Promise<Settings> => {
    const env = opts?.envProvider ? opts.envProvider() : getEnv();

    // If $ZENO_HOME is set to a directory, load all YAML files under it
    if (env.HOME && (await exists(env.HOME))) {
      try {
        const stat = await Deno.stat(env.HOME);
        if (stat.isDirectory) {
          const yamlFiles = await findYamlFilesInDir(env.HOME);
          if (yamlFiles.length > 0) {
            return await loadConfigFiles(yamlFiles);
          }
          // If no YAML files, fall through to legacy single-file detection
        }
      } catch (error) {
        console.error(`Failed to scan $ZENO_HOME: ${error}`);
      }
    }

    // If not found in $ZENO_HOME, search XDG config directories for zeno/*.yml|*.yaml
    const xdgDirs = opts?.xdgConfigDirsProvider
      ? opts.xdgConfigDirsProvider()
      : xdg.configDirs();
    for (const baseDir of xdgDirs) {
      const appDir = path.join(baseDir, DEFAULT_APP_DIR);
      if (await exists(appDir)) {
        try {
          const stat = await Deno.stat(appDir);
          if (stat.isDirectory) {
            const yamlFiles = await findYamlFilesInDir(appDir);
            if (yamlFiles.length > 0) {
              return await loadConfigFiles(yamlFiles);
            }
          }
        } catch (error) {
          console.error(`Failed to scan XDG dir: ${appDir}: ${error}`);
        }
      }
    }

    // Legacy single-file fallbacks (preserve historical behavior but try XDG too)
    if (env.HOME) {
      const homeConfig = path.join(env.HOME, "config.yml");
      if (await exists(homeConfig)) {
        try {
          return await loadConfigFile(homeConfig);
        } catch (error) {
          console.error(`Failed to load config: ${error}`);
          return getDefaultSettings();
        }
      }
    }

    for (const baseDir of xdg.configDirs()) {
      const candidate = path.join(baseDir, DEFAULT_APP_DIR, "config.yml");
      if (await exists(candidate)) {
        try {
          return await loadConfigFile(candidate);
        } catch (error) {
          console.error(`Failed to load config: ${error}`);
          return getDefaultSettings();
        }
      }
    }

    return getDefaultSettings();
  };

  return {
    getSettings: async (): Promise<Settings> => {
      if (!cache) {
        cache = await loadSettings();
      }
      return cache;
    },

    setSettings: (settings: Settings): void => {
      cache = settings;
    },

    clearCache: (): void => {
      cache = undefined;
    },
  };
};

// Global instance using a closure
const globalManager = createConfigManager();

/**
 * Get global config manager instance
 */
export const getConfigManager = () => globalManager;

export type ConfigManager = ReturnType<typeof createConfigManager>;
