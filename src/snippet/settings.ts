import { existsSync, yamlParse } from "../deps.ts";

type Settings = {
  snippets: Array<Snippet>;
};

type Snippet = {
  name: string;
  keyword: string;
  snippet: string;
};

const HOME = Deno.env.get("HOME");
const SETTING_FILE = `${HOME}/.config/fzf-preview.zsh/config.yml`;

export const loadSnippets = (): ReadonlyArray<Snippet> => {
  if (HOME == null) {
    console.error("$HOME is not exist");
    Deno.exit(1);
  }
  if (!existsSync(SETTING_FILE)) {
    console.error(`SETTING_FILE(${SETTING_FILE}) is not exist`);
    Deno.exit(1);
  }

  const file = Deno.readTextFileSync(SETTING_FILE);
  let parsed: Settings;

  try {
    parsed = yamlParse(file) as Settings;
  } catch (e: unknown) {
    console.error("Setting parsed error");
    throw (e);
  }

  return parsed.snippets;
};
