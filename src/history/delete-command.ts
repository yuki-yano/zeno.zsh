import { writeResult } from "../app-helpers.ts";
import { createCommand } from "../command/types.ts";
import type { HistoryModule } from "./types.ts";

export type HistoryDeleteCommandDeps = {
  getHistoryModule: () => Promise<Pick<HistoryModule, "deleteHistory">>;
};

type HistoryDeletePayload = Record<string, unknown>;

const extractId = (payload: HistoryDeletePayload): string | null => {
  const value = payload.id;
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  return null;
};

const extractHardFlag = (payload: HistoryDeletePayload): boolean => {
  if (typeof payload.hard === "boolean") {
    return payload.hard;
  }
  if (payload.hard === "true") {
    return true;
  }
  return false;
};

export const createHistoryDeleteCommand = (
  deps: HistoryDeleteCommandDeps,
) =>
  createCommand(
    "history-delete",
    async ({ input, writer }) => {
      const payload = (input as Record<string, unknown>).historyDelete;
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        await writeResult(
          writer.write.bind(writer),
          "failure",
          "historyDelete payload is required",
        );
        return;
      }

      const id = extractId(payload as HistoryDeletePayload);
      if (!id) {
        await writeResult(
          writer.write.bind(writer),
          "failure",
          "--id is required",
        );
        return;
      }

      const hard = extractHardFlag(payload as HistoryDeletePayload);

      try {
        const module = await deps.getHistoryModule();
        const result = await module.deleteHistory({ id, hard });

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
          error instanceof Error ? error.message : "history delete failed",
        );
      }
    },
  );
