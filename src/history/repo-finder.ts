import { path } from "../deps.ts";

export interface RepoFinder {
  resolve(pwd: string): Promise<string | null>;
}

export interface RepoFinderDeps {
  runGitRevParse?: (cwd: string) => Promise<string | null>;
  realPath?: (value: string) => Promise<string>;
  stat?: (value: string) => Promise<Deno.FileInfo>;
  readTextFile?: (value: string) => Promise<string>;
}

const textDecoder = new TextDecoder();

const defaultRunGitRevParse = async (cwd: string): Promise<string | null> => {
  try {
    const command = new Deno.Command("git", {
      args: ["-C", cwd, "rev-parse", "--show-toplevel"],
      stdout: "piped",
      stderr: "null",
    });
    const { code, stdout } = await command.output();
    if (code === 0) {
      return textDecoder.decode(stdout).trim();
    }
  } catch (_error) {
    // ignore; fall back to manual detection
  }
  return null;
};

const defaultRealPath = async (value: string): Promise<string> => {
  try {
    return await Deno.realPath(value);
  } catch (_error) {
    return value;
  }
};

const defaultStat = async (value: string): Promise<Deno.FileInfo | null> => {
  try {
    return await Deno.stat(value);
  } catch (_error) {
    return null;
  }
};

const defaultReadTextFile = async (value: string): Promise<string | null> => {
  try {
    return await Deno.readTextFile(value);
  } catch (_error) {
    return null;
  }
};

export const createRepoFinder = (deps: RepoFinderDeps = {}): RepoFinder => {
  const runGitRevParse = deps.runGitRevParse ?? defaultRunGitRevParse;
  const realPath = deps.realPath ?? defaultRealPath;
  const stat = deps.stat ?? defaultStat;
  const readTextFile = deps.readTextFile ?? defaultReadTextFile;

  const resolve = async (pwd: string): Promise<string | null> => {
    const base = await realPath(pwd);

    const byGit = await runGitRevParse(base);
    if (byGit) {
      return await realPath(byGit);
    }

    let current = base;
    while (true) {
      const gitEntry = path.join(current, ".git");
      const info = await stat(gitEntry);

      if (info?.isDirectory) {
        return await realPath(current);
      }

      if (info?.isFile) {
        const content = await readTextFile(gitEntry);
        if (content) {
          const match = content.match(/gitdir:\s*(.+)\s*$/m);
          if (match) {
            return await realPath(current);
          }
        }
      }

      const parent = path.dirname(current);
      if (parent === current) {
        break;
      }
      current = parent;
    }

    return null;
  };

  return {
    resolve,
  };
};
