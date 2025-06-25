import type { Command } from "./types.ts";

/**
 * Create a command registry for managing available commands
 *
 * The registry provides methods to register, retrieve, and query commands.
 * Commands are identified by their unique name.
 *
 * @returns Command registry object with register, get, has, and list methods
 *
 * @example
 * ```ts
 * const registry = createCommandRegistry();
 * registry.register({
 *   name: "my-command",
 *   execute: async (context) => { ... }
 * });
 * const command = registry.get("my-command");
 * ```
 */
export const createCommandRegistry = () => {
  const commands = new Map<string, Command>();

  return {
    /**
     * Register a new command
     * @param command - Command to register
     * @throws Error if a command with the same name is already registered
     */
    register: (command: Command): void => {
      if (commands.has(command.name)) {
        throw new Error(`Command "${command.name}" is already registered`);
      }
      commands.set(command.name, command);
    },

    /**
     * Get a command by name
     * @param name - Command name
     * @returns Command if found, undefined otherwise
     */
    get: (name: string): Command | undefined => {
      return commands.get(name);
    },

    /**
     * Check if a command exists
     * @param name - Command name
     * @returns true if command exists, false otherwise
     */
    has: (name: string): boolean => {
      return commands.has(name);
    },

    /**
     * List all registered command names
     * @returns Array of command names
     */
    list: (): string[] => {
      return Array.from(commands.keys());
    },
  };
};

export type CommandRegistry = ReturnType<typeof createCommandRegistry>;
