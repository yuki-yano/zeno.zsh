import { normalizeCommand } from "../command.ts";
import type { Input } from "../type/shell.ts";

export const nextPlaceholder = (
  input: Input,
) => {
  const lbuffer = input.lbuffer ?? "";
  const rbuffer = input.rbuffer ?? "";
  const buffer = normalizeCommand(`${lbuffer}${rbuffer}`);
  const placeholderRegex = /\{\{[^{}\s]*\}\}/;

  const placeholderMatch = placeholderRegex.exec(buffer);
  if (placeholderMatch == null) {
    return null;
  }

  return {
    nextBuffer: buffer.replace(placeholderRegex, ""),
    index: placeholderMatch.index,
  };
};
