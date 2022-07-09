import { loadCompletions } from "../../snippet/settings.ts";
import type { CompletionSource } from "../../type/fzf.ts";
import { gitSources } from "./git.ts";
import { ZENO_DISABLE_BUILTIN_COMPLETION } from "../../settings.ts";

const userCompletions = loadCompletions();

export const completionSources: readonly CompletionSource[] = [
  ...userCompletions,
  ...(ZENO_DISABLE_BUILTIN_COMPLETION ? [] : gitSources),
];
