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
        // Use null character delimiter to preserve empty strings
        const data = [
          "success",
          command,
          options,
          settings.keymap.togglePreview,
        ].join("\0");
        await writer.write({ format: "%s\n", text: data });
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
