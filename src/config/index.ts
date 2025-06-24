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

export const getSettings = (): Promise<Settings> => {
  return getConfigManager().getSettings();
};

export const setSettings = (settings: Settings): void => {
  getConfigManager().setSettings(settings);
};

export const clearCache = (): void => {
  getConfigManager().clearCache();
};
