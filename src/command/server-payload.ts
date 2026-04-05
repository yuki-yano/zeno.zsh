export type ServerPositionalMode =
  | "server-run"
  | "server-start"
  | "server-stop"
  | "server-restart"
  | "server-status";

export type ServerInputKey =
  | "serverRun"
  | "serverStart"
  | "serverStop"
  | "serverRestart"
  | "serverStatus";

export type ParsedArgsLike = Record<string, unknown> & {
  _: Array<string | number>;
};

export type ServerPositionalResolution = {
  mode: ServerPositionalMode;
  inputKey: ServerInputKey;
  payload: Record<string, unknown>;
};

const resolveServerMode = (source: ParsedArgsLike): {
  mode: ServerPositionalMode;
  inputKey: ServerInputKey;
} | null => {
  const positional = Array.isArray(source._) ? source._ : [];
  if (positional.length < 2) {
    return null;
  }

  const command = String(positional[0] ?? "");
  const subcommand = String(positional[1] ?? "");
  if (command !== "server") {
    return null;
  }

  switch (subcommand) {
    case "run":
      return { mode: "server-run", inputKey: "serverRun" };
    case "start":
      return { mode: "server-start", inputKey: "serverStart" };
    case "stop":
      return { mode: "server-stop", inputKey: "serverStop" };
    case "restart":
      return { mode: "server-restart", inputKey: "serverRestart" };
    case "status":
      return { mode: "server-status", inputKey: "serverStatus" };
    default:
      return null;
  }
};

export const resolveServerPositional = (
  source: ParsedArgsLike,
): ServerPositionalResolution | null => {
  const resolved = resolveServerMode(source);
  if (!resolved) {
    return null;
  }

  return {
    mode: resolved.mode,
    inputKey: resolved.inputKey,
    payload: {},
  };
};
