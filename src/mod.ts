import type { ConfigFunction } from "./type/config.ts";

/**
 * @module
 * Zeno configuration types and utilities for TypeScript config files
 *
 * @example
 * ```typescript
 * import { defineConfig } from "jsr:@yuki-yano/zeno";
 *
 * // Required: Use defineConfig to export configuration function
 * export default defineConfig(({ projectRoot, currentDirectory }) => {
 *   // Dynamic configuration based on context
 *   const isGitRepo = projectRoot.includes('.git');
 *
 *   return {
 *     snippets: [
 *       {
 *         name: "git status",
 *         keyword: "gs",
 *         snippet: "git status --short --branch"
 *       },
 *       // Add project-specific snippets
 *       ...(isGitRepo ? gitSnippets : [])
 *     ],
 *   };
 * });
 * ```
 */

export type {
  Settings,
  Snippet,
  UserCommandCompletionSource,
  UserCompletionSource,
  UserFunctionCompletionSource,
} from "./type/settings.ts";

export type {
  CompletionCallbackFunction,
  CompletionCallbackPreviewFunction,
  CompletionSourceFunction,
} from "./type/fzf.ts";

export type {
  ConfigContext,
  ConfigFunction,
  ConfigModule,
} from "./type/config.ts";

export {
  clearCache,
  findConfigFilePath as findConfigFile,
  getConfigContext,
  getDefaultSettings,
  getSettings,
  loadConfigFile,
  setSettings,
} from "./config/index.ts";

/**
 * Internal marker used to verify that exported configuration functions
 * have been wrapped with {@link defineConfig}.
 */
export const CONFIG_FUNCTION_MARK = Symbol.for(
  "@yuki-yano/zeno.defineConfig",
);

/**
 * Define a zeno configuration with context-aware dynamic generation.
 *
 * This function is required for all TypeScript configuration files.
 * Direct object exports are not supported.
 *
 * @param configFn - A function that receives context and returns configuration
 * @returns The configuration function for zeno to execute
 *
 * @example
 * ```typescript
 * import { defineConfig } from "jsr:@yuki-yano/zeno";
 *
 * // Required: All TypeScript configs must use defineConfig
 * export default defineConfig((context) => {
 *   const { projectRoot, currentDirectory, env, shell } = context;
 *
 *   // Generate configuration based on project context
 *   return {
 *     snippets: generateSnippets(projectRoot),
 *     completions: generateCompletions(currentDirectory)
 *   };
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Async configuration (also requires defineConfig)
 * export default defineConfig(async (context) => {
 *   const projectConfig = await loadProjectConfig(context.projectRoot);
 *
 *   return {
 *     snippets: projectConfig.snippets || [],
 *   };
 * });
 * ```
 */
export const defineConfig = (configFn: ConfigFunction): ConfigFunction => {
  if (
    Object.getOwnPropertyDescriptor(configFn, CONFIG_FUNCTION_MARK) == null
  ) {
    Object.defineProperty(configFn, CONFIG_FUNCTION_MARK, {
      value: true,
      enumerable: false,
      configurable: false,
      writable: false,
    });
  }
  return configFn;
};

/**
 * Check whether a path exists.
 * @param target - Absolute or relative path to inspect.
 * @param kind - Optional kind restriction. Defaults to `"any"`.
 */
export const pathExists = async (
  target: string,
  kind: "any" | "file" | "dir" = "any",
): Promise<boolean> => {
  try {
    const info = await Deno.stat(target);
    if (kind === "file") return info.isFile;
    if (kind === "dir") return info.isDirectory;
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return false;
    }
    throw error;
  }
};

/**
 * Check whether a file exists.
 * @param target - Path to the file.
 */
export const fileExists = (target: string): Promise<boolean> =>
  pathExists(target, "file");

/**
 * Check whether a directory exists.
 * @param target - Path to the directory.
 */
export const directoryExists = (target: string): Promise<boolean> =>
  pathExists(target, "dir");
