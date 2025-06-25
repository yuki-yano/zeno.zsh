import { iterateReader } from "../deps.ts";
import { TextWriter } from "../text-writer.ts";
import { getErrorMessage } from "../utils/error.ts";
import { ConnectionManager } from "./connection-manager.ts";
import type { SocketServerConfig } from "./types.ts";

/**
 * Creates a socket server with the provided handler
 */
export const createSocketServer = (config: SocketServerConfig) => {
  const { socketPath, handler, onError, connectionConfig } = config;
  const connectionManager = new ConnectionManager(connectionConfig);

  // Set up periodic cleanup of timed out connections
  const cleanupInterval = setInterval(() => {
    connectionManager.cleanupTimedOutConnections();
  }, 10000); // Clean up every 10 seconds

  return {
    async start(): Promise<void> {
      const listener = Deno.listen({
        transport: "unix",
        path: socketPath,
      });

      let textDecoder: TextDecoder | undefined;

      try {
        for await (const conn of listener) {
          // Handle each connection asynchronously
          (async () => {
            const writer = new TextWriter();
            writer.setConn(conn);

            let connectionId: number | undefined;

            try {
              connectionId = connectionManager.addConnection(conn, writer);

              for await (const r of iterateReader(conn)) {
                try {
                  textDecoder = textDecoder ?? new TextDecoder();
                  const json = textDecoder.decode(r);
                  const clientCall = JSON.parse(json) as {
                    args?: readonly string[];
                  };
                  const args = clientCall.args ?? [];

                  await handler({ args, writer });
                } catch (error) {
                  if (onError) {
                    await onError(error, writer);
                  } else {
                    await writer.write({ format: "%s\n", text: "failure" });
                    await writer.write({
                      format: "%s\n",
                      text: getErrorMessage(error),
                    });
                  }
                } finally {
                  conn.closeWrite();
                }
              }
            } catch (error) {
              // Connection limit reached or other connection error
              console.error("Connection error:", error);
              try {
                await writer.write({ format: "%s\n", text: "failure" });
                await writer.write({
                  format: "%s\n",
                  text: "Server connection limit reached",
                });
              } catch {
                // Ignore write errors
              }
            } finally {
              if (connectionId !== undefined) {
                connectionManager.removeConnection(connectionId);
              } else {
                // Clean up connection that wasn't tracked
                writer.clearConn();
                try {
                  conn.close();
                } catch {
                  // Connection might already be closed
                }
              }
            }
          })().catch(console.error);
        }
      } finally {
        clearInterval(cleanupInterval);
        connectionManager.closeAll();
      }
    },

    stop(): void {
      clearInterval(cleanupInterval);
      connectionManager.closeAll();
    },

    getActiveConnections(): number {
      return connectionManager.getActiveConnectionCount();
    },
  };
};
