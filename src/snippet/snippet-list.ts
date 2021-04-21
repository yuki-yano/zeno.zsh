import { sprintf } from "../deps.ts";
// import { FZF_PREVIEW_DEFAULT_FZF_OPTIONS } from "../settings.ts";
import { loadSnippets } from "./settings.ts";

const DEFAULT_SNIPPET_LIST_OPTION = [
  "--delimiter=':'",
  "--prompt='Snippet> '",
];

export const snippetListCommand = () => {
  return `fzf ${DEFAULT_SNIPPET_LIST_OPTION.join(" ")}`
};

export const snippetList = () => {
  const snippets = loadSnippets();

  let keyWidth = 0;
  for (const snippet of snippets) {
    if (snippet.keyword.length > keyWidth) {
      keyWidth = snippet.keyword.length + 1;
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
      sprintf(`%-${keyWidth}s %s`, `${keyword}:`, snippet),
    ];
  }

  return keywordAndSnippet;
};
