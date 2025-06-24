import { exists } from "../deps.ts";
import type { Settings } from "../type/settings.ts";
import {
  findConfigFilePath,
  getDefaultSettings,
  loadConfigFile,
} from "./loader.ts";

/**
 * Create a config manager with caching using closure
 */
export const createConfigManager = () => {
  let cache: Settings | undefined;

  const loadSettings = async (): Promise<Settings> => {
    const configPath = await findConfigFilePath();

    if (await exists(configPath)) {
      try {
        return await loadConfigFile(configPath);
      } catch (error) {
        console.error(`Failed to load config: ${error}`);
        return getDefaultSettings();
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
