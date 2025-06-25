import { argsParser } from "../deps.ts";
import { writeResult } from "../app-helpers.ts";
import type { CommandRegistry } from "./registry.ts";
import type { CommandContext } from "./types.ts";
import type { Input } from "../type/shell.ts";
import type { ArgParserArguments, ArgParserOptions } from "../deps.ts";

interface Args extends ArgParserArguments {
  "zeno-mode": string;
  input: Input;
}

const argsParseOption: Readonly<Partial<ArgParserOptions>> = {
  string: [
    "zeno-mode",
  ],
  default: {
    "zeno-mode": "",
    "input": {},
  },
  configuration: {
    "camel-case-expansion": false,
    "parse-numbers": false,
    "parse-positional-numbers": false,
  },
};

/**
 * Parse command line arguments for zeno
 *
 * @param args - Command line arguments to parse
 * @returns Parsed mode and input object
 *
 * @example
 * ```ts
 * const { mode, input } = parseArgs([
 *   "--zeno-mode", "snippet-list",
 *   "--input", '{"lbuffer": "git "}'
 * ]);
 * ```
 */
export const parseArgs = (args: readonly string[]) => {
  const parsedArgs = argsParser([...args], argsParseOption) as Readonly<Args>;
  const mode = parsedArgs["zeno-mode"] ?? "";
  const rawInput = parsedArgs.input ?? {};

  // Validate and convert input fields
  const input: Input = {
    lbuffer: typeof rawInput.lbuffer === "string"
      ? rawInput.lbuffer
      : undefined,
    rbuffer: typeof rawInput.rbuffer === "string"
      ? rawInput.rbuffer
      : undefined,
    snippet: typeof rawInput.snippet === "string"
      ? rawInput.snippet
      : undefined,
    dir: typeof rawInput.dir === "string" ? rawInput.dir : undefined,
  };

  return { mode, input };
};

/**
 * Create a command executor with the given registry
 *
 * @param registry - Command registry containing available commands
 * @returns Async function that executes commands based on mode
 *
 * @example
 * ```ts
 * const registry = createCommandRegistry();
 * const executor = createCommandExecutor(registry);
 * await executor({
 *   mode: "snippet-list",
 *   input: { lbuffer: "git " },
 *   writer: new TextWriter()
 * });
 * ```
 */
export const createCommandExecutor = (registry: CommandRegistry) => {
  return async (context: CommandContext & { mode: string }) => {
    const { mode } = context;
    const command = registry.get(mode);

    if (command) {
      await command.execute(context);
    } else {
      await writeResult(context.writer.write.bind(context.writer), "failure");
      await context.writer.write({
        format: "%s mode is not exist\n",
        text: mode,
      });
    }
  };
};
