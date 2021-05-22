import { loadCompletions } from "../../snippet/settings.ts";
import { CompletionSource } from "../../type/fzf.ts";
import { gitSources } from "./git.ts";

const ZENO_ENABLE_BUILTIN_COMPLETION =
  Deno.env.get("ZENO_ENABLE_BUILTIN_COMPLETION") === "1";

const userCompletions = loadCompletions();

export const completionSources: Array<CompletionSource> = [
  ...userCompletions,
  ...(ZENO_ENABLE_BUILTIN_COMPLETION ? gitSources : []),
];
