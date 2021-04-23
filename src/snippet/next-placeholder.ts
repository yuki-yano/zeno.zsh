export const nextPlaceholder = (buffer: string) => {
  const placeholder = /{{.+?}}/;

  const result = buffer.match(placeholder);
  if (result == null) {
    return null;
  }

  return { nextBuffer: buffer.replace(placeholder, ""), index: result.index };
};
