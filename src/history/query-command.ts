import { writeResult } from "../app-helpers.ts";
import { createCommand } from "../command/types.ts";
import type { HistorySettings } from "../type/settings.ts";
import type {
  DeletedFilter,
  HistoryModule,
  HistoryQueryRequest,
  HistoryRecord,
  HistoryScope,
} from "./types.ts";

export interface HistoryQueryCommandDeps {
  getHistoryModule: () => Promise<HistoryModule>;
  loadHistorySettings: () => Promise<HistorySettings>;
  now: () => Date;
}

export interface HistoryQueryInput {
  scope?: unknown;
  cwd?: unknown;
  repoRoot?: unknown;
  directory?: unknown;
  session?: unknown;
  term?: unknown;
  after?: unknown;
  before?: unknown;
  exit?: unknown;
  limit?: unknown;
  id?: unknown;
  format?: unknown;
  deleted?: unknown;
  toggleScope?: unknown;
}

const SCOPE_ORDER: readonly HistoryScope[] = [
  "global",
  "repository",
  "directory",
  "session",
] as const;

const isHistoryScope = (value: unknown): value is HistoryScope =>
  typeof value === "string" &&
  (SCOPE_ORDER as readonly string[]).includes(value);

const parseScope = (
  value: unknown,
  fallback: HistoryScope,
): HistoryScope => {
  if (isHistoryScope(value)) {
    return value;
  }
  return fallback;
};

const nextScope = (current: HistoryScope): HistoryScope => {
  const index = SCOPE_ORDER.indexOf(current);
  if (index < 0) {
    return SCOPE_ORDER[0];
  }
  return SCOPE_ORDER[(index + 1) % SCOPE_ORDER.length];
};

const parseDeleted = (value: unknown): DeletedFilter => {
  if (value === "include" || value === "only" || value === "exclude") {
    return value;
  }
  if (value === true) {
    return "include";
  }
  if (value === false) {
    return "exclude";
  }
  return "exclude";
};

const parseLimit = (value: unknown, fallback = 2000): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return clampLimit(value);
  }
  if (typeof value === "string" && value.length > 0) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return clampLimit(parsed);
    }
  }
  return clampLimit(fallback);
};

const clampLimit = (value: number): number => {
  const safe = Math.min(Math.max(Math.floor(value), 1), 5000);
  return Number.isNaN(safe) ? 1 : safe;
};

const parseNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.length > 0) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const sanitizeString = (value: unknown): string | null => {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  return null;
};

const toHistoryQueryRequest = (
  payload: HistoryQueryInput,
  scope: HistoryScope,
  limit: number,
  deleted: DeletedFilter,
): HistoryQueryRequest => ({
  scope,
  limit,
  deleted,
  cwd: sanitizeString(payload.cwd),
  repoRoot: sanitizeString(payload.repoRoot),
  directory: sanitizeString(payload.directory),
  sessionId: sanitizeString(payload.session),
  term: sanitizeString(payload.term),
  after: sanitizeString(payload.after),
  before: sanitizeString(payload.before),
  exitCode: parseNumber(payload.exit),
  id: sanitizeString(payload.id),
});

const formatTimeAgo = (now: Date, iso: string): string => {
  const ts = new Date(iso);
  const diff = now.getTime() - ts.getTime();
  if (!Number.isFinite(diff)) {
    return "0s";
  }

  const seconds = Math.max(Math.round(diff / 1000), 0);
  if (seconds <= 1) {
    return "1s";
  }
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d`;
  }
  const weeks = Math.floor(days / 7);
  if (weeks < 5) {
    return `${weeks}w`;
  }
  const months = Math.floor(days / 30);
  if (months < 12) {
    return `${months}mo`;
  }
  const years = Math.floor(days / 365);
  return `${years}y`;
};

const createProfiler = () => {
  if (!Deno.env.get("ZENO_HISTORY_PROFILE")) {
    return {
      mark: (_label: string) => {},
      flush: (_prefix: string) => {},
    };
  }
  const origin = performance.now();
  let last = origin;
  const lines: string[] = [];
  return {
    mark: (label: string) => {
      const now = performance.now();
      lines.push(
        `${label}\t+${(now - last).toFixed(1)}ms\t${
          (now - origin).toFixed(1)
        }ms`,
      );
      last = now;
    },
    flush: (prefix: string) => {
      for (const line of lines) {
        console.error(`${prefix}${line}`);
      }
    },
  };
};

const formatLines = (
  items: readonly HistoryRecord[],
  now: Date,
  scope: HistoryScope,
): string[] => {
  const color = {
    reset: "\u001b[0m",
    dim: "\u001b[2m",
    green: "\u001b[32m",
    yellow: "\u001b[33m",
    red: "\u001b[31m",
  } as const;

  const pickTimeColor = (iso: string): string => {
    const ts = new Date(iso);
    const diff = now.getTime() - ts.getTime();
    if (!Number.isFinite(diff)) {
      return color.dim;
    }
    if (diff < 0) {
      return color.green;
    }
    const hour = 60 * 60 * 1000;
    const day = 24 * hour;
    if (diff <= hour) {
      return color.green;
    }
    if (diff <= day) {
      return color.yellow;
    }
    return color.red;
  };

  const seen = new Set<string>();
  const deduped: HistoryRecord[] = [];
  for (const record of items) {
    const key = (record.command ?? "").trim();
    if (key.length === 0) {
      deduped.push(record);
      continue;
    }
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(record);
  }

  const itemsShown = deduped.reduce(
    (count, record) => count + (record.id === "__empty__" ? 0 : 1),
    0,
  );

  const timeStrings = deduped.map((record) => formatTimeAgo(now, record.ts));
  const maxTimeWidth = timeStrings.reduce((max, value) => {
    return value.length > max ? value.length : max;
  }, 0);

  const lines = deduped.map((record, index) => {
    const rawTime = timeStrings[index];
    const paddedTime = rawTime.padStart(maxTimeWidth, " ");
    const timePart = `${pickTimeColor(record.ts)}${paddedTime}${color.reset}`;
    const exitPart = record.exit == null
      ? `${color.dim}·${color.reset}`
      : record.exit === 0
      ? `${color.green}✔${color.reset}`
      : `${color.red}✘${color.reset}`;
    const statusColumn = `${timePart} ${exitPart}${" ".repeat(3)}`;
    const commandPart = (record.command ?? "").replaceAll("\t", "    ");

    return `${record.id}\t${commandPart}\t${statusColumn}`;
  });

  const header =
    `\t${color.dim}command${color.reset}\t${color.dim}scope:${scope} · items:${itemsShown} · toggle:Ctrl-R${color.reset}`;
  return [header, ...lines];
};

export const createHistoryQueryCommand = (
  deps: HistoryQueryCommandDeps,
) =>
  createCommand(
    "history-query",
    async ({ input, writer }) => {
      const profiler = createProfiler();
      profiler.mark("start");

      const payload = (input as Record<string, unknown>).historyQuery;
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        await writeResult(
          writer.write.bind(writer),
          "failure",
          "historyQuery payload is required",
        );
        profiler.mark("invalid-payload");
        profiler.flush("history-query: ");
        return;
      }

      const queryInput = payload as HistoryQueryInput;

      let settings: HistorySettings;
      try {
        settings = await deps.loadHistorySettings();
        profiler.mark("load-settings");
      } catch (error) {
        await writeResult(
          writer.write.bind(writer),
          "failure",
          error instanceof Error
            ? `failed to load history settings: ${error.message}`
            : "failed to load history settings",
        );
        profiler.mark("load-settings-failed");
        profiler.flush("history-query: ");
        return;
      }

      const rawScope = typeof queryInput.scope === "string"
        ? queryInput.scope
        : null;
      const wantsAllScopes = rawScope === "all";
      const primaryScope = wantsAllScopes
        ? settings.defaultScope
        : parseScope(queryInput.scope, settings.defaultScope);
      profiler.mark("parse-scope");

      if (queryInput.toggleScope) {
        const next = nextScope(primaryScope);
        await writeResult(
          writer.write.bind(writer),
          "success",
          next,
        );
        profiler.mark("toggle-scope");
        profiler.flush("history-query: ");
        return;
      }

      const limit = parseLimit(queryInput.limit);
      const deleted = parseDeleted(queryInput.deleted);
      const hasExplicitId = sanitizeString(queryInput.id) !== null;
      const scopesToQuery = wantsAllScopes ? [...SCOPE_ORDER] : [primaryScope];
      profiler.mark("build-request");

      let module: HistoryModule;
      try {
        module = await deps.getHistoryModule();
        profiler.mark("get-module");
      } catch (error) {
        await writeResult(
          writer.write.bind(writer),
          "failure",
          error instanceof Error
            ? `failed to initialize history module: ${error.message}`
            : "failed to initialize history module",
        );
        profiler.mark("get-module-failed");
        profiler.flush("history-query: ");
        return;
      }

      const results: Array<{ scope: HistoryScope; items: HistoryRecord[] }> =
        [];
      for (const currentScope of scopesToQuery) {
        const request = toHistoryQueryRequest(
          queryInput,
          currentScope,
          limit,
          deleted,
        );
        let scopedResult;
        try {
          scopedResult = await module.queryHistory(request);
        } catch (error) {
          await writeResult(
            writer.write.bind(writer),
            "failure",
            error instanceof Error
              ? `history query failed: ${error.message}`
              : "history query failed",
          );
          profiler.mark(
            wantsAllScopes
              ? `query-history-throw:${currentScope}`
              : "query-history-throw",
          );
          profiler.flush("history-query: ");
          return;
        }

        if (!scopedResult.ok) {
          await writeResult(
            writer.write.bind(writer),
            "failure",
            scopedResult.error.message,
          );
          profiler.mark(
            wantsAllScopes
              ? `query-history-error:${currentScope}`
              : "query-history-error",
          );
          profiler.flush("history-query: ");
          return;
        }

        results.push({ scope: currentScope, items: scopedResult.value.items });
        profiler.mark(
          wantsAllScopes ? `query-history:${currentScope}` : "query-history",
        );
      }

      const format = typeof queryInput.format === "string"
        ? queryInput.format
        : "lines";
      profiler.mark("determine-format");

      const now = deps.now();

      if (format === "json") {
        if (wantsAllScopes) {
          const body = JSON.stringify(
            {
              scopes: Object.fromEntries(
                results.map(({ scope, items }) => [scope, items]),
              ),
            },
            null,
            2,
          );
          await writeResult(writer.write.bind(writer), "success", body);
          profiler.mark("write-json:all");
          profiler.flush("history-query: ");
          return;
        }

        const body = hasExplicitId
          ? JSON.stringify(results[0]?.items[0] ?? null, null, 2)
          : JSON.stringify(
            {
              scope: primaryScope,
              items: results[0]?.items ?? [],
            },
            null,
            2,
          );
        await writeResult(writer.write.bind(writer), "success", body);
        profiler.mark("write-json");
        profiler.flush("history-query: ");
        return;
      }

      if (wantsAllScopes) {
        const aggregated: string[] = [];
        for (const { scope: scopeName, items } of results) {
          const lines = formatLines(items, now, scopeName);
          profiler.mark(`format-lines:${scopeName}`);
          for (const line of lines) {
            aggregated.push(`${scopeName}\t${line}`);
          }
        }
        await writeResult(writer.write.bind(writer), "success", ...aggregated);
        profiler.mark("write-lines:all");
        profiler.flush("history-query: ");
        return;
      }

      const lines = formatLines(results[0]?.items ?? [], now, primaryScope);
      profiler.mark("format-lines");
      await writeResult(writer.write.bind(writer), "success", ...lines);
      profiler.mark("write-lines");
      profiler.flush("history-query: ");
    },
  );
