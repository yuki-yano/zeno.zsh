import { loadCompletions } from "../../snippet/settings.ts";
import { CompletionSource } from "../../type/fzf.ts";
import { gitSources } from "./git.ts";

const ZENO_DISABLE_BUILTIN_COMPLETION =
  Deno.env.get("ZENO_DISABLE_BUILTIN_COMPLETION") == null ? false : true;

const userCompletions = loadCompletions();

export const completionSources: Array<CompletionSource> = [
  ...userCompletions,
  ...(ZENO_DISABLE_BUILTIN_COMPLETION ? [] : gitSources),
];
