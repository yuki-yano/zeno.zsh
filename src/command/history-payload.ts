export type HistoryPositionalMode =
  | "history-log"
  | "history-query"
  | "history-delete"
  | "history-export"
  | "history-import"
  | "history-fzf-config";

export type HistoryInputKey =
  | "historyLog"
  | "historyQuery"
  | "historyDelete"
  | "historyExport"
  | "historyImport"
  | "historyFzfConfig";

export type ParsedArgsLike = Record<string, unknown> & {
  _: Array<string | number>;
};

export type HistoryPositionalResolution = {
  mode: HistoryPositionalMode;
  inputKey: HistoryInputKey;
  payload: Record<string, unknown>;
};

const normalizeArray = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [value];

const getArg = (
  source: ParsedArgsLike,
  ...keys: string[]
): unknown | undefined => {
  for (const key of keys) {
    if (source[key] !== undefined) {
      return source[key];
    }
  }
  return undefined;
};

const assignIfDefined = (
  payload: Record<string, unknown>,
  key: string,
  value: unknown,
) => {
  if (value !== undefined) {
    payload[key] = value;
  }
};

const buildHistoryLogPayload = (
  source: ParsedArgsLike,
): Record<string, unknown> => {
  const payload: Record<string, unknown> = {};

  assignIfDefined(payload, "command", getArg(source, "cmd", "command"));
  assignIfDefined(payload, "exit", source.exit);
  assignIfDefined(payload, "pwd", source.pwd);
  assignIfDefined(payload, "session", source.session);
  assignIfDefined(payload, "host", source.host);
  assignIfDefined(payload, "user", source.user);
  assignIfDefined(payload, "shell", source.shell);
  assignIfDefined(payload, "ts", source.ts);
  assignIfDefined(
    payload,
    "durationMs",
    getArg(source, "duration-ms", "durationMs"),
  );
  assignIfDefined(payload, "id", source.id);
  assignIfDefined(payload, "repoRoot", getArg(source, "repoRoot", "repo-root"));
  assignIfDefined(payload, "meta", source.meta);
  assignIfDefined(payload, "startedAt", source.startedAt);
  assignIfDefined(payload, "finishedAt", source.finishedAt);

  return payload;
};

const buildHistoryQueryPayload = (
  source: ParsedArgsLike,
): Record<string, unknown> => {
  const payload: Record<string, unknown> = {};
  assignIfDefined(payload, "scope", source.scope);
  assignIfDefined(payload, "cwd", source.cwd);
  assignIfDefined(payload, "directory", source.directory);
  assignIfDefined(payload, "session", source.session);
  assignIfDefined(payload, "term", source.term);
  assignIfDefined(payload, "after", source.after);
  assignIfDefined(payload, "before", source.before);
  assignIfDefined(payload, "exit", source.exit);
  assignIfDefined(payload, "limit", source.limit);
  assignIfDefined(payload, "id", source.id);
  assignIfDefined(payload, "format", source.format);
  assignIfDefined(payload, "deleted", source.deleted);
  assignIfDefined(payload, "repoRoot", getArg(source, "repoRoot", "repo-root"));
  if (source.toggleScope === true || source["toggle-scope"] === true) {
    payload.toggleScope = true;
  }
  return payload;
};

const buildHistoryDeletePayload = (
  source: ParsedArgsLike,
): Record<string, unknown> => ({
  id: source.id,
  hard: source.hard === true,
});

const buildHistoryExportPayload = (
  source: ParsedArgsLike,
): Record<string, unknown> => {
  const payload: Record<string, unknown> = {};
  assignIfDefined(payload, "format", source.format);
  assignIfDefined(payload, "outputPath", getArg(source, "out", "outputPath"));
  assignIfDefined(payload, "scope", source.scope);
  assignIfDefined(payload, "cwd", source.cwd);
  assignIfDefined(payload, "directory", source.directory);
  assignIfDefined(payload, "session", source.session);
  assignIfDefined(payload, "repoRoot", getArg(source, "repoRoot", "repo-root"));
  assignIfDefined(payload, "limit", source.limit);
  assignIfDefined(payload, "term", source.term);
  assignIfDefined(payload, "after", source.after);
  assignIfDefined(payload, "before", source.before);
  assignIfDefined(payload, "exit", source.exit);
  assignIfDefined(payload, "deleted", source.deleted);
  if (source.redact !== undefined) {
    payload.redact = normalizeArray(source.redact);
  }
  return payload;
};

const buildHistoryImportPayload = (
  source: ParsedArgsLike,
): Record<string, unknown> => {
  const payload: Record<string, unknown> = {};
  assignIfDefined(payload, "format", source.format);
  assignIfDefined(payload, "inputPath", getArg(source, "in", "inputPath"));
  assignIfDefined(payload, "dedupe", source.dedupe);
  if (source.dryRun === true || source["dry-run"] === true) {
    payload.dryRun = true;
  }
  if (source.redact !== undefined) {
    payload.redact = normalizeArray(source.redact);
  }
  return payload;
};

const resolveHistoryMode = (source: ParsedArgsLike): {
  mode: HistoryPositionalMode;
  inputKey: HistoryInputKey;
} | null => {
  const positional = Array.isArray(source._) ? source._ : [];
  if (positional.length < 2) {
    return null;
  }
  const command = String(positional[0] ?? "");
  const subcommand = String(positional[1] ?? "");
  if (command !== "history") {
    return null;
  }

  switch (subcommand) {
    case "log":
      return { mode: "history-log", inputKey: "historyLog" };
    case "query":
      return { mode: "history-query", inputKey: "historyQuery" };
    case "delete":
      return { mode: "history-delete", inputKey: "historyDelete" };
    case "export":
      return { mode: "history-export", inputKey: "historyExport" };
    case "import":
      return { mode: "history-import", inputKey: "historyImport" };
    case "fzf-config":
      return { mode: "history-fzf-config", inputKey: "historyFzfConfig" };
    default:
      return null;
  }
};

export const resolveHistoryPositional = (
  source: ParsedArgsLike,
): HistoryPositionalResolution | null => {
  const resolved = resolveHistoryMode(source);
  if (!resolved) {
    return null;
  }

  switch (resolved.mode) {
    case "history-log":
      return {
        mode: resolved.mode,
        inputKey: resolved.inputKey,
        payload: buildHistoryLogPayload(source),
      };
    case "history-query":
      return {
        mode: resolved.mode,
        inputKey: resolved.inputKey,
        payload: buildHistoryQueryPayload(source),
      };
    case "history-delete":
      return {
        mode: resolved.mode,
        inputKey: resolved.inputKey,
        payload: buildHistoryDeletePayload(source),
      };
    case "history-export":
      return {
        mode: resolved.mode,
        inputKey: resolved.inputKey,
        payload: buildHistoryExportPayload(source),
      };
    case "history-import":
      return {
        mode: resolved.mode,
        inputKey: resolved.inputKey,
        payload: buildHistoryImportPayload(source),
      };
    case "history-fzf-config":
      return {
        mode: resolved.mode,
        inputKey: resolved.inputKey,
        payload: {},
      };
  }
};
