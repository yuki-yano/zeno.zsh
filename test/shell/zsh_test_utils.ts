import { path } from "../deps.ts";

const TEST_DIR = path.dirname(path.fromFileUrl(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, "..", "..");

export const ZSH_WIDGETS_DIR = path.join(REPO_ROOT, "shells", "zsh", "widgets");

export const toHeredoc = (lines: readonly string[]): string =>
  lines.length === 0 ? "" : `${lines.join("\n")}\n`;

export const shellQuote = (value: string): string =>
  `'${value.replaceAll("'", `'\"'\"'`)}'`;

export const hasZsh = async (): Promise<boolean> => {
  try {
    const result = await new Deno.Command("zsh", {
      args: ["-lc", "exit 0"],
      stdin: "null",
      stdout: "null",
      stderr: "null",
    }).output();
    return result.success;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return false;
    }
    throw error;
  }
};

export const parseNullSeparatedPairs = (
  stdout: Uint8Array,
): Record<string, string> => {
  const parts = new TextDecoder().decode(stdout).split("\0");
  const parsed: Record<string, string> = {};
  for (let index = 0; index + 1 < parts.length; index += 2) {
    const key = parts[index];
    if (key.length === 0) {
      continue;
    }
    parsed[key] = parts[index + 1];
  }
  return parsed;
};
