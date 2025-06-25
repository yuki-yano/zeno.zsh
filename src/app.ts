import { createApp } from "./app-factory.ts";

// Create default app instance for backward compatibility
const app = createApp();

/**
 * Execute zeno in server mode, listening on a Unix socket
 * @param params - Server execution parameters
 * @param params.socketPath - Path to the Unix socket file
 * @example
 * ```ts
 * await execServer({ socketPath: "/tmp/zeno.sock" });
 * ```
 */
export const execServer = async ({ socketPath }: { socketPath: string }) => {
  await app.execServer(socketPath);
};

/**
 * Execute zeno in CLI mode with command line arguments
 * @param params - CLI execution parameters
 * @param params.args - Command line arguments to parse
 * @example
 * ```ts
 * await execCli({ args: ["--zeno-mode", "snippet-list"] });
 * ```
 */
export const execCli = async ({ args }: { args: Array<string> }) => {
  await app.execCli(args);
};
