import { writeResult } from "../app-helpers.ts";
import { createCommand } from "../command/types.ts";
import type { DedupeStrategy, ExportFormat, HistoryModule } from "./types.ts";
import type { HistorySettings } from "../type/settings.ts";

export interface HistoryImportCommandDeps {
  getHistoryModule: () => Promise<
    Pick<HistoryModule, "importHistory" | "setRedactPatterns">
  >;
  loadHistorySettings: () => Promise<HistorySettings>;
}

interface HistoryImportPayload {
  format?: unknown;
  inputPath?: unknown;
  dedupe?: unknown;
  dryRun?: unknown;
  redact?: unknown;
}

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

const buildCliPatterns = (value: unknown): Result<RegExp[], string> => {
  const errors: string[] = [];
  const patterns = normalizeStringArray(value).map((entry) => {
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
        const basePatterns = settings.redact.map((pattern) =>
          pattern instanceof RegExp ? pattern : new RegExp(pattern, "g")
        );
        module.setRedactPatterns([...basePatterns, ...cliPatterns.value]);

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
