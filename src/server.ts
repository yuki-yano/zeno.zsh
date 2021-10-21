import { exec } from "./app.ts";
import { existsSync } from "./deps.ts";
import { ZENO_SOCK } from "./settings.ts";

const socketPath = ZENO_SOCK;

if (socketPath == null) {
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
  Deno.exit();
}

exec({ zenoMode: "server" });
