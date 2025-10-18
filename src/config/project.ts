import { path } from "../deps.ts";
import { directoryExists, fileExists } from "../mod.ts";

export const detectProjectRoot = async (cwd: string): Promise<string> => {
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
