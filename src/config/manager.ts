import { exists, path, xdg } from "../deps.ts";
import { CONFIG_FUNCTION_MARK, directoryExists, fileExists } from "../mod.ts";
import type { ConfigContext } from "../type/config.ts";
import type {
  HistorySettings,
  Settings,
  Snippet,
  UserCompletionSource,
} from "../type/settings.ts";
import {
  accumulateHistorySettings,
  cloneHistorySettings,
  createHistoryAccumulatorState,
  finalizeHistorySettings,
  parseHistoryConfig,
} from "./history.ts";
import {
  DEFAULT_APP_DIR,
  DEFAULT_CONFIG_FILENAME,
  findTypeScriptFilesInDir,
  findYamlFilesInDir,
  getDefaultSettings,
  loadConfigFiles,
} from "./loader.ts";
import { getEnv } from "./env.ts";

type ConfigEnvRecord = Readonly<Record<string, string | undefined>>;

type DiscoveredConfigFiles = Readonly<{
  readonly yamlFiles: readonly string[];
  readonly tsFiles: readonly string[];
}>;

type EvaluateResult = Readonly<{
  readonly settings: Settings;
  readonly warnings: readonly string[];
}>;

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

type DiscoverConfigFiles = (params: {
  cwd: string;
  env: ReturnType<typeof getEnv>;
  xdgDirs: readonly string[];
  projectRoot: string;
}) => Promise<DiscoveredConfigFiles>;

type ResolveConfigContext = (params: {
  cwd: string;
  env: ConfigEnvRecord;
  homeDirectory: string;
}) => Promise<ConfigContext>;

type EvaluateTsConfigs = (
  files: readonly string[],
  context: ConfigContext,
) => Promise<readonly EvaluateResult[]>;

const ENV_ALLOWLIST = new Set(["PWD", "HOME", "SHELL", "ZENO_SHELL"]);
const ENV_PREFIX_ALLOWLIST = ["ZENO_"];

const isSameCacheKey = (a: CacheKey, b: CacheKey): boolean =>
  a.cwd === b.cwd &&
  a.projectRoot === b.projectRoot &&
  a.envSignature === b.envSignature &&
  a.shell === b.shell &&
  a.homeDirectory === b.homeDirectory;

const detectShell = (env: ConfigEnvRecord): ConfigContext["shell"] => {
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

const collectContextEnv = (cwd: string): Record<string, string | undefined> => {
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

const createEnvSignature = (env: ConfigEnvRecord): string => {
  const entries = Object.entries(env)
    .map(([key, value]) => [key, value ?? ""] as const)
    .sort((a, b) => a[0].localeCompare(b[0]));
  return entries.map(([key, value]) => `${key}=${value}`).join(";");
};

const createZenoEnvSignature = (
  env: ReturnType<typeof getEnv>,
): string => {
  const entries = Object.entries(env)
    .map(([key, value]) => [key, value == null ? "" : String(value)] as const)
    .sort((a, b) => a[0].localeCompare(b[0]));
  return entries.map(([key, value]) => `${key}=${value}`).join(";");
};

const resolveContext = async (
  {
    cwd,
    zenoEnv,
    contextResolver,
  }: {
    cwd: string;
    zenoEnv: ReturnType<typeof getEnv>;
    contextResolver: ResolveConfigContext;
  },
): Promise<{
  context: ConfigContext;
  contextSignature: string;
}> => {
  const envRecord = collectContextEnv(cwd);
  // Prefer HOME from zeno env if collectContextEnv did not expose it.
  if (zenoEnv.HOME && envRecord.HOME === undefined) {
    envRecord.HOME = zenoEnv.HOME;
  }
  const frozenEnv = Object.freeze({ ...envRecord });

  const homeDirectory = frozenEnv["HOME"] ?? Deno.env.get("HOME") ?? "";
  const context = await contextResolver({
    cwd,
    env: frozenEnv,
    homeDirectory,
  });
  const contextSignature = createEnvSignature(envRecord);
  return { context, contextSignature };
};

const cloneAndFreezeSnippet = (snippet: Snippet): Snippet =>
  Object.freeze({ ...snippet }) as Snippet;

const cloneAndFreezeCompletion = (
  completion: UserCompletionSource,
): UserCompletionSource =>
  Object.freeze({ ...completion }) as UserCompletionSource;

const freezeSettings = (settings: {
  snippets: readonly Snippet[];
  completions: readonly UserCompletionSource[];
  history: HistorySettings;
}): Settings =>
  Object.freeze({
    snippets: settings.snippets.map(cloneAndFreezeSnippet),
    completions: settings.completions.map(cloneAndFreezeCompletion),
    history: cloneHistorySettings(settings.history),
  }) as Settings;

export const mergeSettingsList = (
  settingsList: readonly Settings[],
): Settings => {
  if (settingsList.length === 0) {
    return freezeSettings(getDefaultSettings());
  }

  const historyState = settingsList.reduce(
    (state, settings) => accumulateHistorySettings(state, settings.history),
    createHistoryAccumulatorState(),
  );

  const merged = {
    snippets: settingsList.flatMap((settings) => settings.snippets),
    completions: settingsList.flatMap((settings) => settings.completions),
    history: finalizeHistorySettings(historyState),
  };

  return freezeSettings(merged);
};

const normalizeSettings = (value: unknown): Settings => {
  if (value && typeof value === "object") {
    const maybe = value as {
      snippets?: unknown;
      completions?: unknown;
      history?: unknown;
    };
    const snippets = Array.isArray(maybe.snippets)
      ? maybe.snippets as ReadonlyArray<Snippet>
      : [];
    const completions = Array.isArray(maybe.completions)
      ? maybe.completions as ReadonlyArray<UserCompletionSource>
      : [];
    const history = parseHistoryConfig(maybe.history);

    return freezeSettings({ snippets, completions, history });
  }

  return freezeSettings(getDefaultSettings());
};

export const createConfigDiscovery = (): DiscoverConfigFiles => {
  const collectFromDir = async (
    dir: string,
  ): Promise<DiscoveredConfigFiles | undefined> => {
    if (!await exists(dir)) {
      return undefined;
    }

    try {
      const stat = await Deno.stat(dir);
      if (!stat.isDirectory) {
        return undefined;
      }

      const [yamlFiles, tsFiles] = await Promise.all([
        findYamlFilesInDir(dir),
        findTypeScriptFilesInDir(dir),
      ]);

      if (yamlFiles.length === 0 && tsFiles.length === 0) {
        return undefined;
      }

      return { yamlFiles, tsFiles };
    } catch (error) {
      console.error(`Failed to scan config dir ${dir}: ${error}`);
      return undefined;
    }
  };

  const findLegacyConfig = async (
    env: ReturnType<typeof getEnv>,
    xdgDirs: readonly string[],
  ): Promise<string | undefined> => {
    if (env.HOME) {
      const homeConfig = path.join(env.HOME, DEFAULT_CONFIG_FILENAME);
      if (await exists(homeConfig)) {
        try {
          await Deno.stat(homeConfig);
          return homeConfig;
        } catch (error) {
          console.error(`Failed to load config: ${error}`);
        }
      }
    }

    for (const baseDir of xdgDirs) {
      const candidate = path.join(
        baseDir,
        DEFAULT_APP_DIR,
        DEFAULT_CONFIG_FILENAME,
      );
      if (await exists(candidate)) {
        try {
          await Deno.stat(candidate);
          return candidate;
        } catch (error) {
          console.error(`Failed to load config: ${error}`);
        }
      }
    }

    return undefined;
  };

  const resolveWorkspaceConfigDir = (
    env: ReturnType<typeof getEnv>,
    projectRoot: string,
  ): string | undefined => {
    if (env.LOCAL_CONFIG_PATH) {
      if (path.isAbsolute(env.LOCAL_CONFIG_PATH)) {
        return env.LOCAL_CONFIG_PATH;
      }
      return path.resolve(projectRoot, env.LOCAL_CONFIG_PATH);
    }
    if (env.DISABLE_AUTOMATIC_WORKSPACE_LOOKUP) {
      return undefined;
    }
    return path.join(projectRoot, ".zeno");
  };

  return async ({ env, xdgDirs, projectRoot }) => {
    const yamlFiles: string[] = [];
    const tsFiles: string[] = [];
    const seen = new Set<string>();

    const appendFiles = (files: DiscoveredConfigFiles) => {
      const processFiles = (source: readonly string[], target: string[]) => {
        for (const file of source) {
          if (seen.has(file)) {
            continue;
          }
          seen.add(file);
          target.push(file);
        }
      };

      processFiles(files.yamlFiles, yamlFiles);
      processFiles(files.tsFiles, tsFiles);
    };

    const tryCollectDir = async (dir: string | undefined) => {
      if (!dir) {
        return;
      }
      const result = await collectFromDir(dir);
      if (result) {
        appendFiles(result);
      }
    };

    await tryCollectDir(resolveWorkspaceConfigDir(env, projectRoot));

    if (env.HOME) {
      await tryCollectDir(env.HOME);
    }

    for (const baseDir of xdgDirs) {
      await tryCollectDir(path.join(baseDir, DEFAULT_APP_DIR));
    }

    if (yamlFiles.length === 0 && tsFiles.length === 0) {
      const legacyConfig = await findLegacyConfig(env, xdgDirs);
      if (legacyConfig) {
        seen.add(legacyConfig);
        yamlFiles.push(legacyConfig);
      }
    }

    return { yamlFiles, tsFiles };
  };
};

const detectProjectRoot = async (cwd: string): Promise<string> => {
  let current = cwd;
  while (true) {
    const gitDir = path.join(current, ".git");
    if (await directoryExists(gitDir)) {
      return current;
    }
    const packageJson = path.join(current, "package.json");
    if (await fileExists(packageJson)) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return cwd;
};

export const createConfigContextResolver = (): ResolveConfigContext => {
  return async ({ cwd, env, homeDirectory }) => {
    const projectRoot = await detectProjectRoot(cwd);
    const shell = detectShell(env);

    return {
      projectRoot,
      currentDirectory: cwd,
      env,
      shell,
      homeDirectory,
    };
  };
};

export const createTsConfigEvaluator = (
  logger: Pick<typeof console, "error"> = console,
): EvaluateTsConfigs => {
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

const createCacheKey = (
  context: ConfigContext,
  envSignature: string,
): CacheKey => ({
  cwd: context.currentDirectory,
  projectRoot: context.projectRoot,
  envSignature,
  shell: context.shell,
  homeDirectory: context.homeDirectory,
});

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
  const settingsMerger = opts?.settingsMerger ?? mergeSettingsList;

  let cache: CacheEntry | undefined;

  const loadSettings = async (): Promise<Settings> => {
    const cwd = cwdProvider();
    const zenoEnv = envProvider();
    const envSignatureZeno = createZenoEnvSignature(zenoEnv);
    const xdgDirs = xdgConfigDirsProvider();
    const projectRoot = await detectProjectRoot(cwd);
    const discovered = await discovery({
      cwd,
      env: zenoEnv,
      xdgDirs,
      projectRoot,
    });

    const { context, contextSignature } = await resolveContext({
      cwd,
      zenoEnv,
      contextResolver,
    });
    const combinedSignature = JSON.stringify([
      contextSignature,
      envSignatureZeno,
    ]);
    const key = createCacheKey(context, combinedSignature);
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

    getContext: async (): Promise<ConfigContext> => {
      const cwd = cwdProvider();
      const zenoEnv = envProvider();
      const { context } = await resolveContext({
        cwd,
        zenoEnv,
        contextResolver,
      });
      return context;
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
