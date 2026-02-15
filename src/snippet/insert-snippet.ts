import { loadSnippets } from "./settings.ts";
import { normalizeCommand } from "../command.ts";
import { executeCommand } from "../util/exec.ts";
import { applyFirstPlaceholder } from "./placeholder.ts";
import type { Input } from "../type/shell.ts";

export type InsertSnippetData = {
  status: "success";
  buffer: string;
  cursor: number;
} | {
  status: "failure";
  buffer?: undefined;
  cursor?: undefined;
};

export const insertSnippet = async (
  input: Input,
): Promise<InsertSnippetData> => {
  const lbuffer = normalizeCommand(input.lbuffer ?? "", {
    keepTrailingSpace: true,
  });
  const rbuffer = normalizeCommand(input.rbuffer ?? "", {
    keepLeadingSpace: true,
  });
  const snippetName = (input.snippet ?? "").trim();

  const snippets = await loadSnippets();
  for (const { snippet, name, evaluate } of snippets) {
    if (name == null || snippetName !== name.trim()) {
      continue;
    }

    let snipText = snippet;
    if (evaluate === true) {
      snipText = await executeCommand(snippet);
    }

    const { text: preparedSnippet, cursor } = applyFirstPlaceholder(
      snipText,
      snipText.length + 1,
    );

    return {
      status: "success",
      buffer: `${lbuffer}${preparedSnippet}${rbuffer} `,
      cursor: lbuffer.length + cursor,
    } as const;
  }

  return { status: "failure" };
};
