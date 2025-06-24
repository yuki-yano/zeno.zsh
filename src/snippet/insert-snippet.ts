import { loadSnippets } from "./settings.ts";
import { normalizeCommand } from "../command.ts";
import { executeCommand } from "../util/exec.ts";
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

  const placeholderRegex = /\{\{[^{}\s]*\}\}/;

  const snippets = await loadSnippets();
  for (const { snippet, name, evaluate } of snippets) {
    if (name == null || snippetName !== name.trim()) {
      continue;
    }

    let snipText = snippet;
    if (evaluate === true) {
      snipText = await executeCommand(snippet);
    }

    const placeholderMatch = placeholderRegex.exec(snipText);

    let cursor = snipText.length + 1;
    if (placeholderMatch != null) {
      snipText = snipText.replace(placeholderRegex, "");
      cursor = placeholderMatch.index;
    }

    return {
      status: "success",
      buffer: `${lbuffer}${snipText}${rbuffer} `,
      cursor: (lbuffer.length + cursor),
    } as const;
  }

  return { status: "failure" };
};
