/**
 * Context information provided to configuration functions
 */
export type ConfigContext = {
  /**
   * The root directory of the project (usually where .git is located)
   */
  projectRoot: string;

  /**
   * The current working directory where zeno is being executed
   */
  currentDirectory: string;

  /**
   * Environment variables
   */
  env: Record<string, string | undefined>;

  /**
   * The shell type (zsh or fish)
   */
  shell: "zsh" | "fish";

  /**
   * User home directory
   */
  homeDirectory: string;
};

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
import type { Settings } from "./settings.ts";
