import { sprintf } from "../deps.ts";
import { loadSnippets } from "./settings.ts";

const DEFAULT_SNIPPET_LIST_OPTION = [
  "--delimiter=':'",
  "--prompt='Snippet> '",
  "--height='80%'",
  "--no-multi",
];

export const snippetListOptions = () => {
  return `${DEFAULT_SNIPPET_LIST_OPTION.join(" ")}`;
};

const escapeInvisibleChars = (text: string): string => {
  return text
    .replace(/\\/g, "\\\\") // escape backslash first
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
};

export const snippetList = async () => {
  const loadedSnippets = await loadSnippets();

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
    sprintf(
      lineFormat,
      name?.length ? `${name}:` : "",
      escapeInvisibleChars(snippet),
    )
  );

  return nameAndSnippet;
};
