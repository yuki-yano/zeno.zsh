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

/**
 * Get the current zeno settings
 * @returns Promise resolving to the current settings
 */
export const getSettings = (): Promise<Settings> => {
  return getConfigManager().getSettings();
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
