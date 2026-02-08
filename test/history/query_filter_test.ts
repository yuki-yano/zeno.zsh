import { describe, it } from "../deps.ts";
import { assertEquals, assertStrictEquals } from "../deps.ts";
import { buildHistoryQueryFilter } from "../../src/history/query-filter.ts";
import type { RepoFinder } from "../../src/history/repo-finder.ts";
import type { HistoryQueryRequest } from "../../src/history/types.ts";

const createRepoFinder = (
  resolveImpl: (path: string) => Promise<string | null>,
): RepoFinder => ({
  resolve(path) {
    return resolveImpl(path);
  },
});

describe("history query filter", () => {
  it("resolves repository from cwd when repository scope omits repoRoot", async () => {
    const request: HistoryQueryRequest = {
      scope: "repository",
      cwd: "/work/app",
      limit: 50,
      deleted: "exclude",
    };
    const filter = await buildHistoryQueryFilter(
      request,
      createRepoFinder((path) =>
        Promise.resolve(path === "/work/app" ? "/repo/root" : null)
      ),
    );

    assertStrictEquals(filter === "invalid", false);
    if (filter === "invalid") {
      return;
    }
    assertEquals(filter.scope, "repository");
    assertEquals(filter.repoRoot, "/repo/root");
    assertEquals(filter.limit, 50);
  });

  it("returns invalid when session scope lacks session id", async () => {
    const request: HistoryQueryRequest = {
      scope: "session",
      limit: 100,
      deleted: "exclude",
    };
    const filter = await buildHistoryQueryFilter(
      request,
      createRepoFinder(() => Promise.resolve(null)),
    );

    assertStrictEquals(filter, "invalid");
  });

  it("falls back directory scope to cwd", async () => {
    const request: HistoryQueryRequest = {
      scope: "directory",
      cwd: "/work/app",
      limit: 100,
      deleted: "include",
    };
    const filter = await buildHistoryQueryFilter(
      request,
      createRepoFinder(() => Promise.resolve(null)),
    );

    assertStrictEquals(filter === "invalid", false);
    if (filter === "invalid") {
      return;
    }
    assertEquals(filter.directory, "/work/app");
    assertEquals(filter.deleted, "include");
  });

  it("normalizes optional fields and clamps invalid limit", async () => {
    const request: HistoryQueryRequest = {
      scope: "global",
      limit: Number.NaN,
      deleted: "exclude",
      term: "",
      after: "",
      before: "2024-01-02T00:00:00.000Z",
      exitCode: 0,
    };
    const filter = await buildHistoryQueryFilter(
      request,
      createRepoFinder(() => Promise.resolve(null)),
    );

    assertStrictEquals(filter === "invalid", false);
    if (filter === "invalid") {
      return;
    }
    assertEquals(filter.limit, 2000);
    assertEquals(filter.term, null);
    assertEquals(filter.after, null);
    assertEquals(filter.before, "2024-01-02T00:00:00.000Z");
    assertEquals(filter.exitCode, 0);
  });
});
