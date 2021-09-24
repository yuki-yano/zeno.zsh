import { loadSnippets } from "./settings.ts";
import { exec, OutputMode } from "../deps.ts";

type AutoSnippetData = {
  status: "success";
  buffer: string;
  cursor: number;
} | {
  status: "failure";
  buffer?: undefined;
  cursor?: undefined;
};

const matchContext = (buffer: string, context: string): boolean => {
  const bufferRegex = new RegExp(context);
  if (bufferRegex.exec(buffer) == null) {
    return false;
  }

  return true;
};

export const autoSnippet = async (input: string): Promise<AutoSnippetData> => {
  const buffer = input.split("\n").join(" ");
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
    return { status: "failure" };
  }

  const placeholderRegex = /\{\{\S*\}\}/;

  const snippets = loadSnippets();
  for (let { snippet, keyword, context, evaluate } of snippets) {
    if (keyword == null) {
      continue;
    }

    if (context != null) {
      const {
        buffer: bufferContext,
        lbuffer: lbufferContext,
        rbuffer: rbufferContext,
      } = context;

      if (bufferContext != null && !matchContext(buffer, bufferContext)) {
        continue;
      }
      if (lbufferContext != null && !matchContext(lbuffer, lbufferContext)) {
        continue;
      }
      if (rbufferContext != null && !matchContext(rbuffer, rbufferContext)) {
        continue;
      }
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

      const snipText = evaluate === true
        ? (await exec(snippet, { output: OutputMode.Capture })).output.trimEnd()
        : snippet;

      return {
        status: "success",
        buffer: `${lbufferWithoutLastWord ?? ""}${snipText}${rbuffer}`.trim(),
        cursor,
      };
    }
  }

  return { status: "failure" };
};
