import { exec, OutputMode } from "../deps.ts";
import { loadSnippets } from "./settings.ts";

type InsertSnippetData = {
  status: "success";
  buffer: string;
  cursor: number;
} | {
  status: "failure";
  buffer?: undefined;
  cursor?: undefined;
};

export const insertSnippet = async (
  input: string,
): Promise<InsertSnippetData> => {
  const content = input.split("\n");

  if (content.length > 4) {
    console.error("Unsupported multi line");
    return { status: "failure" };
  }

  let [snippetLine, lbuffer, rbuffer] = content;
  lbuffer = lbuffer ?? ""
  rbuffer = rbuffer ?? ""

  const [snippetName] = snippetLine.split(":");

  const snippets = loadSnippets();

  for (const { snippet, name, evaluate } of snippets) {
    if (name == null || snippetName.trim() !== name.trim()) {
      continue;
    }

    const placeholderRegex = /\{\{\S*\}\}/;
    const placeholderMatch = placeholderRegex.exec(snippet);

    let snipText = evaluate === true
      ? (await exec(snippet, { output: OutputMode.Capture })).output.trimEnd()
      : snippet;

    let cursor = snipText.length + 1;
    if (placeholderMatch != null) {
      snipText = snipText.replace(placeholderRegex, "");
      cursor = placeholderMatch.index;
    }

    return {
      status: "success",
      buffer: `${lbuffer}${snipText}${rbuffer ?? ""} `,
      cursor: (lbuffer.length + cursor),
    } as const;
  }

  return { status: "failure" };
};
