export const parseInteger = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.length > 0) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export type ParseLimitOptions = {
  fallback?: number;
  min?: number;
  max?: number;
};

export const parseLimit = (
  value: unknown,
  options: ParseLimitOptions = {},
): number => {
  const fallback = options.fallback ?? 2000;
  const min = options.min ?? 1;
  const parsed = parseInteger(value) ?? fallback;
  const floored = Math.floor(parsed);
  const boundedMin = Math.max(floored, min);

  if (Number.isFinite(options.max)) {
    const boundedMax = Math.min(boundedMin, options.max!);
    return Number.isNaN(boundedMax) ? min : boundedMax;
  }

  return Number.isNaN(boundedMin) ? min : boundedMin;
};

export const parseNonEmptyString = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

export const parseStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === "string" ? entry : null))
      .filter((entry): entry is string => entry != null && entry.length > 0);
  }
  if (typeof value === "string" && value.length > 0) {
    return [value];
  }
  return [];
};

export const parseBooleanFlag = (value: unknown): boolean =>
  value === true || value === "true";
