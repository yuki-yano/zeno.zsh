import { loadSnippets } from "./settings.ts";
import { normalizeCommand } from "../command.ts";
import type { Input } from "../type/shell.ts";
import { extractSnippetContent } from "./snippet-utils.ts";

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

    const { text: snipText, placeholderIndex } = await extractSnippetContent(
      snippet,
      evaluate,
    );

    const cursorOffset = placeholderIndex ?? (snipText.length + 1);

    return {
      status: "success",
      buffer: `${lbuffer}${snipText}${rbuffer} `,
      cursor: lbuffer.length + cursorOffset,
    } as const;
  }

  return { status: "failure" };
};
