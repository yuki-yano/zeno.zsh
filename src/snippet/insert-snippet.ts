import { readFromStdin } from "../util/io.ts";

export const insertSnippet = () => {
  const content = readFromStdin().split("\n");

  if (content.length > 4) {
    console.error("Unsupported multi line");
    Deno.exit(1);
  }

  const [snippetLine, lbuffer, rbuffer] = content;
  const [_, ...snipArray] = snippetLine.split(":");

  let snippet = snipArray.join(":").trim();

  const placeholderRegex = /\{\{\S*\}\}/;
  const placeholderMatch = placeholderRegex.exec(snippet);

  let cursor = snippet.length + 1;
  if (placeholderMatch != null) {
    snippet = snippet.replace(placeholderRegex, "");
    cursor = placeholderMatch.index;
  }

  return {
    status: "success",
    buffer: `${lbuffer}${snippet}${rbuffer} `,
    cursor: (lbuffer.length + cursor).toString(),
  } as const;
};
