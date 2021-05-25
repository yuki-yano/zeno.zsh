import { readFromStdin } from "../util/io.ts";
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
  const input = readFromStdin();

  const [lbuffer, ..._rbuffer] = input.split("\n");
  const tokens = lbuffer.split(" ");

  let lbufferWithoutLastWord: string | undefined;
  if (tokens.length === 1) {
    lbufferWithoutLastWord = undefined;
  } else {
    lbufferWithoutLastWord = `${tokens.slice(0, -1).join(" ")} `;
  }

  const lastWord = lbuffer.split(" ").slice(-1)[0];
  const rbuffer = _rbuffer.join("\n");

  if (/(^$|^\s)/.exec(rbuffer) == null) {
    Deno.exit(0);
  }

  const placeholderRegex = /\{\{\S*\}\}/;

  const snippets = loadSnippets();
  for (let { snippet, keyword, enableMiddleOfLine } of snippets) {
    if (keyword == null) {
      continue;
    }

    if (enableMiddleOfLine !== true && lbuffer !== keyword) {
      continue;
    }

    if (keyword === lastWord) {
      const placeholderMatch = placeholderRegex.exec(snippet);

      let cursor: number;
      if (placeholderMatch == null) {
        cursor = (lbufferWithoutLastWord?.length ?? 0) + snippet.length + 1;
      } else {
        snippet = snippet.replace(placeholderRegex, "");
        cursor = (lbufferWithoutLastWord?.length ?? 0) + placeholderMatch.index;
      }

      return {
        status: "success",
        buffer: `${lbufferWithoutLastWord ?? ""}${snippet}${rbuffer}`.trim(),
        cursor,
      };
    }
  }

  return { status: "failure" };
};
