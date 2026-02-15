import type { HistoryScope } from "../history/types.ts";
import type {
  CompletionCallbackFunction,
  CompletionPreviewFunction,
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
  previewFunction?: CompletionPreviewFunction;
}>;

type ShellCallbackSpec = Readonly<{
  callback?: string;
  callbackZero?: boolean;
  callbackFunction?: never;
}>;

type FunctionCallbackSpec = Readonly<{
  callbackFunction: CompletionCallbackFunction;
  callback?: never;
  callbackZero?: never;
}>;

type CompletionCallbackSpec = ShellCallbackSpec | FunctionCallbackSpec;

export type UserCommandCompletionSource =
  & UserCompletionSourceBase
  & CompletionCallbackSpec
  & Readonly<{
    sourceCommand: string;
    sourceFunction?: never;
  }>;

export type UserFunctionCompletionSource =
  & UserCompletionSourceBase
  & CompletionCallbackSpec
  & Readonly<{
    sourceFunction: CompletionSourceFunction;
    sourceCommand?: never;
  }>;

export type UserCompletionSource =
  | UserCommandCompletionSource
  | UserFunctionCompletionSource;
