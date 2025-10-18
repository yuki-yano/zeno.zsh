import { path } from "../deps.ts";
import { CONFIG_FUNCTION_MARK } from "../mod.ts";
import type { ConfigContext } from "../type/config.ts";
import { getDefaultSettings } from "./loader.ts";
import { freezeSettings, normalizeSettings } from "./settings-utils.ts";
import type { Settings } from "../type/settings.ts";

export type EvaluateResult = Readonly<{
  readonly settings: Settings;
  readonly warnings: readonly string[];
}>;

export type EvaluateTsConfigs = (
  files: readonly string[],
  context: ConfigContext,
) => Promise<readonly EvaluateResult[]>;

const importModule = async (filePath: string): Promise<unknown> => {
  const fileUrl = path.toFileUrl(filePath);
  let version = "";
  try {
    const stat = await Deno.stat(filePath);
    const mtime = stat.mtime?.getTime() ?? Date.now();
    version = `?v=${mtime}`;
  } catch {
    version = `?v=${Date.now()}`;
  }
  return import(`${fileUrl.href}${version}`);
};

export const createTsConfigEvaluator = (
  logger: Pick<typeof console, "error"> = console,
): EvaluateTsConfigs => {
  return async (files, context) => {
    if (files.length === 0) {
      return [];
    }

    const results: EvaluateResult[] = [];

    for (const file of files) {
      try {
        const mod = await importModule(file) as {
          default?: unknown;
        };

        const configFn = mod.default;
        if (typeof configFn !== "function") {
          throw new Error(
            "TypeScript config must export default defineConfig(() => ...)",
          );
        }

        const mark = Reflect.get(configFn, CONFIG_FUNCTION_MARK);
        if (mark !== true) {
          throw new Error(
            "TypeScript config must wrap the exported function with defineConfig",
          );
        }

        const value = await configFn(context);
        const settings = normalizeSettings(value);

        results.push({ settings, warnings: [] });
      } catch (error) {
        const message = `Failed to load TypeScript config ${file}: ${
          error instanceof Error ? error.message : String(error)
        }`;
        logger.error(message);

        results.push({
          settings: freezeSettings(getDefaultSettings()),
          warnings: [message],
        });
      }
    }

    return results;
  };
};
