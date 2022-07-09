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
  const loadedSnippets = loadSnippets();

  const snippets = loadedSnippets.filter(({ snippet }) =>
    !snippet.includes("\n")
  );
  if (snippets.length !== loadedSnippets.length) {
    console.error("Snippet must be single line");
  }

  const nameWidths = snippets.map(({ name }) => name?.length ?? 0);
  const nameWidth = Math.max(...nameWidths) + 1;
  const lineFormat = `%-${nameWidth}s  %s`;

  const nameAndSnippet = snippets.map(({ snippet, name }) =>
    sprintf(lineFormat, name?.length ? `${name}:` : "", snippet)
  );

  return nameAndSnippet;
};
