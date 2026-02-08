import { writeResult } from "../app-helpers.ts";
import { createCommand } from "../command/types.ts";
import type { HistorySettings } from "../type/settings.ts";
import {
  parseInteger,
  parseLimit,
  parseNonEmptyString,
} from "./input-parsers.ts";
import {
  buildCliLiteralRedactPatterns,
  buildConfigRedactPatterns,
} from "./redact-patterns.ts";
import type {
  DeletedFilter,
  ExportFormat,
  ExportRequest,
  HistoryModule,
} from "./types.ts";

export type HistoryExportCommandDeps = {
  getHistoryModule: () => Promise<
    Pick<HistoryModule, "setRedactPatterns" | "exportHistory">
  >;
  loadHistorySettings: () => Promise<HistorySettings>;
  now: () => Date;
};

type HistoryExportPayload = {
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
};

const isHistoryExportPayload = (
  value: unknown,
): value is HistoryExportPayload =>
  value != null && typeof value === "object" && !Array.isArray(value);

const parseDeleted = (value: unknown): DeletedFilter => {
  if (value === "include" || value === "only" || value === "exclude") {
    return value;
  }
  return "exclude";
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
  const outputPath = parseNonEmptyString(payload.outputPath);
  if (!format || !outputPath) {
    return null;
  }

  const scope = parseNonEmptyString(
    payload.scope,
  ) as HistoryExportPayload["scope"];
  const request: ExportRequest = {
    format,
    outputPath,
    scope:
      (scope === "repository" || scope === "directory" || scope === "session" ||
          scope === "global")
        ? scope
        : settings.defaultScope,
    limit: parseLimit(payload.limit, { fallback: 2000, min: 1 }),
    deleted: parseDeleted(payload.deleted),
    cwd: parseNonEmptyString(payload.cwd),
    repoRoot: parseNonEmptyString(payload.repoRoot),
    directory: parseNonEmptyString(payload.directory),
    sessionId: parseNonEmptyString(payload.session),
    term: parseNonEmptyString(payload.term),
    after: parseNonEmptyString(payload.after),
    before: parseNonEmptyString(payload.before),
    exitCode: parseInteger(payload.exit),
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

      const cliPatternsResult = buildCliLiteralRedactPatterns(payload.redact);
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
        const configPatternsResult = buildConfigRedactPatterns(settings.redact);
        if (!configPatternsResult.ok) {
          await writeResult(
            writer.write.bind(writer),
            "failure",
            configPatternsResult.error,
          );
          return;
        }
        module.setRedactPatterns([
          ...configPatternsResult.value,
          ...cliPatternsResult.value,
        ]);

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
