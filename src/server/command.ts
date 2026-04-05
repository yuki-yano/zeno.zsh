import { writeResult } from "../app-helpers.ts";
import { createCommand } from "../command/types.ts";
import { createServerControl, type ServerControlDeps } from "./control.ts";

type ServerRunDeps = {
  getSocketPath?: () => string | undefined;
  runServer: (socketPath: string) => Promise<void>;
};

type ServerStatusCommandDeps = ServerControlDeps & {
  useColor?: () => boolean;
};

const RESET = "\u001b[0m";
const GREEN = "\u001b[32m";
const YELLOW = "\u001b[33m";
const DIM = "\u001b[2m";

const supportsColor = (): boolean => {
  try {
    return Deno.stdout.isTerminal();
  } catch {
    return false;
  }
};

const colorize = (value: string, color: string, enabled: boolean): string =>
  enabled ? `${color}${value}${RESET}` : value;

const formatServerStatusLines = (
  result: Awaited<ReturnType<ReturnType<typeof createServerControl>["status"]>>,
  colorEnabled: boolean,
): string[] => {
  if (!result.ok) {
    return [result.error.message];
  }

  const { state, pid, socketPath } = result.value;
  const statusText = state === "running"
    ? colorize("running", GREEN, colorEnabled)
    : colorize("stopped", YELLOW, colorEnabled);
  const pidText = pid !== undefined ? String(pid) : colorize("-", DIM, colorEnabled);
  const socketText = socketPath ?? colorize("(unset)", DIM, colorEnabled);

  return [
    `Status  ${statusText}`,
    `PID     ${pidText}`,
    `Socket  ${socketText}`,
  ];
};

const writeServerActionResult = async (
  writeFn: typeof writeResult extends (arg0: infer T, ...args: infer _U) => unknown
    ? T
    : never,
  result:
    | Awaited<ReturnType<ReturnType<typeof createServerControl>["start"]>>
    | Awaited<ReturnType<ReturnType<typeof createServerControl>["stop"]>>
    | Awaited<ReturnType<ReturnType<typeof createServerControl>["restart"]>>,
) => {
  if (!result.ok) {
    await writeResult(writeFn, "failure", result.error.message);
    return;
  }

  const lines: string[] = [result.value.action];
  if (result.value.pid !== undefined) {
    lines.push(String(result.value.pid));
  }
  await writeResult(writeFn, "success", ...lines);
};

export const createServerStartCommand = (deps: ServerControlDeps = {}) => {
  const control = createServerControl(deps);
  return createCommand("server-start", async ({ writer }) => {
    await writeServerActionResult(writer.write.bind(writer), await control.start());
  });
};

export const createServerStopCommand = (deps: ServerControlDeps = {}) => {
  const control = createServerControl(deps);
  return createCommand("server-stop", async ({ writer }) => {
    await writeServerActionResult(writer.write.bind(writer), await control.stop());
  });
};

export const createServerRestartCommand = (deps: ServerControlDeps = {}) => {
  const control = createServerControl(deps);
  return createCommand("server-restart", async ({ writer }) => {
    await writeServerActionResult(
      writer.write.bind(writer),
      await control.restart(),
    );
  });
};

export const createServerStatusCommand = (deps: ServerStatusCommandDeps = {}) => {
  const { useColor = supportsColor, ...controlDeps } = deps;
  const control = createServerControl(controlDeps);
  return createCommand("server-status", async ({ writer }) => {
    const result = await control.status();
    if (!result.ok) {
      await writeResult(writer.write.bind(writer), "failure", result.error.message);
      return;
    }

    const lines = formatServerStatusLines(
      result,
      useColor(),
    );
    for (const line of lines) {
      await writer.write({ format: "%s\n", text: line });
    }
  });
};

export const createServerRunCommand = (deps: ServerRunDeps) =>
  createCommand("server-run", async ({ writer }) => {
    const socketPath = deps.getSocketPath?.();
    if (!socketPath) {
      await writeResult(
        writer.write.bind(writer),
        "failure",
        "env:ZENO_SOCK is empty (required for server run)",
      );
      return;
    }
    await deps.runServer(socketPath);
  });
