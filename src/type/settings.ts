import type { FzfOptions } from "./fzf.ts";

export type Settings = {
  snippets: Array<Snippet>;
  completions: Array<UserCompletionSource>;
};

export type Snippet = {
  name: string;
  keyword?: string;
  snippet: string;
  context?: {
    buffer?: string;
    lbuffer?: string;
    rbuffer?: string;
  };
  evaluate?: boolean
};

export type UserCompletionSource = {
  name: string;
  patterns: Array<string>;
  sourceCommand: string;
  preview: string;
  options: FzfOptions;
  callback: string;
};
