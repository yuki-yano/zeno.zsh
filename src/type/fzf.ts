export type FzfOptions = {
  "--ansi"?: true;
  "--multi"?: true;
  "--bind"?: FzfOptionBinds;
  "--expect"?: Array<string>;
  "--preview"?: string;
  [otherProperty: string]: unknown;
};

export type FzfOptionBinds = Array<{
  key: string;
  action: string;
}>;

export type CompletionSource = {
  name: string;
  patterns: Array<RegExp>;
  sourceCommand: string;
  options: FzfOptions;
  callback?: string;
  callbackZero?: boolean;
};
