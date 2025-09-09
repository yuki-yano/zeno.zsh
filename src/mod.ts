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
 *     completions: []
 *   };
 * });
 * ```
 */

export type {
  Settings,
  Snippet,
  UserCompletionSource,
} from "./type/settings.ts";

export type {
  ConfigContext,
  ConfigFunction,
  ConfigModule,
} from "./type/config.ts";

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
 *     completions: []
 *   };
 * });
 * ```
 */
export const defineConfig = (configFn: ConfigFunction): ConfigFunction => {
  return configFn;
};
