import { DEFAULT_OPTIONS } from "../const/option.ts";
import { getSettings } from "../settings.ts";
import type {
  CompletionPreviewFunction,
  CompletionSource,
} from "../type/fzf.ts";
import type { UserCompletionSource } from "../type/settings.ts";

const resolvePreviewFunction = (
  source: UserCompletionSource,
): CompletionPreviewFunction | undefined => {
  if (typeof source.previewFunction === "function") {
    return source.previewFunction;
  }

  return undefined;
};

const resolvePreviewOption = (
  source: UserCompletionSource,
  userOptions: Readonly<Record<string, unknown>>,
): string | undefined => {
  const previewFromLegacy = source.preview;
  const previewFromOptions = userOptions["--preview"];

  if (
    typeof previewFromLegacy === "string" &&
    previewFromOptions !== undefined
  ) {
    throw new Error(
      `Invalid completion source "${source.name}": preview and options["--preview"] cannot be specified together`,
    );
  }

  if (typeof previewFromLegacy === "string") {
    return previewFromLegacy;
  }

  if (typeof previewFromOptions === "string") {
    return previewFromOptions;
  }

  return undefined;
};

const validatePreviewConfiguration = (
  source: UserCompletionSource,
  previewFunction: CompletionPreviewFunction | undefined,
  previewOption: string | undefined,
): void => {
  if (previewFunction && previewOption !== undefined) {
    throw new Error(
      `Invalid completion source "${source.name}": previewFunction cannot be used together with static preview options`,
    );
  }
};

export const loadCompletions = async (): Promise<
  readonly CompletionSource[]
> => {
  const settings = await getSettings();
  const userCompletions = settings.completions;

  const completions = userCompletions.map((userCompletion) => {
    const userOptions = userCompletion.options ?? {};
    const previewFunction = resolvePreviewFunction(userCompletion);
    const previewOption = resolvePreviewOption(
      userCompletion,
      userOptions as Readonly<Record<string, unknown>>,
    );
    validatePreviewConfiguration(
      userCompletion,
      previewFunction,
      previewOption,
    );

    const bind = [
      ...DEFAULT_OPTIONS["--bind"] ?? [],
      ...userOptions["--bind"] ?? [],
    ];

    const [patterns, excludePatterns] = [
      userCompletion.patterns,
      userCompletion.excludePatterns,
    ].map((patterns) => patterns?.map((pattern) => new RegExp(pattern)) ?? []);

    const {
      options: _options,
      preview: _preview,
      previewFunction: _previewFunction,
      ...rest
    } = userCompletion;

    const completion: CompletionSource = {
      ...rest,
      patterns,
      excludePatterns,
      options: {
        ...DEFAULT_OPTIONS,
        ...userCompletion.options ?? {},
        ...(previewOption !== undefined ? { "--preview": previewOption } : {}),
        "--bind": bind,
      },
      ...(previewFunction ? { previewFunction } : {}),
    };

    return completion;
  });

  return completions;
};
