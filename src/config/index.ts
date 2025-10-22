/**
 * Config module public API
 * All configuration access should go through this module
 */

export { getEnv } from "./env.ts";
export type { ZenoEnv } from "./env.ts";

export { getConfigManager } from "./manager.ts";
export type { ConfigManager } from "./manager.ts";

export {
  findConfigFilePath,
  getDefaultSettings,
  loadConfigFile,
} from "./loader.ts";

// Convenience functions for backward compatibility
import { getConfigManager } from "./manager.ts";
import type { Settings } from "../type/settings.ts";
import type { ConfigContext } from "../type/config.ts";

/**
 * Get the current zeno settings
 * @returns Promise resolving to the current settings
 */
export const getSettings = (): Promise<Settings> => {
  return getConfigManager().getSettings();
};

/**
 * Get the context used to evaluate configuration files.
 * The context is derived lazily and refreshed on each invocation to reflect
 * the latest working directory and environment state.
 * @returns Promise resolving to the current configuration context
 */
export const getConfigContext = (): Promise<ConfigContext> => {
  return getConfigManager().getContext();
};

/**
 * Update the zeno settings
 * @param settings - New settings to apply
 */
export const setSettings = (settings: Settings): void => {
  getConfigManager().setSettings(settings);
};

/**
 * Clear the settings cache, forcing a reload on next access
 */
export const clearCache = (): void => {
  getConfigManager().clearCache();
};
