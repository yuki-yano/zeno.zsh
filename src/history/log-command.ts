import { writeResult } from "../app-helpers.ts";
import { createCommand } from "../command/types.ts";
import type { HistorySettings } from "../type/settings.ts";
import { parseInteger, parseNonEmptyString } from "./input-parsers.ts";
import {
  buildCliLiteralRedactPatterns,
  buildConfigRedactPatterns,
} from "./redact-patterns.ts";
import type {
  HistoryError,
  HistoryModule,
  LogCommandInput,
  Result,
} from "./types.ts";

export type HistoryLogCommandDeps = {
  getHistoryModule: () => Promise<HistoryModule>;
  loadHistorySettings: () => Promise<HistorySettings>;
  generateId: () => string;
  now: () => string;
};

type HistoryLogPayload = Record<string, unknown>;

const describeError = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const parseMeta = (value: unknown): Record<string, unknown> | null => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value === "string" && value.length > 0) {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed as Record<string, unknown>
        : { value: parsed };
    } catch (_error) {
      return { raw: value };
    }
  }

  return null;
};

const toLogCommandInput = (
  deps: HistoryLogCommandDeps,
  payload: HistoryLogPayload,
): LogCommandInput => {
  const exit = parseInteger(payload.exit) ?? 0;
  const durationMs = parseInteger(
    payload.durationMs ?? payload["duration-ms"] ?? null,
  );
  const repoRoot = parseNonEmptyString(payload.repoRoot);

  const ts = typeof payload.ts === "string" && payload.ts.length > 0
    ? payload.ts
    : deps.now();

  return {
    id: typeof payload.id === "string" && payload.id.length > 0
      ? payload.id
      : deps.generateId(),
    ts,
    command: typeof payload.command === "string" ? payload.command : "",
    exit,
    pwd: typeof payload.pwd === "string" ? payload.pwd : null,
    session: typeof payload.session === "string" ? payload.session : null,
    host: typeof payload.host === "string" ? payload.host : null,
    user: typeof payload.user === "string" ? payload.user : null,
    shell: typeof payload.shell === "string" ? payload.shell : "zsh",
    repo_root: repoRoot,
    duration_ms: durationMs,
    meta: parseMeta(payload.meta),
  };
};

export const createHistoryLogCommand = (
  deps: HistoryLogCommandDeps,
) =>
  createCommand(
    "history-log",
    async ({ input, writer }) => {
      const payload = (input as Record<string, unknown>).historyLog;
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        await writeResult(
          writer.write.bind(writer),
          "failure",
          "historyLog payload is required",
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
          `failed to load history settings: ${describeError(error)}`,
        );
        return;
      }
      const patternsResult = buildConfigRedactPatterns(settings.redact);
      if (!patternsResult.ok) {
        await writeResult(
          writer.write.bind(writer),
          "failure",
          patternsResult.error,
        );
        return;
      }

      const cliPatternsResult = buildCliLiteralRedactPatterns(
        (payload as Record<string, unknown>).redact,
      );
      if (!cliPatternsResult.ok) {
        await writeResult(
          writer.write.bind(writer),
          "failure",
          cliPatternsResult.error,
        );
        return;
      }

      const module = await deps.getHistoryModule();
      module.setRedactPatterns([
        ...patternsResult.value,
        ...cliPatternsResult.value,
      ]);

      const logInput = toLogCommandInput(
        deps,
        payload as HistoryLogPayload,
      );
      if (!logInput.command || logInput.command.trim().length === 0) {
        await writeResult(
          writer.write.bind(writer),
          "failure",
          "command is required",
        );
        return;
      }
      let result: Result<void, HistoryError>;
      try {
        result = await module.logCommand(logInput);
      } catch (error) {
        await writeResult(
          writer.write.bind(writer),
          "failure",
          `history log failed: ${describeError(error)}`,
        );
        return;
      }

      if (result.ok) {
        await writeResult(writer.write.bind(writer), "success");
        return;
      }

      await writeResult(
        writer.write.bind(writer),
        "failure",
        result.error.message,
      );
    },
  );
