import { writeResult } from "../app-helpers.ts";
import { createCommand } from "../command/types.ts";
import type { DedupeStrategy, ExportFormat, HistoryModule } from "./types.ts";
import type { HistorySettings } from "../type/settings.ts";

export type HistoryImportCommandDeps = {
  getHistoryModule: () => Promise<
    Pick<HistoryModule, "importHistory" | "setRedactPatterns">
  >;
  loadHistorySettings: () => Promise<HistorySettings>;
};

type HistoryImportPayload = {
  format?: unknown;
  inputPath?: unknown;
  dedupe?: unknown;
  dryRun?: unknown;
  redact?: unknown;
};

const allowedFormats = new Set([
  "ndjson",
  "zsh",
  "bash",
  "fish",
  "atuin-json",
]);

const allowedDedupe = new Set(["off", "strict", "loose"]);

const normalizeStringArray = (value: unknown): string[] => {
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

const MAX_PATTERN_LENGTH = 512;

const escapeForLiteral = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const compileLiteralPattern = (pattern: string, label: string): RegExp => {
  if (pattern.length > MAX_PATTERN_LENGTH) {
    throw new Error(`${label} is too long`);
  }
  return new RegExp(escapeForLiteral(pattern), "g");
};

const compileConfigPattern = (pattern: string, label: string): RegExp => {
  if (pattern.length > MAX_PATTERN_LENGTH) {
    throw new Error(`${label} is too long`);
  }
  return new RegExp(pattern, "g");
};

const buildCliPatterns = (value: unknown): Result<RegExp[], string> => {
  const normalized = normalizeStringArray(value);
  const patterns: RegExp[] = [];

  for (let index = 0; index < normalized.length; index++) {
    const entry = normalized[index];
    try {
      patterns.push(compileLiteralPattern(entry, `pattern[${index}]`));
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  return { ok: true, value: patterns };
};

type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export const createHistoryImportCommand = (
  deps: HistoryImportCommandDeps,
) =>
  createCommand(
    "history-import",
    async ({ input, writer }) => {
      const payload = (input as Record<string, unknown>).historyImport as
        | HistoryImportPayload
        | undefined;
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        await writeResult(
          writer.write.bind(writer),
          "failure",
          "historyImport payload is required",
        );
        return;
      }

      const format = typeof payload.format === "string" &&
          allowedFormats.has(payload.format)
        ? payload.format as ExportFormat
        : null;
      const inputPath = typeof payload.inputPath === "string"
        ? payload.inputPath
        : null;
      if (!format || !allowedFormats.has(format) || !inputPath) {
        await writeResult(
          writer.write.bind(writer),
          "failure",
          "--format and --in are required",
        );
        return;
      }

      const dedupe: DedupeStrategy =
        typeof payload.dedupe === "string" && allowedDedupe.has(payload.dedupe)
          ? payload.dedupe as DedupeStrategy
          : "off";
      const dryRun = payload.dryRun === true || payload.dryRun === "true";

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

      const cliPatterns = buildCliPatterns(payload.redact);
      if (!cliPatterns.ok) {
        await writeResult(
          writer.write.bind(writer),
          "failure",
          `invalid --redact pattern: ${cliPatterns.error}`,
        );
        return;
      }

      try {
        const module = await deps.getHistoryModule();
        const basePatternsResult = (() => {
          try {
            return {
              ok: true as const,
              value: settings.redact.map((pattern, index) =>
                pattern instanceof RegExp ? pattern : compileConfigPattern(
                  pattern,
                  `history.redact[${index}]`,
                )
              ),
            };
          } catch (error) {
            return {
              ok: false as const,
              error: error instanceof Error ? error.message : String(error),
            };
          }
        })();

        if (!basePatternsResult.ok) {
          await writeResult(
            writer.write.bind(writer),
            "failure",
            basePatternsResult.error,
          );
          return;
        }

        module.setRedactPatterns([
          ...basePatternsResult.value,
          ...cliPatterns.value,
        ]);

        const result = await module.importHistory({
          format,
          inputPath,
          dedupe,
          dryRun,
        });

        if (result.ok) {
          const summary = result.value;
          await writeResult(
            writer.write.bind(writer),
            "success",
            `added=${summary.added} skipped=${summary.skipped} total=${summary.total}`,
          );
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
          error instanceof Error ? error.message : "history import failed",
        );
      }
    },
  );
