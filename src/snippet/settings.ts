import { getSettings } from "../settings.ts";
import type { Snippet } from "../type/settings.ts";

export const loadSnippets = async (): Promise<readonly Snippet[]> => {
  const settings = await getSettings();
  return settings.snippets;
};
