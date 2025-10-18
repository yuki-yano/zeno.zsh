import { normalizeCommand } from "../command.ts";
import type { Input } from "../type/shell.ts";
import { findPlaceholder } from "./snippet-utils.ts";

export const nextPlaceholder = (
  input: Input,
) => {
  const lbuffer = input.lbuffer ?? "";
  const rbuffer = input.rbuffer ?? "";
  const buffer = normalizeCommand(`${lbuffer}${rbuffer}`);

  const placeholder = findPlaceholder(buffer);
  if (placeholder == null) {
    return null;
  }

  return {
    nextBuffer: placeholder.nextBuffer,
    index: placeholder.index,
  };
};
