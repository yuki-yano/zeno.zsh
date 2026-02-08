import { writeResult } from "../app-helpers.ts";
import { createCommand } from "../command/types.ts";
import type { DedupeStrategy, ExportFormat, HistoryModule } from "./types.ts";
import type { HistorySettings } from "../type/settings.ts";
import { parseBooleanFlag, parseNonEmptyString } from "./input-parsers.ts";
import {
  buildCliLiteralRedactPatterns,
  buildConfigRedactPatterns,
} from "./redact-patterns.ts";

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
      const inputPath = parseNonEmptyString(payload.inputPath);
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
      const dryRun = parseBooleanFlag(payload.dryRun);

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

      const cliPatterns = buildCliLiteralRedactPatterns(payload.redact);
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
        const basePatternsResult = buildConfigRedactPatterns(settings.redact);

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
