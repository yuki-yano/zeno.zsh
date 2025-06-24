import { execServer } from "./app.ts";
import { exists, printf } from "./deps.ts";
import { getEnv } from "./config/env.ts";

const env = getEnv();
const socketPath = env.SOCK;

if (socketPath == null) {
  printf("env:ZENO_SOCK is empty\n");
  Deno.exit(1);
}

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
