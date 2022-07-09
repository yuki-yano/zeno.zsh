export type FzfOptions = Readonly<{
  "--ansi"?: true;
  "--multi"?: true;
  "--bind"?: readonly FzfOptionBind[];
  "--expect"?: string[];
  "--preview"?: string;
  [otherProperty: string]: unknown;
}>;

export type FzfOptionBind = Readonly<{
  key: string;
  action: string;
}>;

export type CompletionSource = Readonly<{
  name: string;
  patterns: readonly RegExp[];
  excludePatterns?: readonly RegExp[];
  sourceCommand: string;
  options: FzfOptions;
  callback?: string;
  callbackZero?: boolean;
}>;
