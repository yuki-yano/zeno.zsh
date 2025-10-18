import type { ConfigContext } from "../type/config.ts";

export type ContextEnv = Readonly<Record<string, string | undefined>>;

const ENV_ALLOWLIST = new Set(["PWD", "HOME", "SHELL", "ZENO_SHELL"]);
const ENV_PREFIX_ALLOWLIST = ["ZENO_"];

export const detectShell = (env: ContextEnv): ConfigContext["shell"] => {
  const explicit = env["ZENO_SHELL"]?.toLowerCase();
  if (explicit === "fish" || explicit?.includes("fish")) {
    return "fish";
  }
  if (explicit === "zsh") {
    return "zsh";
  }
  const shell = env["SHELL"]?.toLowerCase() ?? "";
  if (shell.includes("fish")) {
    return "fish";
  }
  return "zsh";
};

export const collectContextEnv = (
  cwd: string,
): Record<string, string | undefined> => {
  const rawEnv = Deno.env.toObject();
  const record: Record<string, string | undefined> = {};

  for (const [key, value] of Object.entries(rawEnv)) {
    if (ENV_ALLOWLIST.has(key)) {
      record[key] = value;
      continue;
    }
    if (ENV_PREFIX_ALLOWLIST.some((prefix) => key.startsWith(prefix))) {
      record[key] = value;
    }
  }

  record.PWD = cwd;
  return record;
};

export const createEnvSignature = (env: ContextEnv): string => {
  const entries = Object.entries(env)
    .map(([key, value]) => [key, value ?? ""] as const)
    .sort((a, b) => a[0].localeCompare(b[0]));
  return entries.map(([key, value]) => `${key}=${value}`).join(";");
};
