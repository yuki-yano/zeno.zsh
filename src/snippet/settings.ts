import { DEFAULT_OPTIONS } from "../const/option.ts";
import { existsSync, yamlParse } from "../deps.ts";
import type { CompletionSource } from "../type/fzf.ts";
import type { Settings, Snippet } from "../type/settings.ts";

const HOME = Deno.env.get("HOME");
const SETTING_FILE = `${HOME}/.config/fzf-preview.zsh/config.yml`;

const parseSettings = (): Settings => {
  if (HOME == null) {
    console.error("$HOME is not exist");
    Deno.exit(1);
  }
  if (!existsSync(SETTING_FILE)) {
    console.error(`SETTING_FILE(${SETTING_FILE}) is not exist`);
    console.error(`Please execute command: "touch ${SETTING_FILE}"`);
    Deno.exit(1);
  }

  const file = Deno.readTextFileSync(SETTING_FILE);
  let settings: Settings;

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
      preview: userCompletion.preview ?? "",
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
