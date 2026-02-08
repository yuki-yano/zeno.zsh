import type { RepoFinder } from "./repo-finder.ts";
import type { HistoryQueryRequest, QueryFilter } from "./types.ts";

const normalizeLimit = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 2000;
  }
  return Math.max(1, Math.floor(value));
};

const sanitizeOptionalString = (
  value: string | null | undefined,
): string | null => value && value.length > 0 ? value : null;

const normalizeExitCode = (value: number | null | undefined): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const resolveRepository = async (
  repoFinder: RepoFinder,
  pwd: string | null,
): Promise<string | null> => {
  if (!pwd) {
    return null;
  }
  try {
    return await repoFinder.resolve(pwd);
  } catch (_error) {
    return null;
  }
};

export const buildHistoryQueryFilter = async (
  request: HistoryQueryRequest,
  repoFinder: RepoFinder,
): Promise<QueryFilter | "invalid"> => {
  const scope = request.scope;
  const limit = normalizeLimit(request.limit);

  let repoRoot = request.repoRoot ?? null;
  if (scope === "repository" && !repoRoot) {
    const resolveBase = request.cwd ?? request.directory ?? null;
    repoRoot = resolveBase
      ? await resolveRepository(repoFinder, resolveBase)
      : null;
  }

  let directory = request.directory ?? null;
  if (scope === "directory" && !directory) {
    directory = request.cwd ?? null;
  }

  const sessionId = request.sessionId ?? null;
  if (scope === "session" && !sessionId) {
    return "invalid";
  }

  return {
    scope,
    limit,
    deleted: request.deleted ?? "exclude",
    repoRoot: repoRoot !== undefined ? repoRoot : null,
    directory,
    sessionId,
    term: sanitizeOptionalString(request.term),
    after: sanitizeOptionalString(request.after),
    before: sanitizeOptionalString(request.before),
    exitCode: normalizeExitCode(request.exitCode),
  };
};
