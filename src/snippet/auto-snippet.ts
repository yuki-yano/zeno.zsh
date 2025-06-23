import { loadSnippets } from "./settings.ts";
import { normalizeCommand, parseCommand } from "../command.ts";
import { executeCommand } from "../util/exec.ts";
import type { Input } from "../type/shell.ts";

export type AutoSnippetData = {
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
  return bufferRegex.test(buffer);
};

export const autoSnippet = async (
  input: Input,
): Promise<AutoSnippetData> => {
  const {
    args: tokens,
    normalized: lbuffer,
    hasLeadingSpace,
  } = parseCommand(input.lbuffer ?? "", { keepTrailingSpace: true });
  const rbuffer = normalizeCommand(input.rbuffer ?? "", {
    keepLeadingSpace: true,
  });
  const buffer = `${lbuffer}${rbuffer}`;

  if (tokens.length === 0 || /(^$|^\s)/.test(rbuffer) === false) {
    return { status: "failure" };
  }

  const firstWord = tokens[0];
  const lastWord = tokens[tokens.length - 1];

  let lbufferWithoutLastWord = hasLeadingSpace ? " " : "";
  if (tokens.length > 1) {
    lbufferWithoutLastWord += `${tokens.slice(0, -1).join(" ")} `;
  }

  const placeholderRegex = /\{\{[^{}\s]*\}\}/;

  const snippets = loadSnippets();
  for (const { snippet, keyword, context, evaluate } of snippets) {
    if (keyword !== lastWord) {
      continue;
    }

    if (context == null) {
      if (keyword !== firstWord) {
        continue;
      }
    } else if (context != null && context.global !== true) {
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

    let snipText = snippet;
    if (evaluate === true) {
      snipText = await executeCommand(snippet);
    }

    const placeholderMatch = placeholderRegex.exec(snipText);

    let cursor = lbufferWithoutLastWord.length;
    if (placeholderMatch == null) {
      cursor += snipText.length + 1;
    } else {
      snipText = snipText.replace(placeholderRegex, "");
      cursor += placeholderMatch.index;
    }

    let newBuffer = `${lbufferWithoutLastWord}${snipText}${rbuffer}`;
    if (newBuffer.length < cursor) {
      newBuffer += " ";
    }

    return { status: "success", buffer: newBuffer, cursor };
  }

  return { status: "failure" };
};
