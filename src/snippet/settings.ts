import { DEFAULT_OPTIONS } from "../const/option.ts";
import { getSettings } from "../settings.ts";
import type { CompletionSource } from "../type/fzf.ts";
import type { Snippet } from "../type/settings.ts";

export const loadSnippets = (): readonly Snippet[] => {
  return getSettings().snippets;
};

export const loadCompletions = (): readonly CompletionSource[] => {
  const userCompletions = getSettings().completions;

  const completions = userCompletions.map((userCompletion) => {
    const bind = [
      ...DEFAULT_OPTIONS["--bind"] ?? [],
      ...userCompletion.options["--bind"] ?? [],
    ];

    const [patterns, excludePatterns] = [
      userCompletion.patterns,
      userCompletion.excludePatterns,
    ].map((patterns) => patterns?.map((pattern) => new RegExp(pattern)) ?? []);

    const completion: CompletionSource = {
      ...userCompletion,
      patterns,
      excludePatterns,
      options: {
        ...DEFAULT_OPTIONS,
        ...userCompletion.options ?? {},
        "--bind": bind,
      },
    };

    return completion;
  });

  return completions;
};
