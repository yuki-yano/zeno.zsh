import { readAllSync } from "../deps.ts";
import { loadSnippets } from "./settings.ts";

type AutoSnippetData = {
  status: "success";
  buffer: string;
  cursor: number;
} | {
  status: "failure";
  buffer?: undefined;
  cursor?: undefined;
};

export const autoSnippet = (): AutoSnippetData => {
  const decoder = new TextDecoder();
  const input = decoder.decode(readAllSync(Deno.stdin));

  const [lbuffer, ..._rbuffer] = input.split("\n");
  const rbuffer = _rbuffer.join("\n");

  if (/(^$|^\s)/.exec(rbuffer) == null) {
    Deno.exit(0);
  }

  const placeholderRegex = /\{\{\S*\}\}/;

  const snippets = loadSnippets();
  for (let { snippet, keyword } of snippets) {
    const keywordRegex = new RegExp(`^${keyword}$`);

    if (keywordRegex.exec(lbuffer) != null) {
      const placeholderMatch = placeholderRegex.exec(snippet);
      let cursor = snippet.length + 1;

      if (placeholderMatch != null) {
        snippet = snippet.replace(placeholderRegex, "");
        cursor = placeholderMatch.index;
      }

      return {
        status: "success",
        buffer: `${snippet} ${rbuffer}`.trim(),
        cursor,
      };
    }
  }

  return { status: "failure" };
};
