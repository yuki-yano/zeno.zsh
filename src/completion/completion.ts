import { completionSources } from "./source/index.ts";

const hasDuplicateId = () => {
  const set = new Set(completionSources.map((source) => source.id));
  return set.size !== completionSources.length;
};

export const completion = (buffer: string) => {
  if (hasDuplicateId()) {
    return undefined;
  }

  return completionSources.find((
    source,
  ) => (source.patterns.some((pattern) => pattern.exec(buffer) != null)));
};
