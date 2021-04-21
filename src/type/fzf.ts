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
  id: string;
  pattern: RegExp;
  sourceCommand: string;
  preview: string;
  options: FzfOptions;
  callback: (lines: Array<string>) => Array<string>;
};

export type CompletionResult = [
  id: string,
  key: string,
  ...lines: Array<string>,
];
