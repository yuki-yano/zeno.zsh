import { DEFAULT_OPTIONS } from "../const/option.ts";
import { getSettings } from "../settings.ts";
import type { CompletionSource } from "../type/fzf.ts";
import type { Snippet } from "../type/settings.ts";

export const loadSnippets = (): Array<Snippet> => {
  return getSettings().snippets;
};

export const loadCompletions = (): Array<CompletionSource> => {
  const userCompletions = getSettings().completions;

  let completions: Array<CompletionSource> = [];
  for (const userCompletion of userCompletions) {
    const bind = [
      ...DEFAULT_OPTIONS["--bind"] ?? [],
      ...userCompletion.options["--bind"] ?? [],
    ];

    const completion: CompletionSource = {
      ...userCompletion,
      patterns: userCompletion.patterns.map((pattern) => new RegExp(pattern)),
      options: {
        ...DEFAULT_OPTIONS,
        ...userCompletion.options ?? {},
        "--bind": bind,
      },
    };

    completions = [
      ...completions,
      completion,
    ];
  }

  return completions;
};
