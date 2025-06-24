import type { FzfOptions } from "./fzf.ts";

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

export type UserCompletionSource = Readonly<{
  name: string;
  patterns: readonly string[];
  excludePatterns?: readonly string[];
  sourceCommand: string;
  preview?: string;
  options?: FzfOptions;
  callback: string;
  callbackZero?: boolean;
}>;
