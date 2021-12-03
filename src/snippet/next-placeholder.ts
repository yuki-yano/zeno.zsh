import { normalizeCommand } from "../command.ts";
import type { Input } from "../type/shell.ts";

export const nextPlaceholder = (
  input: Input,
) => {
  const lbuffer = input.lbuffer ?? "";
  const rbuffer = input.rbuffer ?? "";
  const buffer = normalizeCommand(`${lbuffer}${rbuffer}`);
  const placeholder = /{{.+?}}/;

  const result = buffer.match(placeholder);
  if (result == null) {
    return null;
  }

  return { nextBuffer: buffer.replace(placeholder, ""), index: result.index };
};
