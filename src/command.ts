import { argsParser } from "./deps.ts";

const commandParseOption = {
  configuration: {
    "parse-numbers": false,
    "parse-positional-numbers": false,
    "unknown-options-as-args": true,
  },
};

type ParseCommandOptions = {
  keepLeadingSpace?: boolean;
  keepTrailingSpace?: boolean;
}

export const parseCommand = (
  command: string,
  opts?: ParseCommandOptions,
) => {
  const { keepLeadingSpace, keepTrailingSpace } = opts ?? {};
  const parsed = argsParser(`-- ${command}`, commandParseOption);
  const args = (parsed._ as Array<string>).map((arg) => {
    // remove unnecessary quotes
    const match = /^(["'])([a-z0-9.,:/_=+-]*)\1$/.exec(arg);
    return match ? match[2] : arg;
  });
  const hasLeadingSpace = /^\s/.test(command);
  const hasTrailingSpace = /\s$/.test(command);
  const normalized = [
    hasLeadingSpace && keepLeadingSpace ? " " : "",
    args.join(" "),
    hasTrailingSpace && keepTrailingSpace ? " " : "",
  ].join("");
  return {
    command,
    normalized,
    args,
    hasLeadingSpace,
    hasTrailingSpace,
  };
};

export const normalizeCommand = (
  command: string,
  opts?: ParseCommandOptions,
) => {
  const { normalized } = parseCommand(command, opts);
  return normalized;
};
