/**
 * @module server
 * Unix socket server entry point for zeno
 *
 * This file starts a Unix socket server that listens for commands from shell functions.
 * It provides faster execution than CLI mode by keeping the process running.
 *
 * The server:
 * - Listens on the socket path specified by ZENO_SOCK environment variable
 * - Handles graceful shutdown on SIGINT, SIGTERM, and SIGHUP signals
 * - Cleans up the socket file on exit
 */

import { execServer } from "./app.ts";
import { exists, printf } from "./deps.ts";
import { getEnv } from "./config/env.ts";

const env = getEnv();
const socketPath = env.SOCK;

if (socketPath == null) {
  printf("env:ZENO_SOCK is empty\n");
  Deno.exit(1);
}

/**
 * Signal handler for graceful shutdown
 * Removes the socket file and exits the process
 */
const signalHandler = () => {
  Deno.removeSync(socketPath);
  Deno.exit(0);
};

Deno.addSignalListener("SIGINT", signalHandler);
Deno.addSignalListener("SIGTERM", signalHandler);
Deno.addSignalListener("SIGHUP", signalHandler);

if (await exists(socketPath)) {
  printf("env:ZENO_SOCK already exists: %s\n", socketPath);
  Deno.exit(1);
}

execServer({ socketPath });
