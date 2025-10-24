export interface Redactor {
  applyAll(input: string): string;
  setPatterns(patterns: RegExp[]): void;
}

const MASK = "***";

export const createRedactor = (initialPatterns: RegExp[]): Redactor => {
  let patterns = [...initialPatterns];

  const applyAll = (input: string): string => {
    return patterns.reduce(
      (value, pattern) => value.replace(pattern, MASK),
      input,
    );
  };

  const setPatterns = (next: RegExp[]) => {
    patterns = [...next];
  };

  return {
    applyAll,
    setPatterns,
  };
};
