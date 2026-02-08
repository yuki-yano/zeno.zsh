import { loadCompletions } from "../settings.ts";
import type {
  CompletionSource,
  ResolvedCompletionSource,
} from "../../type/fzf.ts";
import { gitSources } from "./git.ts";
import { getEnv } from "../../config/env.ts";
import { getCompletionSourceCache } from "./cache.ts";

const createSourceId = (prefix: "u" | "b", index: number): string =>
  `${prefix}${String(index).padStart(4, "0")}`;

const attachSourceIds = (
  sources: readonly CompletionSource[],
  prefix: "u" | "b",
): readonly ResolvedCompletionSource[] =>
  sources.map((source, index) => ({
    ...source,
    id: createSourceId(prefix, index + 1),
  }));

export const getCompletionSources = async (): Promise<
  readonly ResolvedCompletionSource[]
> => {
  const cache = getCompletionSourceCache();
  const cached = cache.get();

  if (cached) {
    return cached;
  }

  const env = getEnv();
  const userCompletions = await loadCompletions();
  const userSources = attachSourceIds(userCompletions, "u");
  const builtinSources = env.DISABLE_BUILTIN_COMPLETION
    ? []
    : attachSourceIds(gitSources, "b");
  const sources = [
    ...userSources,
    ...builtinSources,
  ];

  cache.set(sources);
  return sources;
};
