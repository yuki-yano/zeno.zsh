import type { ConfigContext } from "./context.ts";

export type FzfOptions = Readonly<{
  "--ansi"?: true;
  "--multi"?: true;
  "--bind"?: readonly FzfOptionBind[];
  "--expect"?: string[];
  "--preview"?: string;
  "--no-separator"?: true;
  [otherProperty: string]: unknown;
}>;

export type FzfOptionBind = Readonly<{
  key: string;
  action: string;
}>;

export type CompletionSourceFunction = (
  context: ConfigContext,
) =>
  | ReadonlyArray<string>
  | Promise<ReadonlyArray<string>>;

export type CompletionCallbackFunction = (
  items: readonly string[],
) => string[] | Promise<string[]>;

type CompletionSourceBase = Readonly<{
  name: string;
  patterns: readonly RegExp[];
  excludePatterns?: readonly RegExp[];
  callback?: string;
  callbackFunction?: CompletionCallbackFunction;
  callbackZero?: boolean;
  options: FzfOptions;
}>;

export type CompletionCommandSource =
  & CompletionSourceBase
  & Readonly<{
    sourceCommand: string;
    sourceFunction?: never;
  }>;

export type CompletionFunctionSource =
  & CompletionSourceBase
  & Readonly<{
    sourceFunction: CompletionSourceFunction;
    sourceCommand?: never;
  }>;

export type CompletionSource =
  | CompletionCommandSource
  | CompletionFunctionSource;

export const isFunctionCompletionSource = (
  source: CompletionSource,
): source is CompletionFunctionSource =>
  typeof (source as Partial<CompletionFunctionSource>).sourceFunction ===
    "function";
