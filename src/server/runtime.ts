import { getErrorMessage } from "../utils/error.ts";
import { parseArgs, type createCommandExecutor } from "../command/executor.ts";
import { createSocketServer } from "../socket/server.ts";
import type { ConnectionConfig } from "../socket/connection-manager.ts";

type ExecuteCommand = ReturnType<typeof createCommandExecutor>;

export const runCommandSocketServer = async ({
  socketPath,
  executeCommand,
  connectionConfig,
}: {
  socketPath: string;
  executeCommand: ExecuteCommand;
  connectionConfig: ConnectionConfig;
}) => {
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
    connectionConfig,
  });

  await server.start();
};
