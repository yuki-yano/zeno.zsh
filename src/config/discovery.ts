import { exists, path } from "../deps.ts";
import { DEFAULT_APP_DIR, DEFAULT_CONFIG_FILENAME, findTypeScriptFilesInDir, findYamlFilesInDir } from "./loader.ts";
import type { ZenoEnv } from "./env.ts";

export type DiscoveredConfigFiles = Readonly<{
  readonly yamlFiles: readonly string[];
  readonly tsFiles: readonly string[];
}>;

export type DiscoverConfigFiles = (params: {
  cwd: string;
  env: ZenoEnv;
  xdgDirs: readonly string[];
  projectRoot: string;
}) => Promise<DiscoveredConfigFiles>;

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
  env: ZenoEnv,
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

export const createConfigDiscovery = (): DiscoverConfigFiles => {
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

    await tryCollectDir(path.join(projectRoot, ".zeno"));

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
