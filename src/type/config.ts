import type { ConfigContext } from "./context.ts";
import type { Settings } from "./settings.ts";

export type { ConfigContext } from "./context.ts";

/**
 * Configuration function that returns Settings based on context
 */
export type ConfigFunction = (
  context: ConfigContext,
) => Settings | Promise<Settings>;

/**
 * Configuration module that exports a config function
 */
export type ConfigModule = {
  default: ConfigFunction;
};

// Re-export Settings for convenience
