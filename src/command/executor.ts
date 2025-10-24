import { argsParser } from "../deps.ts";
import { writeResult } from "../app-helpers.ts";
import type { CommandRegistry } from "./registry.ts";
import type { CommandContext } from "./types.ts";
import type { Input } from "../type/shell.ts";
import type { ArgParserArguments, ArgParserOptions } from "../deps.ts";

interface ParsedArgs extends ArgParserArguments {
  "zeno-mode": string;
  input: Input;
  _: Array<string | number>;
  [key: string]: unknown;
}

const argsParseOption: Readonly<Partial<ArgParserOptions>> = {
  string: [
    "zeno-mode",
  ],
  default: {
    "zeno-mode": "",
    "input": {},
  },
  configuration: {
    "camel-case-expansion": false,
    "parse-numbers": false,
    "parse-positional-numbers": false,
  },
};

/**
 * Parse command line arguments for zeno
 *
 * @param args - Command line arguments to parse
 * @returns Parsed mode and input object
 *
 * @example
 * ```ts
 * const { mode, input } = parseArgs([
 *   "--zeno-mode", "snippet-list",
 *   "--input", '{"lbuffer": "git "}'
 * ]);
 * ```
 */
export const parseArgs = (args: readonly string[]) => {
  const parsedArgs = argsParser([...args], argsParseOption) as ParsedArgs;
  const mode = parsedArgs["zeno-mode"] ?? "";
  const rawInput = parsedArgs.input ?? {};

  // Validate and convert input fields
  const input: Record<string, unknown> = {
    lbuffer: typeof rawInput.lbuffer === "string"
      ? rawInput.lbuffer
      : undefined,
    rbuffer: typeof rawInput.rbuffer === "string"
      ? rawInput.rbuffer
      : undefined,
    snippet: typeof rawInput.snippet === "string"
      ? rawInput.snippet
      : undefined,
    dir: typeof rawInput.dir === "string" ? rawInput.dir : undefined,
  };

  let resolvedMode = mode;

  if (!resolvedMode) {
    const positional = Array.isArray(parsedArgs._) ? parsedArgs._ : [];
    if (positional.length >= 2) {
      const command = String(positional[0] ?? "");
      const subcommand = String(positional[1] ?? "");
      if (command === "history" && subcommand === "log") {
        resolvedMode = "history-log";
        input.historyLog = buildHistoryLogPayload(parsedArgs);
      } else if (command === "history" && subcommand === "query") {
        resolvedMode = "history-query";
        input.historyQuery = buildHistoryQueryPayload(parsedArgs);
      } else if (command === "history" && subcommand === "delete") {
        resolvedMode = "history-delete";
        input.historyDelete = buildHistoryDeletePayload(parsedArgs);
      } else if (command === "history" && subcommand === "export") {
        resolvedMode = "history-export";
        input.historyExport = buildHistoryExportPayload(parsedArgs);
      } else if (command === "history" && subcommand === "import") {
        resolvedMode = "history-import";
        input.historyImport = buildHistoryImportPayload(parsedArgs);
      } else if (command === "history" && subcommand === "fzf-config") {
        resolvedMode = "history-fzf-config";
        input.historyFzfConfig = {};
      }
    }
  }

  return { mode: resolvedMode, input: input as Input };
};

const buildHistoryLogPayload = (
  source: ParsedArgs,
): Record<string, unknown> => {
  const payload: Record<string, unknown> = {};

  const command = typeof source.cmd === "string"
    ? source.cmd
    : typeof source.command === "string"
    ? source.command
    : undefined;
  if (command !== undefined) {
    payload.command = command;
  }

  if (source.exit !== undefined) {
    payload.exit = source.exit;
  }

  if (source.pwd !== undefined) {
    payload.pwd = source.pwd;
  }
  if (source.session !== undefined) {
    payload.session = source.session;
  }
  if (source.host !== undefined) {
    payload.host = source.host;
  }
  if (source.user !== undefined) {
    payload.user = source.user;
  }
  if (source.shell !== undefined) {
    payload.shell = source.shell;
  }
  if (source.ts !== undefined) {
    payload.ts = source.ts;
  }
  if (source["duration-ms"] !== undefined) {
    payload.durationMs = source["duration-ms"];
  } else if (source.durationMs !== undefined) {
    payload.durationMs = source.durationMs;
  }
  if (source.id !== undefined) {
    payload.id = source.id;
  }
  if (source.repoRoot !== undefined) {
    payload.repoRoot = source.repoRoot;
  } else if (source["repo-root"] !== undefined) {
    payload.repoRoot = source["repo-root"];
  }
  if (source.meta !== undefined) {
    payload.meta = source.meta;
  }

  if (source.startedAt !== undefined) {
    payload.startedAt = source.startedAt;
  }
  if (source.finishedAt !== undefined) {
    payload.finishedAt = source.finishedAt;
  }

  return payload;
};

const normalizeArray = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [value];

const buildHistoryQueryPayload = (
  source: ParsedArgs,
): Record<string, unknown> => {
  const payload: Record<string, unknown> = {};

  if (source.scope !== undefined) {
    payload.scope = source.scope;
  }
  if (source.cwd !== undefined) {
    payload.cwd = source.cwd;
  }
  if (source.directory !== undefined) {
    payload.directory = source.directory;
  }
  if (source.session !== undefined) {
    payload.session = source.session;
  }
  if (source.term !== undefined) {
    payload.term = source.term;
  }
  if (source.after !== undefined) {
    payload.after = source.after;
  }
  if (source.before !== undefined) {
    payload.before = source.before;
  }
  if (source.exit !== undefined) {
    payload.exit = source.exit;
  }
  if (source.limit !== undefined) {
    payload.limit = source.limit;
  }
  if (source.id !== undefined) {
    payload.id = source.id;
  }
  if (source.format !== undefined) {
    payload.format = source.format;
  }
  if (source.deleted !== undefined) {
    payload.deleted = source.deleted;
  }
  if (source.repoRoot !== undefined) {
    payload.repoRoot = source.repoRoot;
  } else if (source["repo-root"] !== undefined) {
    payload.repoRoot = source["repo-root"];
  }
  if (source.toggleScope === true || source["toggle-scope"] === true) {
    payload.toggleScope = true;
  }

  return payload;
};

const buildHistoryDeletePayload = (
  source: ParsedArgs,
): Record<string, unknown> => ({
  id: source.id,
  hard: source.hard === true,
});

const buildHistoryExportPayload = (
  source: ParsedArgs,
): Record<string, unknown> => {
  const payload: Record<string, unknown> = {};

  if (source.format !== undefined) {
    payload.format = source.format;
  }
  if (source.out !== undefined) {
    payload.outputPath = source.out;
  } else if (source.outputPath !== undefined) {
    payload.outputPath = source.outputPath;
  }
  if (source.scope !== undefined) {
    payload.scope = source.scope;
  }
  if (source.cwd !== undefined) {
    payload.cwd = source.cwd;
  }
  if (source.directory !== undefined) {
    payload.directory = source.directory;
  }
  if (source.session !== undefined) {
    payload.session = source.session;
  }
  if (source.repoRoot !== undefined) {
    payload.repoRoot = source.repoRoot;
  } else if (source["repo-root"] !== undefined) {
    payload.repoRoot = source["repo-root"];
  }
  if (source.limit !== undefined) {
    payload.limit = source.limit;
  }
  if (source.term !== undefined) {
    payload.term = source.term;
  }
  if (source.after !== undefined) {
    payload.after = source.after;
  }
  if (source.before !== undefined) {
    payload.before = source.before;
  }
  if (source.exit !== undefined) {
    payload.exit = source.exit;
  }
  if (source.deleted !== undefined) {
    payload.deleted = source.deleted;
  }
  if (source.redact !== undefined) {
    payload.redact = normalizeArray(source.redact);
  }

  return payload;
};

const buildHistoryImportPayload = (
  source: ParsedArgs,
): Record<string, unknown> => {
  const payload: Record<string, unknown> = {};

  if (source.format !== undefined) {
    payload.format = source.format;
  }
  if (source.in !== undefined) {
    payload.inputPath = source.in;
  } else if (source.inputPath !== undefined) {
    payload.inputPath = source.inputPath;
  }
  if (source.dedupe !== undefined) {
    payload.dedupe = source.dedupe;
  }
  if (source["dedupe"] !== undefined) {
    payload.dedupe = source["dedupe"];
  }
  if (source.dryRun === true || source["dry-run"] === true) {
    payload.dryRun = true;
  }
  if (source.redact !== undefined) {
    payload.redact = normalizeArray(source.redact);
  }

  return payload;
};

/**
 * Create a command executor with the given registry
 *
 * @param registry - Command registry containing available commands
 * @returns Async function that executes commands based on mode
 *
 * @example
 * ```ts
 * const registry = createCommandRegistry();
 * const executor = createCommandExecutor(registry);
 * await executor({
 *   mode: "snippet-list",
 *   input: { lbuffer: "git " },
 *   writer: new TextWriter()
 * });
 * ```
 */
export const createCommandExecutor = (registry: CommandRegistry) => {
  return async (context: CommandContext & { mode: string }) => {
    const { mode } = context;
    const command = registry.get(mode);

    if (command) {
      await command.execute(context);
    } else {
      await writeResult(context.writer.write.bind(context.writer), "failure");
      await context.writer.write({
        format: "%s mode is not exist\n",
        text: mode,
      });
    }
  };
};
