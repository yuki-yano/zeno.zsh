import { DEFAULT_OPTIONS } from "../const/option.ts";
import { existsSync, yamlParse } from "../deps.ts";
import type { CompletionSource } from "../type/fzf.ts";
import type { Settings, Snippet } from "../type/settings.ts";

const HOME = Deno.env.get("HOME");
const SETTING_FILE = `${HOME}/.config/zeno.zsh/config.yml`;

const parseSettings = (): Settings => {
  if (HOME == null) {
    Deno.exit(1);
  }

  let file: string;
  let settings: Settings = {
    snippets: [],
    completions: [],
  };

  if (existsSync(SETTING_FILE)) {
    file = Deno.readTextFileSync(SETTING_FILE);
  } else {
    return settings;
  }

  try {
    const parsedSettings = yamlParse(file) as Partial<Settings> | undefined;
    settings = {
      snippets: parsedSettings?.snippets ?? [],
      completions: parsedSettings?.completions ?? [],
    };
  } catch (e: unknown) {
    console.error("Setting parsed error");
    throw (e);
  }

  return settings;
};

export const loadSnippets = (): Array<Snippet> => {
  return parseSettings().snippets;
};

export const loadCompletions = (): Array<CompletionSource> => {
  const userCompletions = parseSettings().completions;

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
