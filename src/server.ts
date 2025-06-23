import { execServer } from "./app.ts";
import { existsSync, printf } from "./deps.ts";
import { ZENO_SOCK } from "./settings.ts";

const socketPath = ZENO_SOCK;

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

if (existsSync(socketPath)) {
  printf("env:ZENO_SOCK already exists: %s\n", socketPath);
  Deno.exit(1);
}

execServer({ socketPath });
