/**
 * Environment variables configuration
 * All environment variable access should go through this module
 */

export type ZenoEnv = {
  readonly DEFAULT_FZF_OPTIONS: string;
  readonly SOCK: string | undefined;
  readonly GIT_CAT: string;
  readonly GIT_TREE: string;
  readonly DISABLE_BUILTIN_COMPLETION: boolean;
  readonly DISABLE_AUTOMATIC_WORKSPACE_LOOKUP: boolean;
  readonly LOCAL_CONFIG_PATH: string | undefined;
  readonly HOME: string | undefined;
};

const normalizeLocalConfigPath = (
  value: string | undefined,
): string | undefined => {
  if (value == null) {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
};

/**
 * Get environment variables with defaults
 * This is a function to avoid top-level side effects
 */
export const getEnv = (): ZenoEnv => ({
  DEFAULT_FZF_OPTIONS: Deno.env.get("ZENO_DEFAULT_FZF_OPTIONS") ?? "",
  SOCK: Deno.env.get("ZENO_SOCK"),
  GIT_CAT: Deno.env.get("ZENO_GIT_CAT") ?? "cat",
  GIT_TREE: Deno.env.get("ZENO_GIT_TREE") ?? "tree",
  DISABLE_BUILTIN_COMPLETION:
    Deno.env.get("ZENO_DISABLE_BUILTIN_COMPLETION") != null,
  DISABLE_AUTOMATIC_WORKSPACE_LOOKUP:
    Deno.env.get("ZENO_DISABLE_AUTOMATIC_WORKSPACE_LOOKUP") === "1",
  LOCAL_CONFIG_PATH: normalizeLocalConfigPath(
    Deno.env.get("ZENO_LOCAL_CONFIG_PATH"),
  ),
  HOME: Deno.env.get("ZENO_HOME"),
});

/**
 * For backward compatibility - will be removed
 * @deprecated Use getEnv() instead
 */
export const ZENO_DEFAULT_FZF_OPTIONS =
  Deno.env.get("ZENO_DEFAULT_FZF_OPTIONS") ?? "";
export const ZENO_SOCK = Deno.env.get("ZENO_SOCK");
export const ZENO_GIT_CAT = Deno.env.get("ZENO_GIT_CAT") ?? "cat";
export const ZENO_GIT_TREE = Deno.env.get("ZENO_GIT_TREE") ?? "tree";
export const ZENO_DISABLE_BUILTIN_COMPLETION =
  Deno.env.get("ZENO_DISABLE_BUILTIN_COMPLETION") != null;
