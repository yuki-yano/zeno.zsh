import type { CompletionSourceFunction, FzfOptions } from "./fzf.ts";

export type Settings = Readonly<{
  snippets: readonly Snippet[];
  completions: readonly UserCompletionSource[];
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
