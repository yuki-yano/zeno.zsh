import type { HistoryScope } from "../history/types.ts";
import type {
  CompletionCallbackFunction,
  CompletionSourceFunction,
  FzfOptions,
} from "./fzf.ts";

export type HistoryKeymapSettings = Readonly<{
  deleteSoft: string;
  deleteHard: string;
  toggleScope: string;
  togglePreview: string;
}>;

export type HistorySettings = Readonly<{
  defaultScope: HistoryScope;
  redact: readonly (string | RegExp)[];
  keymap: HistoryKeymapSettings;
  fzfCommand?: string;
  fzfOptions?: readonly string[];
}>;

export type Settings = Readonly<{
  snippets: readonly Snippet[];
  completions: readonly UserCompletionSource[];
  history: HistorySettings;
}>;

export type Snippet = Readonly<{
  name?: string;
  keyword?: string;
  snippet: string;
  context?: Readonly<{
    global?: boolean;
    buffer?: string;
    lbuffer?: string;
    rbuffer?: string;
  }>;
  evaluate?: boolean;
}>;

type UserCompletionSourceBase = Readonly<{
  name: string;
  patterns: readonly string[];
  excludePatterns?: readonly string[];
  preview?: string;
  options?: FzfOptions;
  callback?: string;
  callbackFunction?: CompletionCallbackFunction;
  callbackZero?: boolean;
}>;

export type UserCommandCompletionSource =
  & UserCompletionSourceBase
  & Readonly<{
    sourceCommand: string;
    sourceFunction?: never;
  }>;

export type UserFunctionCompletionSource =
  & UserCompletionSourceBase
  & Readonly<{
    sourceFunction: CompletionSourceFunction;
    sourceCommand?: never;
  }>;

export type UserCompletionSource =
  | UserCommandCompletionSource
  | UserFunctionCompletionSource;
