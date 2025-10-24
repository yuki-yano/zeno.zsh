import { writeResult } from "../app-helpers.ts";
import { createCommand } from "../command/types.ts";
import type { HistorySettings } from "../type/settings.ts";
import type {
  DeletedFilter,
  ExportFormat,
  ExportRequest,
  HistoryModule,
} from "./types.ts";

export interface HistoryExportCommandDeps {
  getHistoryModule: () => Promise<
    Pick<HistoryModule, "setRedactPatterns" | "exportHistory">
  >;
  loadHistorySettings: () => Promise<HistorySettings>;
  now: () => Date;
}

interface HistoryExportPayload {
  format?: unknown;
  outputPath?: unknown;
  scope?: unknown;
  cwd?: unknown;
  directory?: unknown;
  session?: unknown;
  repoRoot?: unknown;
  limit?: unknown;
  deleted?: unknown;
  term?: unknown;
  after?: unknown;
  before?: unknown;
  exit?: unknown;
  redact?: unknown;
}

const isHistoryExportPayload = (
  value: unknown,
): value is HistoryExportPayload =>
  value != null && typeof value === "object" && !Array.isArray(value);

const toStringValue = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

const parseLimit = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(1, Math.floor(value));
  }
  if (typeof value === "string" && value.length > 0) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return Math.max(1, parsed);
    }
  }
  return 2000;
};

const parseDeleted = (value: unknown): DeletedFilter => {
  if (value === "include" || value === "only" || value === "exclude") {
    return value;
  }
  return "exclude";
};

const parseExit = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.length > 0) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
};

const normalizeRedactList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === "string" ? entry : null))
      .filter((entry): entry is string => entry != null && entry.length > 0);
  }
  if (typeof value === "string" && value.length > 0) {
    return [value];
  }
  return [];
};

type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

const buildCliPatterns = (value: unknown): Result<RegExp[], string> => {
  const errors: string[] = [];
  const patterns = normalizeRedactList(value).map((entry) => {
    try {
      return new RegExp(entry, "g");
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      return null;
    }
  }).filter((entry): entry is RegExp => entry != null);

  if (errors.length > 0) {
    return { ok: false, error: errors.join(", ") };
  }

  return { ok: true, value: patterns };
};

const combinePatterns = (
  settings: HistorySettings,
  cliPatterns: RegExp[],
): RegExp[] => {
  const base = settings.redact.map((pattern) =>
    pattern instanceof RegExp ? pattern : new RegExp(pattern, "g")
  );
  return [...base, ...cliPatterns];
};

const ensureFormat = (value: unknown): ExportFormat | null => {
  if (typeof value !== "string") {
    return null;
  }
  const allowed: ExportFormat[] = [
    "ndjson",
    "zsh",
    "bash",
    "fish",
    "atuin-json",
  ];
  return allowed.includes(value as ExportFormat) ? value as ExportFormat : null;
};

const buildExportRequest = (
  payload: HistoryExportPayload,
  settings: HistorySettings,
): ExportRequest | null => {
  const format = ensureFormat(payload.format);
  const outputPath = toStringValue(payload.outputPath);
  if (!format || !outputPath) {
    return null;
  }

  const scope = toStringValue(payload.scope) as HistoryExportPayload["scope"];
  const request: ExportRequest = {
    format,
    outputPath,
    scope:
      (scope === "repository" || scope === "directory" || scope === "session" ||
          scope === "global")
        ? scope
        : settings.defaultScope,
    limit: parseLimit(payload.limit),
    deleted: parseDeleted(payload.deleted),
    cwd: toStringValue(payload.cwd),
    repoRoot: toStringValue(payload.repoRoot),
    directory: toStringValue(payload.directory),
    sessionId: toStringValue(payload.session),
    term: toStringValue(payload.term),
    after: toStringValue(payload.after),
    before: toStringValue(payload.before),
    exitCode: parseExit(payload.exit),
  };

  return request;
};

export const createHistoryExportCommand = (
  deps: HistoryExportCommandDeps,
) =>
  createCommand(
    "history-export",
    async ({ input, writer }) => {
      const payload = (input as Record<string, unknown>).historyExport;
      if (!isHistoryExportPayload(payload)) {
        await writeResult(
          writer.write.bind(writer),
          "failure",
          "historyExport payload is required",
        );
        return;
      }

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

      const cliPatternsResult = buildCliPatterns(payload.redact);
      if (!cliPatternsResult.ok) {
        await writeResult(
          writer.write.bind(writer),
          "failure",
          `invalid --redact pattern: ${cliPatternsResult.error}`,
        );
        return;
      }

      const request = buildExportRequest(payload, settings);
      if (!request) {
        await writeResult(
          writer.write.bind(writer),
          "failure",
          "--format and --out are required",
        );
        return;
      }

      try {
        const module = await deps.getHistoryModule();
        module.setRedactPatterns(
          combinePatterns(settings, cliPatternsResult.value),
        );

        const result = await module.exportHistory(request);
        if (result.ok) {
          await writeResult(writer.write.bind(writer), "success");
          return;
        }

        await writeResult(
          writer.write.bind(writer),
          "failure",
          result.error.message,
        );
      } catch (error) {
        await writeResult(
          writer.write.bind(writer),
          "failure",
          error instanceof Error ? error.message : "history export failed",
        );
      }
    },
  );
