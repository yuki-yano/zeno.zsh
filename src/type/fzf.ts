export type FzfOptions = {
  "--ansi"?: true;
  "--multi"?: true;
  "--bind"?: ReadonlyArray<{
    key: string;
    action: string;
  }>;
  "--expect"?: ReadonlyArray<string>;
  [otherProperty: string]: unknown;
};

export type CompletionSource = {
  name: string;
  patterns: Array<RegExp>;
  sourceCommand: string;
  preview: string;
  options: FzfOptions;
  callback: string;
};

export type UserCompletionSource = {
  id: string;
  patterns: Array<string>;
  sourceCommand: string;
  preview: string;
  options: FzfOptions;
  callback: string;
};
