import { normalizeCommand } from "../command.ts";

export const nextPlaceholder = (
  input: Record<string, string | undefined>,
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
