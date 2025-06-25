import { write } from "./text-writer.ts";
import { getErrorMessage } from "./utils/error.ts";
import { createCommandRegistry } from "./command/commands/index.ts";
import { createCommandExecutor, parseArgs } from "./command/executor.ts";
import { createSocketServer } from "./socket/server.ts";
import type { CommandRegistry } from "./command/registry.ts";
import type { ConnectionConfig } from "./socket/connection-manager.ts";

export type AppConfig = {
  commandRegistry?: CommandRegistry;
  connectionConfig?: ConnectionConfig;
};

/**
 * Factory for creating app instances with dependency injection
 */
export const createApp = (config: AppConfig = {}) => {
  // Use provided registry or create default one
  const commandRegistry = config.commandRegistry ?? createCommandRegistry();
  const executeCommand = createCommandExecutor(commandRegistry);

  return {
    /**
     * Execute in CLI mode
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
     * Execute as socket server
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
