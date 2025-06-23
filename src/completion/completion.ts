import { getCompletionSources } from "./source/index.ts";
import { normalizeCommand } from "../command.ts";
import type { Input } from "../type/shell.ts";

export const completion = async (input: Input) => {
  const lbuffer = normalizeCommand(input.lbuffer ?? "", {
    keepTrailingSpace: true,
  });
  const completionSources = await getCompletionSources();
  return completionSources.find(({ patterns, excludePatterns }) => (
    patterns.some((pattern) => pattern.test(lbuffer)) &&
    !excludePatterns?.some((pattern) => pattern.test(lbuffer))
  ));
};
