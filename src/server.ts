import { execServer } from "./app.ts";
import { existsSync, printf } from "./deps.ts";
import { ZENO_SOCK } from "./settings.ts";

const socketPath = ZENO_SOCK;

if (socketPath == null) {
  printf("env:ZENO_SOCK is empty\n");
  Deno.exit(1);
}

Deno.signal("SIGINT").then(() => {
  Deno.removeSync(socketPath);
  Deno.exit();
});

Deno.signal("SIGTERM").then(() => {
  Deno.removeSync(socketPath);
  Deno.exit();
});

Deno.signal("SIGHUP").then(() => {
  Deno.removeSync(socketPath);
  Deno.exit();
});

if (existsSync(socketPath)) {
  printf("env:ZENO_SOCK is already exists: %s\n", socketPath);
  Deno.exit();
}

execServer({ socketPath });
