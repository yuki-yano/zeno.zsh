export const placeholderRegex = /\{\{[^{}\s]*\}\}/;

export type PlaceholderApplication = {
  text: string;
  cursor: number;
};

/**
 * Remove the first placeholder (`{{...}}`) and return its cursor position.
 * If no placeholder exists, the text is returned as-is and the fallback cursor is used.
 *
 * @param text - Input text that may contain placeholders
 * @param fallbackCursor - Cursor position to use when no placeholder is found
 */
export const applyFirstPlaceholder = (
  text: string,
  fallbackCursor = text.length,
): PlaceholderApplication => {
  const placeholderMatch = placeholderRegex.exec(text);
  if (placeholderMatch == null) {
    return { text, cursor: fallbackCursor };
  }

  return {
    text: text.replace(placeholderRegex, ""),
    cursor: placeholderMatch.index,
  };
};
