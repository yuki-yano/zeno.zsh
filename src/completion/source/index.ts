import { loadCompletions } from "../../snippet/settings.ts";
import { CompletionSource } from "../../type/fzf.ts";
import { gitSources } from "./git.ts";

const userCompletions = loadCompletions();

export const completionSources: Array<CompletionSource> = [
  ...gitSources,
  ...userCompletions,
];
