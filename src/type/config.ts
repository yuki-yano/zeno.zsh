import type { ConfigContext } from "./context.ts";
import type {
  HistoryKeymapSettings,
  HistorySettings,
  Snippet,
  UserCompletionSource,
} from "./settings.ts";

export type { ConfigContext } from "./context.ts";

/**
 * Partial history configuration accepted from TypeScript config files.
 */
export type ConfigHistoryInput = Readonly<{
  defaultScope?: HistorySettings["defaultScope"];
  redact?: HistorySettings["redact"];
  keymap?: Readonly<Partial<HistoryKeymapSettings>>;
  fzfCommand?: HistorySettings["fzfCommand"];
  fzfOptions?: HistorySettings["fzfOptions"];
}>;

/**
 * Partial settings accepted from TypeScript config files.
 */
export type ConfigSettingsInput = Readonly<{
  snippets?: readonly Snippet[];
  completions?: readonly UserCompletionSource[];
  history?: ConfigHistoryInput;
}>;

/**
 * Configuration function that returns partial settings based on context.
 */
export type ConfigFunction = (
  context: ConfigContext,
) => ConfigSettingsInput | Promise<ConfigSettingsInput>;

/**
 * Configuration module that exports a config function
 */
export type ConfigModule = {
  default: ConfigFunction;
};
