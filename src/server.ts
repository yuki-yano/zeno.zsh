import { execServer } from "./app.ts";
import { existsSync, printf } from "./deps.ts";
import { ZENO_SOCK } from "./settings.ts";

const socketPath = ZENO_SOCK;

if (socketPath == null) {
  printf("env:ZENO_SOCK is empty\n");
  Deno.exit(1);
}

Deno.addSignalListener("SIGINT", () => {
  Deno.removeSync(socketPath);
  Deno.exit();
});

Deno.addSignalListener("SIGTERM", () => {
  Deno.removeSync(socketPath);
  Deno.exit();
});

Deno.addSignalListener("SIGHUP", () => {
  Deno.removeSync(socketPath);
  Deno.exit();
});

if (existsSync(socketPath)) {
  printf("env:ZENO_SOCK is already exists: %s\n", socketPath);
  Deno.exit();
}

execServer({ socketPath });
