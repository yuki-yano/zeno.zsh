import { executeCommand } from "../util/exec.ts";

const PLACEHOLDER_PATTERN = "\\{\\{[^{}\\s]*\\}\\}";

const createPlaceholderRegex = () => new RegExp(PLACEHOLDER_PATTERN);

export const extractSnippetContent = async (
  snippet: string,
  evaluate: boolean | undefined,
): Promise<{
  text: string;
  placeholderIndex: number | null;
}> => {
  const resolved = evaluate === true ? await executeCommand(snippet) : snippet;
  const regex = createPlaceholderRegex();
  const match = regex.exec(resolved);
  if (!match) {
    return { text: resolved, placeholderIndex: null };
  }

  return {
    text: resolved.replace(regex, ""),
    placeholderIndex: match.index,
  };
};

export const findPlaceholder = (
  buffer: string,
): { index: number; nextBuffer: string } | null => {
  const regex = createPlaceholderRegex();
  const match = regex.exec(buffer);
  if (!match) {
    return null;
  }

  return {
    index: match.index,
    nextBuffer: buffer.replace(regex, ""),
  };
};
