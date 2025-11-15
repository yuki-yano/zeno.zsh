import { DEFAULT_OPTIONS } from "../const/option.ts";
import { getSettings } from "../settings.ts";
import type { CompletionSource } from "../type/fzf.ts";

export const loadCompletions = async (): Promise<
  readonly CompletionSource[]
> => {
  const settings = await getSettings();
  const userCompletions = settings.completions;

  const completions = userCompletions.map((userCompletion) => {
    // Validate that callback and callbackFunction are mutually exclusive
    if (userCompletion.callback && userCompletion.callbackFunction) {
      throw new Error(
        `Completion "${userCompletion.name}": cannot use both "callback" and "callbackFunction". Please use only one.`,
      );
    }

    const userOptions = userCompletion.options ?? {};

    const bind = [
      ...DEFAULT_OPTIONS["--bind"] ?? [],
      ...userOptions["--bind"] ?? [],
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
