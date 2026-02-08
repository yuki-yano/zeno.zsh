import { parseStringArray } from "./input-parsers.ts";

export const MAX_REDACT_PATTERN_LENGTH = 512;

type PatternBuildResult =
  | { ok: true; value: RegExp[] }
  | { ok: false; error: string };

const escapeForLiteral = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const compilePattern = (
  pattern: string,
  label: string,
  literal: boolean,
): PatternBuildResult => {
  if (pattern.length > MAX_REDACT_PATTERN_LENGTH) {
    return {
      ok: false,
      error: `${label} is too long`,
    };
  }

  try {
    const source = literal ? escapeForLiteral(pattern) : pattern;
    return {
      ok: true,
      value: [new RegExp(source, "g")],
    };
  } catch (_error) {
    return {
      ok: false,
      error: `${label} is invalid`,
    };
  }
};

export const buildConfigRedactPatterns = (
  source: readonly unknown[],
): PatternBuildResult => {
  const patterns: RegExp[] = [];
  for (let index = 0; index < source.length; index++) {
    const entry = source[index];
    if (entry instanceof RegExp) {
      patterns.push(entry);
      continue;
    }
    if (typeof entry !== "string") {
      return {
        ok: false,
        error: `history.redact[${index}] must be string or RegExp`,
      };
    }
    const compiled = compilePattern(entry, `history.redact[${index}]`, false);
    if (!compiled.ok) {
      return compiled;
    }
    patterns.push(compiled.value[0]);
  }
  return { ok: true, value: patterns };
};

export const buildCliLiteralRedactPatterns = (
  value: unknown,
): PatternBuildResult => {
  const normalized = parseStringArray(value);
  const patterns: RegExp[] = [];
  for (let index = 0; index < normalized.length; index++) {
    const compiled = compilePattern(
      normalized[index],
      `pattern[${index}]`,
      true,
    );
    if (!compiled.ok) {
      return compiled;
    }
    patterns.push(compiled.value[0]);
  }
  return { ok: true, value: patterns };
};

export const buildCombinedRedactPatterns = (
  configSource: readonly unknown[],
  cliSource: unknown,
): PatternBuildResult => {
  const configPatterns = buildConfigRedactPatterns(configSource);
  if (!configPatterns.ok) {
    return configPatterns;
  }
  const cliPatterns = buildCliLiteralRedactPatterns(cliSource);
  if (!cliPatterns.ok) {
    return cliPatterns;
  }
  return {
    ok: true,
    value: [...configPatterns.value, ...cliPatterns.value],
  };
};
