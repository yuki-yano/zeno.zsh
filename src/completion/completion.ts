import { completionSources } from "./source/index.ts";

export const completion = (buffer: string) => {
  return completionSources.find((
    source,
  ) => (source.patterns.some((pattern) => pattern.exec(buffer) != null)));
};
