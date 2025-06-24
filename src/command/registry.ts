import type { Command } from "./types.ts";

/**
 * Create a command registry using closure
 */
export const createCommandRegistry = () => {
  const commands = new Map<string, Command>();

  return {
    register: (command: Command): void => {
      if (commands.has(command.name)) {
        throw new Error(`Command "${command.name}" is already registered`);
      }
      commands.set(command.name, command);
    },

    get: (name: string): Command | undefined => {
      return commands.get(name);
    },

    has: (name: string): boolean => {
      return commands.has(name);
    },

    list: (): string[] => {
      return Array.from(commands.keys());
    },
  };
};

export type CommandRegistry = ReturnType<typeof createCommandRegistry>;
