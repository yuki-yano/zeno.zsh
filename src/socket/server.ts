import { iterateReader } from "../deps.ts";
import { TextWriter } from "../text-writer.ts";
import { getErrorMessage } from "../utils/error.ts";
import { createConnectionManager } from "./connection-manager.ts";
import type { SocketServerConfig } from "./types.ts";

/**
 * Creates a Unix socket server that listens for client connections
 *
 * @param config - Server configuration
 * @param config.socketPath - Path to the Unix socket file
 * @param config.handler - Function to handle incoming requests
 * @param config.onError - Optional error handler
 * @param config.connectionConfig - Optional connection management configuration
 * @returns Server object with start and stop methods
 *
 * @example
 * ```ts
 * const server = createSocketServer({
 *   socketPath: "/tmp/zeno.sock",
 *   handler: async ({ args, writer }) => {
 *     await writer.write({ format: "%s\n", text: "Hello" });
 *   }
 * });
 * await server.start();
 * ```
 */
export const createSocketServer = (config: SocketServerConfig) => {
  const { socketPath, handler, onError, connectionConfig } = config;
  const connectionManager = createConnectionManager(connectionConfig);
  let cleanupInterval: number | undefined;
  let listener: Deno.Listener | undefined;

  return {
    async start(): Promise<void> {
      // Set up periodic cleanup of timed out connections
      cleanupInterval = setInterval(() => {
        connectionManager.cleanupTimedOutConnections();
      }, 10000) as unknown as number; // Clean up every 10 seconds

      listener = Deno.listen({
        transport: "unix",
        path: socketPath,
      });

      try {
        for await (const conn of listener) {
          // Handle each connection asynchronously
          (async () => {
            const writer = new TextWriter();
            writer.setConn(conn);

            // Create TextDecoder per connection to avoid sharing state
            const textDecoder = new TextDecoder();

            let connectionId: number | undefined;

            try {
              connectionId = connectionManager.addConnection(conn, writer);

              for await (const r of iterateReader(conn)) {
                try {
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
        listener?.close();
        clearInterval(cleanupInterval);
        connectionManager.closeAll();
      }
    },

    stop(): void {
      listener?.close();
      if (cleanupInterval !== undefined) {
        clearInterval(cleanupInterval);
        cleanupInterval = undefined;
      }
      connectionManager.closeAll();
    },

    getActiveConnections(): number {
      return connectionManager.getActiveConnectionCount();
    },
  };
};
