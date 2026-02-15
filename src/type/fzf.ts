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

export type CompletionCallbackFunction = (params: {
  selected: readonly string[];
  context: ConfigContext;
  lbuffer: string;
  rbuffer: string;
  expectKey?: string;
}) =>
  | ReadonlyArray<string>
  | Promise<ReadonlyArray<string>>;

export type CompletionPreviewFunction = (params: {
  item: string;
  context: ConfigContext;
  lbuffer: string;
  rbuffer: string;
}) => string | Promise<string>;

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

type CompletionSourceBase =
  & Readonly<{
    name: string;
    patterns: readonly RegExp[];
    excludePatterns?: readonly RegExp[];
    options: FzfOptions;
    previewFunction?: CompletionPreviewFunction;
  }>
  & CompletionCallbackSpec;

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

type CompletionSourceId = Readonly<{
  id: string;
}>;

export type ResolvedCompletionCommandSource =
  & CompletionCommandSource
  & CompletionSourceId;

export type ResolvedCompletionFunctionSource =
  & CompletionFunctionSource
  & CompletionSourceId;

export type ResolvedCompletionSource =
  | ResolvedCompletionCommandSource
  | ResolvedCompletionFunctionSource;

export const isFunctionCompletionSource = (
  source: CompletionSource | ResolvedCompletionSource,
): source is CompletionFunctionSource | ResolvedCompletionFunctionSource =>
  typeof (source as Partial<CompletionFunctionSource>).sourceFunction ===
    "function";

export const hasCallbackFunction = (
  source: CompletionSource | ResolvedCompletionSource,
): source is
  & (CompletionSource | ResolvedCompletionSource)
  & Readonly<{
    callbackFunction: CompletionCallbackFunction;
  }> =>
  typeof (source as Partial<FunctionCallbackSpec>).callbackFunction ===
    "function";

export const getPreviewFunction = (
  source: CompletionSource | ResolvedCompletionSource,
): CompletionPreviewFunction | undefined => {
  const previewSource = source as Partial<{
    previewFunction?: CompletionPreviewFunction;
  }>;
  if (typeof previewSource.previewFunction === "function") {
    return previewSource.previewFunction;
  }
  return undefined;
};

export const hasPreviewFunction = (
  source: CompletionSource | ResolvedCompletionSource,
): source is
  & (CompletionSource | ResolvedCompletionSource)
  & Readonly<{
    previewFunction: CompletionPreviewFunction;
  }> => typeof getPreviewFunction(source) === "function";
