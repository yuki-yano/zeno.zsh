import { write } from "./text-writer.ts";
import { getErrorMessage } from "./utils/error.ts";
import { createCommandRegistry } from "./command/commands/index.ts";
import { createCommandExecutor, parseArgs } from "./command/executor.ts";
import { createSocketServer } from "./socket/server.ts";
import type { CommandRegistry } from "./command/registry.ts";
import type { ConnectionConfig } from "./socket/connection-manager.ts";

/**
 * Configuration options for creating an app instance
 */
export type AppConfig = {
  /** Custom command registry for handling commands */
  commandRegistry?: CommandRegistry;
  /** Configuration for socket connection management */
  connectionConfig?: ConnectionConfig;
};

/**
 * Factory for creating app instances with dependency injection
 *
 * @param config - Configuration options for the app
 * @param config.commandRegistry - Optional custom command registry. If not provided, uses the default registry
 * @param config.connectionConfig - Optional connection configuration for socket server
 * @returns App instance with execCli and execServer methods
 *
 * @example
 * ```ts
 * // Create app with default configuration
 * const app = createApp();
 *
 * // Create app with custom command registry
 * const customApp = createApp({
 *   commandRegistry: myCustomRegistry
 * });
 * ```
 */
export const createApp = (config: AppConfig = {}) => {
  // Use provided registry or create default one
  const commandRegistry = config.commandRegistry ?? createCommandRegistry();
  const executeCommand = createCommandExecutor(commandRegistry);

  return {
    /**
     * Execute zeno in CLI mode
     * @param args - Command line arguments to parse and execute
     * @throws Will exit process with code 1 on error
     */
    async execCli(args: Array<string>): Promise<void> {
      let res = 0;

      try {
        const { mode, input } = parseArgs(args);
        await executeCommand({ mode, input, writer: { write } });
      } catch (error) {
        await write({ format: "%s\n", text: "failure" });
        await write({ format: "%s\n", text: getErrorMessage(error) });
        res = 1;
      }

      Deno.exit(res);
    },

    /**
     * Execute zeno as a Unix socket server
     * @param socketPath - Path to the Unix socket file
     * @throws Will throw if socket creation fails
     */
    async execServer(socketPath: string): Promise<void> {
      const server = createSocketServer({
        socketPath,
        handler: async ({ args, writer }) => {
          const { mode, input } = parseArgs(args);
          await executeCommand({ mode, input, writer });
        },
        onError: async (error, writer) => {
          await writer.write({ format: "%s\n", text: "failure" });
          await writer.write({ format: "%s\n", text: getErrorMessage(error) });
        },
        connectionConfig: config.connectionConfig ?? {
          maxConnections: 50,
          connectionTimeout: 30000, // 30 seconds
        },
      });

      await server.start();
    },

    /**
     * Get the command registry for testing or extension
     */
    getCommandRegistry(): CommandRegistry {
      return commandRegistry;
    },
  };
};
