import { getEnv } from "../config/env.ts";
import { path } from "../deps.ts";

export type ServerState = "running" | "stopped";

export type ServerStatus = {
  state: ServerState;
  pid?: number;
  socketPath?: string;
};

export type ServerAction = {
  action: "started" | "already-running" | "stopped" | "already-stopped" |
    "restarted";
  pid?: number;
};

export type ServerControlResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: Error };

export type ServerControlDeps = {
  getSocketPath?: () => string | undefined;
  requestPid?: (socketPath: string) => Promise<number>;
  spawnServer?: () => Promise<void>;
  ensureSocketDir?: (socketPath: string) => Promise<void>;
  removeSocketFile?: (socketPath: string) => Promise<void>;
  killProcess?: (pid: number, signal: Deno.Signal) => Promise<void>;
  isProcessAlive?: (pid: number) => Promise<boolean>;
  sleep?: (ms: number) => Promise<void>;
  pollAttempts?: number;
  pollIntervalMs?: number;
  stopPollAttempts?: number;
  stopPollIntervalMs?: number;
};

const DEFAULT_POLL_ATTEMPTS = 50;
const DEFAULT_POLL_INTERVAL_MS = 100;
const DEFAULT_STOP_POLL_ATTEMPTS = 20;
const DEFAULT_STOP_POLL_INTERVAL_MS = 50;

const getSocketPathFromEnv = (): string | undefined => getEnv().SOCK;

const requestPidFromSocket = async (socketPath: string): Promise<number> => {
  const conn = await Deno.connect({ transport: "unix", path: socketPath });
  try {
    const payload = new TextEncoder().encode(
      JSON.stringify({
        args: ["--zeno-mode=pid"],
      }),
    );
    await conn.write(payload);
    await conn.closeWrite();

    const chunks: Uint8Array[] = [];
    const buffer = new Uint8Array(4096);
    while (true) {
      const size = await conn.read(buffer);
      if (size === null) {
        break;
      }
      chunks.push(buffer.slice(0, size));
    }

    const text = new TextDecoder().decode(
      chunks.length === 1 ? chunks[0] : Uint8Array.from(chunks.flatMap((c) => [...c])),
    ).trim();
    const lines = text.split("\n").filter((line) => line.length > 0);
    const pidLine = lines.length === 1
      ? lines[0]
      : lines[0] === "success"
      ? lines[1]
      : undefined;
    if (!pidLine) {
      throw new Error(`unexpected socket response: ${text}`);
    }

    const pid = Number.parseInt(pidLine, 10);
    if (!Number.isFinite(pid) || pid <= 0) {
      throw new Error(`invalid pid response: ${pidLine}`);
    }
    return pid;
  } finally {
    conn.close();
  }
};

const quoteForShell = (value: string): string => {
  if (value.length === 0) {
    return "''";
  }
  return `'${value.replaceAll("'", `'\"'\"'`)}'`;
};

const spawnServerProcess = async (): Promise<void> => {
  const serverBinPath = path.fromFileUrl(
    new URL("../../bin/zeno-server", import.meta.url),
  );
  await new Deno.Command("/bin/sh", {
    args: [
      "-c",
      `nohup ${quoteForShell(serverBinPath)} >/dev/null 2>&1 &`,
    ],
    stdout: "null",
    stderr: "null",
  }).output();
};

const removeSocketFile = async (socketPath: string): Promise<void> => {
  try {
    await Deno.remove(socketPath);
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) {
      throw error;
    }
  }
};

const ensureSocketDir = async (socketPath: string): Promise<void> => {
  await Deno.mkdir(path.dirname(socketPath), { recursive: true });
};

const killProcess = async (pid: number, signal: Deno.Signal): Promise<void> => {
  try {
    Deno.kill(pid, signal);
  } catch (error) {
    if (
      error instanceof Deno.errors.NotFound ||
      (error instanceof Error && /ESRCH/.test(error.message))
    ) {
      return;
    }
    throw error;
  }
};

const isProcessAlive = async (pid: number): Promise<boolean> => {
  const result = await new Deno.Command("kill", {
    args: ["-0", String(pid)],
    stdout: "null",
    stderr: "null",
  }).output();
  return result.success;
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const toFailure = <T>(message: string): ServerControlResult<T> => ({
  ok: false,
  error: new Error(message),
});

export const createServerControl = (deps: ServerControlDeps = {}) => {
  const getSocketPath = deps.getSocketPath ?? getSocketPathFromEnv;
  const requestPid = deps.requestPid ?? requestPidFromSocket;
  const spawnServer = deps.spawnServer ?? spawnServerProcess;
  const ensureSocketDirectory = deps.ensureSocketDir ?? ensureSocketDir;
  const removeSocket = deps.removeSocketFile ?? removeSocketFile;
  const kill = deps.killProcess ?? killProcess;
  const checkAlive = deps.isProcessAlive ?? isProcessAlive;
  const wait = deps.sleep ?? sleep;
  const pollAttempts = deps.pollAttempts ?? DEFAULT_POLL_ATTEMPTS;
  const pollIntervalMs = deps.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const stopPollAttempts = deps.stopPollAttempts ?? DEFAULT_STOP_POLL_ATTEMPTS;
  const stopPollIntervalMs = deps.stopPollIntervalMs ??
    DEFAULT_STOP_POLL_INTERVAL_MS;

  const resolveSocketPath = (
    operation: "start" | "restart" | "run",
  ): ServerControlResult<string> => {
    const socketPath = getSocketPath();
    if (!socketPath) {
      return toFailure(`env:ZENO_SOCK is empty (required for server ${operation})`);
    }
    return { ok: true, value: socketPath };
  };

  const requestPidSafely = async (
    socketPath: string | undefined,
  ): Promise<number | undefined> => {
    if (!socketPath) {
      return undefined;
    }
    try {
      return await requestPid(socketPath);
    } catch {
      return undefined;
    }
  };

  return {
    async status(): Promise<ServerControlResult<ServerStatus>> {
      const socketPath = getSocketPath();
      const pid = await requestPidSafely(socketPath);
      return {
        ok: true,
        value: pid === undefined
          ? { state: "stopped", socketPath }
          : { state: "running", pid, socketPath },
      };
    },

    async start(): Promise<ServerControlResult<ServerAction>> {
      const socketPathResult = resolveSocketPath("start");
      if (!socketPathResult.ok) {
        return socketPathResult;
      }
      const socketPath = socketPathResult.value;
      const currentPid = await requestPidSafely(socketPath);
      if (currentPid !== undefined) {
        return {
          ok: true,
          value: { action: "already-running", pid: currentPid },
        };
      }

      await removeSocket(socketPath);
      await ensureSocketDirectory(socketPath);
      await spawnServer();

      for (let attempt = 0; attempt < pollAttempts; attempt++) {
        const pid = await requestPidSafely(socketPath);
        if (pid !== undefined) {
          return {
            ok: true,
            value: { action: "started", pid },
          };
        }
        if (attempt + 1 < pollAttempts) {
          await wait(pollIntervalMs);
        }
      }

      return toFailure(`failed to start socket server: ${socketPath}`);
    },

    async stop(): Promise<ServerControlResult<ServerAction>> {
      const socketPath = getSocketPath();
      const pid = await requestPidSafely(socketPath);
      if (pid === undefined) {
        if (socketPath) {
          await removeSocket(socketPath);
        }
        return {
          ok: true,
          value: { action: "already-stopped" },
        };
      }

      await kill(pid, "SIGTERM");
      for (let attempt = 0; attempt < stopPollAttempts; attempt++) {
        const alive = await checkAlive(pid);
        if (!alive) {
          break;
        }
        if (attempt + 1 < stopPollAttempts) {
          await wait(stopPollIntervalMs);
        } else {
          await kill(pid, "SIGKILL");
        }
      }

      if (socketPath) {
        await removeSocket(socketPath);
      }
      return {
        ok: true,
        value: { action: "stopped", pid },
      };
    },

    async restart(): Promise<ServerControlResult<ServerAction>> {
      const socketPathResult = resolveSocketPath("restart");
      if (!socketPathResult.ok) {
        return socketPathResult;
      }

      const stopResult = await this.stop();
      if (!stopResult.ok) {
        return stopResult;
      }
      const startResult = await this.start();
      if (!startResult.ok) {
        return startResult;
      }

      return {
        ok: true,
        value: { action: "restarted", pid: startResult.value.pid },
      };
    },

    resolveRunSocketPath(): ServerControlResult<string> {
      return resolveSocketPath("run");
    },
  };
};
