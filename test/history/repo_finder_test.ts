import { describe, it } from "../deps.ts";
import { assertEquals } from "../deps.ts";
import { path } from "../../src/deps.ts";
import { createRepoFinder } from "../../src/history/repo-finder.ts";

const createTempStructure = async (
  builder: (root: string) => Promise<void>,
): Promise<{ root: string; cleanup: () => Promise<void> }> => {
  const root = await Deno.makeTempDir({ prefix: "zeno-repo-finder-" });
  await builder(root);
  return {
    root,
    cleanup: async () => {
      await Deno.remove(root, { recursive: true });
    },
  };
};

describe("RepoFinder", () => {
  it("falls back to scanning parent directories for .git directory", async () => {
    const structure = await createTempStructure(async (root) => {
      await Deno.mkdir(path.join(root, ".git"));
      await Deno.mkdir(path.join(root, "app"));
      await Deno.mkdir(path.join(root, "app", "src"));
    });

    try {
      const finder = createRepoFinder({
        runGitRevParse: () => Promise.resolve(null),
      });
      const result = await finder.resolve(
        path.join(structure.root, "app", "src"),
      );
      assertEquals(result, await Deno.realPath(structure.root));
    } finally {
      await structure.cleanup();
    }
  });

  it("reads gitdir pointer files", async () => {
    const structure = await createTempStructure(async (root) => {
      await Deno.mkdir(path.join(root, "worktree"));
      await Deno.writeTextFile(
        path.join(root, "worktree", ".git"),
        "gitdir: ../.git/worktrees/worktree\n",
      );
    });

    try {
      const finder = createRepoFinder({
        runGitRevParse: () => Promise.resolve(null),
      });
      const result = await finder.resolve(
        path.join(structure.root, "worktree"),
      );
      assertEquals(
        result,
        await Deno.realPath(path.join(structure.root, "worktree")),
      );
    } finally {
      await structure.cleanup();
    }
  });

  it("returns null when no repository is found", async () => {
    const structure = await createTempStructure(async (root) => {
      await Deno.mkdir(path.join(root, "sandbox"));
    });

    try {
      const finder = createRepoFinder({
        runGitRevParse: () => Promise.resolve(null),
      });
      const result = await finder.resolve(path.join(structure.root, "sandbox"));
      assertEquals(result, null);
    } finally {
      await structure.cleanup();
    }
  });
});
