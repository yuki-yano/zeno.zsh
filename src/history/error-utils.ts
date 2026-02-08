import type { HistfileError } from "./histfile-editor.ts";
import type { HistoryError } from "./types.ts";

const describeError = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export const createIoHistoryError = (
  messagePrefix: string,
  cause: unknown,
): HistoryError => ({
  type: "io",
  message: `${messagePrefix}: ${describeError(cause)}`,
  cause,
});

export const createUnsupportedHistoryError = (
  fallbackMessage: string,
  cause: unknown,
): HistoryError => ({
  type: "unsupported",
  message: cause instanceof Error ? cause.message : fallbackMessage,
  cause,
});

export const mapHistfileErrorToHistoryError = (
  error: HistfileError,
): HistoryError => ({
  type: error.type === "lock" ? "histfile" : "io",
  message: error.message,
  cause: error.cause,
});
