import type { Input } from "../type/shell.ts";
import type { WriteFunction } from "../app-helpers.ts";

export type CommandContext = {
  input: Input;
  writer: {
    write: WriteFunction;
  };
};

/**
 * Functional command type
 */
export type CommandFunction = (context: CommandContext) => Promise<void>;

/**
 * Command definition with name and execute function
 */
export type Command = {
  readonly name: string;
  readonly execute: CommandFunction;
};

/**
 * Helper to create a command
 */
export const createCommand = (
  name: string,
  execute: CommandFunction,
): Command => ({
  name,
  execute,
});
