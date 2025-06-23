import { loadCompletions } from "../../snippet/settings.ts";
import type { CompletionSource } from "../../type/fzf.ts";
import { gitSources } from "./git.ts";
import { ZENO_DISABLE_BUILTIN_COMPLETION } from "../../settings.ts";

let cachedCompletionSources: readonly CompletionSource[] | undefined;

export const getCompletionSources = async (): Promise<
  readonly CompletionSource[]
> => {
  if (!cachedCompletionSources) {
    const userCompletions = await loadCompletions();
    cachedCompletionSources = [
      ...userCompletions,
      ...(ZENO_DISABLE_BUILTIN_COMPLETION ? [] : gitSources),
    ];
  }
  return cachedCompletionSources;
};
