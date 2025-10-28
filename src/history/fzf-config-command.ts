import { writeResult } from "../app-helpers.ts";
import { createCommand } from "../command/types.ts";
import type { HistorySettings } from "../type/settings.ts";

type HistoryFzfConfigDeps = {
  loadHistorySettings: () => Promise<HistorySettings>;
};

export const createHistoryFzfConfigCommand = (
  deps: HistoryFzfConfigDeps,
) =>
  createCommand(
    "history-fzf-config",
    async ({ writer }) => {
      try {
        const settings = await deps.loadHistorySettings();
        const command = settings.fzfCommand ?? "";
        const options = settings.fzfOptions?.join(" ") ?? "";
        await writeResult(
          writer.write.bind(writer),
          "success",
          command,
          options,
        );
      } catch (error) {
        await writeResult(
          writer.write.bind(writer),
          "failure",
          error instanceof Error
            ? `failed to load history fzf config: ${error.message}`
            : "failed to load history fzf config",
        );
      }
    },
  );
