import { completionSources } from "./source/index.ts";
import { normalizeCommand } from "../command.ts";
import type { Input } from "../type/shell.ts";

export const completion = (
  input: Input,
) => {
  const lbuffer = normalizeCommand(input.lbuffer ?? "", {
    keepTrailingSpace: true,
  });
  return completionSources.find((
    source,
  ) => (source.patterns.some((pattern) => pattern.exec(lbuffer) != null)));
};
