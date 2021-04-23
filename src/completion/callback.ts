import type { CompletionResult } from "../type/fzf.ts";
import { completionSources } from "./source/index.ts";

export const resultToCompletionItems = (result: CompletionResult) => {
  const [id, _key, ...lines] = result;

  const source = completionSources.find((source) => (source.id === id));
  if (source == null) {
    return;
  }

  return source.callback(lines);
};
