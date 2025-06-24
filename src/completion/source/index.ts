import { loadCompletions } from "../settings.ts";
import type { CompletionSource } from "../../type/fzf.ts";
import { gitSources } from "./git.ts";
import { getEnv } from "../../config/env.ts";
import { getCompletionSourceCache } from "./cache.ts";

export const getCompletionSources = async (): Promise<
  readonly CompletionSource[]
> => {
  const cache = getCompletionSourceCache();
  const cached = cache.get();

  if (cached) {
    return cached;
  }

  const env = getEnv();
  const userCompletions = await loadCompletions();
  const sources = [
    ...userCompletions,
    ...(env.DISABLE_BUILTIN_COMPLETION ? [] : gitSources),
  ];

  cache.set(sources);
  return sources;
};
