import { CompletionSource } from "../../type/fzf.ts";
import { gitSources } from "./git.ts";

export const completionSources: Array<CompletionSource> = [
  ...gitSources,
];
