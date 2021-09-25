import { sprintf } from "../deps.ts";
import { loadSnippets } from "./settings.ts";

const DEFAULT_SNIPPET_LIST_OPTION = [
  "--delimiter=':'",
  "--prompt='Snippet> '",
  "--height='80%'",
];

export const snippetListOptions = () => {
  return `${DEFAULT_SNIPPET_LIST_OPTION.join(" ")}`;
};

export const snippetList = () => {
  const snippets = loadSnippets();

  let nameWidth = 0;
  for (const { name } of snippets) {
    if (name == null) {
      continue;
    }

    if (name.length > nameWidth) {
      nameWidth = name.length + 1;
    }
  }

  let nameAndSnippet: Array<string> = [];
  for (const { snippet, name } of snippets) {
    if (snippet.split("\n").length > 2) {
      console.error("Snippet must be single line");
      break;
    }

    nameAndSnippet = [
      ...nameAndSnippet,
      sprintf(
        `%-${nameWidth}s %s`,
        name != null ? `${name}:` : "",
        snippet,
      ),
    ];
  }

  return nameAndSnippet;
};
