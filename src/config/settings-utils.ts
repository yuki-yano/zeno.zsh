import { getDefaultSettings } from "./loader.ts";
import type { Settings, Snippet, UserCompletionSource } from "../type/settings.ts";

const cloneAndFreezeSnippet = (snippet: Snippet): Snippet =>
  Object.freeze({ ...snippet }) as Snippet;

const cloneAndFreezeCompletion = (
  completion: UserCompletionSource,
): UserCompletionSource => Object.freeze({ ...completion }) as UserCompletionSource;

export const freezeSettings = (settings: {
  snippets: readonly Snippet[];
  completions: readonly UserCompletionSource[];
}): Settings => Object.freeze({
  snippets: settings.snippets.map(cloneAndFreezeSnippet),
  completions: settings.completions.map(cloneAndFreezeCompletion),
}) as Settings;

export const mergeSettingsList = (
  settingsList: readonly Settings[],
): Settings => {
  if (settingsList.length === 0) {
    return freezeSettings(getDefaultSettings());
  }

  const merged = {
    snippets: settingsList.flatMap((settings) => settings.snippets),
    completions: settingsList.flatMap((settings) => settings.completions),
  };

  return freezeSettings(merged);
};

export const normalizeSettings = (value: unknown): Settings => {
  if (value && typeof value === "object") {
    const maybe = value as {
      snippets?: unknown;
      completions?: unknown;
    };
    const snippets = Array.isArray(maybe.snippets)
      ? maybe.snippets as ReadonlyArray<Snippet>
      : [];
    const completions = Array.isArray(maybe.completions)
      ? maybe.completions as ReadonlyArray<UserCompletionSource>
      : [];

    return freezeSettings({ snippets, completions });
  }

  return freezeSettings(getDefaultSettings());
};
