import { xdg } from "../deps.ts";
import type { ConfigContext } from "../type/config.ts";
import type { Settings } from "../type/settings.ts";
import { loadConfigFiles, getDefaultSettings } from "./loader.ts";
import { getEnv } from "./env.ts";
import {
  collectContextEnv,
  createEnvSignature,
  detectShell,
  type ContextEnv,
} from "./context-env.ts";
import {
  createConfigDiscovery,
  type DiscoverConfigFiles,
} from "./discovery.ts";
import { detectProjectRoot } from "./project.ts";
import {
  createTsConfigEvaluator,
  type EvaluateTsConfigs,
} from "./ts-evaluator.ts";
import {
  freezeSettings,
  mergeSettingsList as defaultMergeSettings,
} from "./settings-utils.ts";

export { mergeSettingsList } from "./settings-utils.ts";

export type ResolveConfigContext = (params: {
  cwd: string;
  env: ContextEnv;
  homeDirectory: string;
  projectRoot: string;
}) => Promise<ConfigContext>;

const isSameCacheKey = (a: CacheKey, b: CacheKey): boolean =>
  a.cwd === b.cwd &&
  a.projectRoot === b.projectRoot &&
  a.envSignature === b.envSignature &&
  a.shell === b.shell &&
  a.homeDirectory === b.homeDirectory;

type CacheKey = Readonly<{
  readonly cwd: string;
  readonly projectRoot: string;
  readonly envSignature: string;
  readonly shell: ConfigContext["shell"];
  readonly homeDirectory: string;
}>;

type CacheEntry =
  | Readonly<{ source: "auto"; key: CacheKey; settings: Settings }>
  | Readonly<{ source: "manual"; settings: Settings }>;

const createCacheKey = (context: ConfigContext): CacheKey => ({
  cwd: context.currentDirectory,
  projectRoot: context.projectRoot,
  envSignature: createEnvSignature(context.env),
  shell: context.shell,
  homeDirectory: context.homeDirectory,
});

export const createConfigContextResolver = (): ResolveConfigContext => {
  return async ({ cwd, env, homeDirectory, projectRoot }) => ({
    projectRoot,
    currentDirectory: cwd,
    env,
    shell: detectShell(env),
    homeDirectory,
  });
};

/**
 * Create a config manager with caching using closure
 */
export const createConfigManager = (opts?: {
  envProvider?: () => ReturnType<typeof getEnv>;
  xdgConfigDirsProvider?: () => readonly string[];
  cwdProvider?: () => string;
  discovery?: DiscoverConfigFiles;
  contextResolver?: ResolveConfigContext;
  tsEvaluator?: EvaluateTsConfigs;
  settingsMerger?: (settingsList: readonly Settings[]) => Settings;
}) => {
  const envProvider = opts?.envProvider ?? getEnv;
  const xdgConfigDirsProvider = opts?.xdgConfigDirsProvider ?? xdg.configDirs;
  const cwdProvider = opts?.cwdProvider ?? Deno.cwd;
  const discovery = opts?.discovery ?? createConfigDiscovery();
  const contextResolver = opts?.contextResolver ??
    createConfigContextResolver();
  const tsEvaluator = opts?.tsEvaluator ?? createTsConfigEvaluator();
  const settingsMerger = opts?.settingsMerger ?? defaultMergeSettings;

  let cache: CacheEntry | undefined;

  const loadSettings = async (): Promise<Settings> => {
    const cwd = cwdProvider();
    const zenoEnv = envProvider();
    const xdgDirs = xdgConfigDirsProvider();
    const projectRoot = await detectProjectRoot(cwd);
    const discovered = await discovery({
      cwd,
      env: zenoEnv,
      xdgDirs,
      projectRoot,
    });

    const envRecord = collectContextEnv(cwd);
    if (zenoEnv.HOME && envRecord.HOME === undefined) {
      envRecord.HOME = zenoEnv.HOME;
    }
    const frozenEnv = Object.freeze({ ...envRecord });

    const homeDirectory = frozenEnv["HOME"] ?? Deno.env.get("HOME") ?? "";
    const context = await contextResolver({
      cwd,
      env: frozenEnv,
      homeDirectory,
      projectRoot,
    });

    const key = createCacheKey(context);
    if (cache) {
      if (cache.source === "manual") {
        return cache.settings;
      }
      if (cache.source === "auto" && isSameCacheKey(cache.key, key)) {
        return cache.settings;
      }
    }

    const chunks: Settings[] = [];

    if (discovered.yamlFiles.length > 0) {
      const yamlSettings = await loadConfigFiles(discovered.yamlFiles);
      chunks.push(freezeSettings(yamlSettings));
    }

    const tsResults = await tsEvaluator(discovered.tsFiles, context);
    for (const result of tsResults) {
      chunks.push(result.settings);
    }

    if (chunks.length === 0) {
      chunks.push(freezeSettings(getDefaultSettings()));
    }

    const merged = settingsMerger(chunks);
    cache = { source: "auto", key, settings: merged };
    return merged;
  };

  return {
    getSettings: async (): Promise<Settings> => {
      return await loadSettings();
    },

    setSettings: (settings: Settings): void => {
      cache = { source: "manual", settings: freezeSettings(settings) };
    },

    clearCache: (): void => {
      cache = undefined;
    },
  };
};

// Global instance using a closure
const globalManager = createConfigManager();

/**
 * Get global config manager instance
 */
export const getConfigManager = () => globalManager;

export type ConfigManager = ReturnType<typeof createConfigManager>;
