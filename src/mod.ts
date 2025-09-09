/**
 * @module
 * Zeno configuration types for TypeScript config files
 *
 * @example
 * ```typescript
 * import type { Settings } from "jsr:@yuki-yano/zeno";
 *
 * export default {
 *   snippets: [
 *     {
 *       name: "git status",
 *       keyword: "gs",
 *       snippet: "git status --short --branch"
 *     }
 *   ],
 *   completions: []
 * } satisfies Settings;
 * ```
 */

export type {
  Settings,
  Snippet,
  UserCompletionSource,
} from "./type/settings.ts";
