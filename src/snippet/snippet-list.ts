import { sprintf } from "../deps.ts";
import { loadSnippets } from "./settings.ts";

const DEFAULT_SNIPPET_LIST_OPTION = [
  "--delimiter=':'",
  "--prompt='Snippet> '",
];

export const snippetListOptions = () => {
  return `${DEFAULT_SNIPPET_LIST_OPTION.join(" ")}`;
};

export const snippetList = () => {
  const snippets = loadSnippets();

  let keyWidth = 0;
  for (const { keyword } of snippets) {
    if (keyword == null) {
      continue;
    }

    if (keyword.length > keyWidth) {
      keyWidth = keyword.length + 1;
    }
  }

  let keywordAndSnippet: Array<string> = [];
  for (const { snippet, keyword } of snippets) {
    if (snippet.split("\n").length > 2) {
      console.error("Snippet must be single line");
      Deno.exit(1);
    }

    keywordAndSnippet = [
      ...keywordAndSnippet,
      sprintf(
        `%-${keyWidth}s %s`,
        keyword != null ? `${keyword}:` : "",
        snippet,
      ),
    ];
  }

  return keywordAndSnippet;
};
