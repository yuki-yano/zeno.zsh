export const ZENO_DEFAULT_FZF_OPTIONS =
  Deno.env.get("ZENO_DEFAULT_FZF_OPTIONS") ?? "";

export const HOME = Deno.env.get("HOME");
export const SETTING_FILE = `${HOME}/.config/zeno/config.yml`;

export const ZENO_SOCK = Deno.env.get("ZENO_SOCK");

export const ZENO_GIT_CAT = Deno.env.get("ZENO_GIT_CAT") ?? "cat";
export const ZENO_GIT_TREE = Deno.env.get("ZENO_GIT_TREE") ?? "tree";

export const ZENO_DISABLE_BUILTIN_COMPLETION =
  Deno.env.get("ZENO_DISABLE_BUILTIN_COMPLETION") == null ? false : true;
