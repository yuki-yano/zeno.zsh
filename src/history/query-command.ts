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

export type HistoryQueryCommandDeps = {
  getHistoryModule: () => Promise<HistoryModule>;
  loadHistorySettings: () => Promise<HistorySettings>;
  now: () => Date;
};

export type HistoryQueryInput = {
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
};

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

const SMART_HISTORY_DELIMITER = "\u00a0";
const HOME_DIRECTORY = (() => {
  try {
    return typeof Deno !== "undefined" ? Deno.env.get("HOME") ?? null : null;
  } catch {
    return null;
  }
})();

const getHomeDirectory = (): string | null => {
  try {
    return typeof Deno !== "undefined"
      ? Deno.env.get("HOME") ?? HOME_DIRECTORY
      : HOME_DIRECTORY;
  } catch {
    return HOME_DIRECTORY;
  }
};

const sanitizeDisplayField = (value: string): string =>
  value.replaceAll("\t", "    ").replaceAll(SMART_HISTORY_DELIMITER, " ");

const sanitizeRawCommand = (value: string): string =>
  value.replaceAll("\t", "\u001f").replaceAll(SMART_HISTORY_DELIMITER, " ");

const formatPath = (pwd: string | null): string => {
  if (!pwd) {
    return "";
  }
  const homeDir = getHomeDirectory();
  if (homeDir && homeDir.length > 0) {
    if (pwd === homeDir) {
      return "~";
    }
    if (pwd.startsWith(`${homeDir}/`)) {
      return `~/${pwd.slice(homeDir.length + 1)}`;
    }
  }
  return pwd;
};

const formatDurationValue = (durationMs: number | null): string => {
  if (
    durationMs == null || !Number.isFinite(durationMs) || durationMs <= 0
  ) {
    return "";
  }
  if (durationMs < 1000) {
    return `${Math.round(durationMs)}ms`;
  }
  const seconds = durationMs / 1000;
  if (seconds < 60) {
    const rounded = Math.round(seconds * 10) / 10;
    return `${String(rounded)}s`;
  }
  const minutes = seconds / 60;
  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  }
  const hours = minutes / 60;
  if (hours < 24) {
    return `${Math.round(hours)}h`;
  }
  const days = hours / 24;
  return `${Math.round(days)}d`;
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

const formatSmartLines = (
  items: readonly HistoryRecord[],
  now: Date,
): string[] => {
  const color = {
    reset: "\u001b[0m",
    dim: "\u001b[2m",
    green: "\u001b[32m",
    yellow: "\u001b[33m",
    red: "\u001b[31m",
  } as const;

  const pickDurationColor = (durationMs: number | null): string => {
    if (durationMs == null || !Number.isFinite(durationMs) || durationMs <= 0) {
      return color.dim;
    }
    if (durationMs <= 1000) {
      return color.green;
    }
    if (durationMs <= 10000) {
      return color.yellow;
    }
    return color.red;
  };

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
    const commandValue = sanitizeDisplayField(record.command ?? "");
    const commandDisplay = commandValue.length > 0 ? `  ${commandValue}` : "";
    const rawCommand = sanitizeRawCommand(record.command ?? "");
    const pathValue = sanitizeDisplayField(
      formatPath(record.pwd ?? null),
    );
    const durationValue = formatDurationValue(record.duration_ms);
    const durationColor = pickDurationColor(record.duration_ms);
    const pathDisplay = pathValue.length > 0
      ? `  ${color.dim}${pathValue}${color.reset}`
      : "";
    const durationDisplay = durationValue.length > 0
      ? `  ${durationColor}${durationValue}${color.reset}`
      : "";

    return [
      record.id,
      timePart,
      exitPart,
      commandDisplay,
      pathDisplay,
      durationDisplay,
      rawCommand,
    ].join(SMART_HISTORY_DELIMITER);
  });

  return lines;
};

export const createHistoryQueryCommand = (
  deps: HistoryQueryCommandDeps,
) =>
  createCommand(
    "history-query",
    async ({ input, writer }) => {
      const payload = (input as Record<string, unknown>).historyQuery;
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        await writeResult(
          writer.write.bind(writer),
          "failure",
          "historyQuery payload is required",
        );
        return;
      }

      const queryInput = payload as HistoryQueryInput;

      let settings: HistorySettings;
      try {
        settings = await deps.loadHistorySettings();
      } catch (error) {
        await writeResult(
          writer.write.bind(writer),
          "failure",
          error instanceof Error
            ? `failed to load history settings: ${error.message}`
            : "failed to load history settings",
        );
        return;
      }

      const rawScope = typeof queryInput.scope === "string"
        ? queryInput.scope
        : null;
      const wantsAllScopes = rawScope === "all";
      const primaryScope = wantsAllScopes
        ? settings.defaultScope
        : parseScope(queryInput.scope, settings.defaultScope);
      if (queryInput.toggleScope) {
        const next = nextScope(primaryScope);
        await writeResult(
          writer.write.bind(writer),
          "success",
          next,
        );
        return;
      }

      const limit = parseLimit(queryInput.limit);
      const deleted = parseDeleted(queryInput.deleted);
      const hasExplicitId = sanitizeString(queryInput.id) !== null;
      const scopesToQuery = wantsAllScopes ? [...SCOPE_ORDER] : [primaryScope];
      let module: HistoryModule;
      try {
        module = await deps.getHistoryModule();
      } catch (error) {
        await writeResult(
          writer.write.bind(writer),
          "failure",
          error instanceof Error
            ? `failed to initialize history module: ${error.message}`
            : "failed to initialize history module",
        );
        return;
      }

      let settingsPatterns: RegExp[];
      try {
        settingsPatterns = settings.redact.map((pattern, index) => {
          if (pattern instanceof RegExp) {
            return pattern;
          }
          if (typeof pattern === "string" && pattern.length > 0) {
            return new RegExp(pattern, "g");
          }
          throw new Error(`history.redact[${index}] must be string or RegExp`);
        });
      } catch (error) {
        await writeResult(
          writer.write.bind(writer),
          "failure",
          error instanceof Error
            ? `invalid redact pattern: ${error.message}`
            : "invalid redact pattern",
        );
        return;
      }
      module.setRedactPatterns(settingsPatterns);

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
          return;
        }

        if (!scopedResult.ok) {
          await writeResult(
            writer.write.bind(writer),
            "failure",
            scopedResult.error.message,
          );
          return;
        }

        results.push({ scope: currentScope, items: scopedResult.value.items });
      }

      const rawFormat = typeof queryInput.format === "string"
        ? queryInput.format
        : "";
      const wantsJson = rawFormat === "json";

      const now = deps.now();

      if (wantsJson) {
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
        return;
      }

      if (wantsAllScopes) {
        const aggregated: string[] = [];
        for (const { scope: scopeName, items } of results) {
          const lines = formatSmartLines(items, now);
          for (const line of lines) {
            const parts = line.split(SMART_HISTORY_DELIMITER);
            if (parts.length >= 2) {
              parts[1] = `[${scopeName}] ${parts[1]}`;
            }
            aggregated.push(parts.join(SMART_HISTORY_DELIMITER));
          }
        }
        await writeResult(
          writer.write.bind(writer),
          "success",
          ...aggregated,
        );
        return;
      }

      const lines = formatSmartLines(results[0]?.items ?? [], now);
      await writeResult(writer.write.bind(writer), "success", ...lines);
    },
  );
