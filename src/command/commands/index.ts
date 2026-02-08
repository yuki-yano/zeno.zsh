import { createCommand } from "../types.ts";
import { createCommandRegistry as createRegistry } from "../registry.ts";
import { snippetList, snippetListOptions } from "../../snippet/snippet-list.ts";
import { autoSnippet } from "../../snippet/auto-snippet.ts";
import { insertSnippet } from "../../snippet/insert-snippet.ts";
import { nextPlaceholder } from "../../snippet/next-placeholder.ts";
import {
  preparePreprompt,
  preparePrepromptFromSnippet,
} from "../../preprompt/index.ts";
import { completion } from "../../completion/completion.ts";
import { getCompletionSources } from "../../completion/source/index.ts";
import { fzfOptionsToString } from "../../fzf/option/convert.ts";
import {
  handleNullableResult,
  handleStatusResult,
  writeResult,
} from "../../app-helpers.ts";
import type { WriteFunction } from "../../app-helpers.ts";
import { getConfigContext, getSettings } from "../../config/index.ts";
import {
  hasCallbackFunction,
  isFunctionCompletionSource,
  type ResolvedCompletionFunctionSource,
  type ResolvedCompletionSource,
} from "../../type/fzf.ts";
import { createHistoryLogCommand } from "../../history/log-command.ts";
import { createHistoryQueryCommand } from "../../history/query-command.ts";
import { createHistoryDeleteCommand } from "../../history/delete-command.ts";
import { createHistoryExportCommand } from "../../history/export-command.ts";
import { createHistoryImportCommand } from "../../history/import-command.ts";
import { createHistoryFzfConfigCommand } from "../../history/fzf-config-command.ts";
import { getHistoryModule } from "../../history/runtime.ts";
import { ulid } from "../../deps.ts";

const MAX_INLINE_COMMAND_LENGTH = 120_000;
const SOURCE_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

type CallbackKind = "none" | "shell" | "function";

// Command implementations
export const pidCommand = createCommand(
  "pid",
  async ({ writer }) => {
    await writer.write({ format: "%s\n", text: Deno.pid.toString() });
  },
);

export const chdirCommand = createCommand(
  "chdir",
  ({ input }) => {
    if (input.dir === undefined) {
      throw new Error("option required: --input.dir=<path>");
    }
    Deno.chdir(input.dir);
    return Promise.resolve();
  },
);

export const snippetListCommand = createCommand(
  "snippet-list",
  async ({ writer }) => {
    const snippets = await snippetList();

    await writer.write({ format: "%s\n", text: snippetListOptions() });
    for (const snippet of snippets) {
      await writer.write({ format: "%s\n", text: snippet });
    }
  },
);

export const autoSnippetCommand = createCommand(
  "auto-snippet",
  async ({ input, writer }) => {
    const result = await autoSnippet(input);
    await handleStatusResult(writer.write.bind(writer), result, (r) => {
      if (r.status === "success") {
        return [r.buffer, r.cursor.toString()];
      }
      return [];
    });
  },
);

export const insertSnippetCommand = createCommand(
  "insert-snippet",
  async ({ input, writer }) => {
    const result = await insertSnippet(input);
    await handleStatusResult(writer.write.bind(writer), result, (r) => {
      if (r.status === "success") {
        return [r.buffer, r.cursor.toString()];
      }
      return [];
    });
  },
);

export const prepromptCommand = createCommand(
  "preprompt",
  async ({ input, writer }) => {
    const template = typeof input.template === "string" ? input.template : "";
    const result = preparePreprompt(template);
    await handleStatusResult(writer.write.bind(writer), result, (r) => [
      r.buffer!,
      r.cursor!.toString(),
    ]);
  },
);

export const prepromptSnippetCommand = createCommand(
  "preprompt-snippet",
  async ({ input, writer }) => {
    const snippetName = typeof input.snippet === "string" ? input.snippet : "";
    const result = await preparePrepromptFromSnippet(snippetName);
    await handleStatusResult(writer.write.bind(writer), result, (r) => [
      r.buffer!,
      r.cursor!.toString(),
    ]);
  },
);

export const nextPlaceholderCommand = createCommand(
  "next-placeholder",
  async ({ input, writer }) => {
    const result = nextPlaceholder(input);
    await handleNullableResult(
      writer.write.bind(writer),
      result?.index != null ? result : null,
      (r) => [r.nextBuffer, r.index.toString()],
    );
  },
);

export const completionCommand = createCommand(
  "completion",
  async ({ input, writer }) => {
    const source = await completion(input);
    if (!source) {
      await writeResult(writer.write.bind(writer), "failure");
      return;
    }

    if (isFunctionCompletionSource(source)) {
      await handleFunctionCompletion(writer.write.bind(writer), source);
      return;
    }

    await writeCompletionResult(
      writer.write.bind(writer),
      source,
      source.sourceCommand,
    );
  },
);

export const completionCallbackCommand = createCommand(
  "completion-callback",
  async ({ input, writer }) => {
    const sourceId = input.completionCallback?.sourceId;
    const selectedFile = input.completionCallback?.selectedFile;
    const expectKey = input.completionCallback?.expectKey;

    if (
      typeof sourceId !== "string" ||
      !SOURCE_ID_PATTERN.test(sourceId) ||
      typeof selectedFile !== "string" ||
      selectedFile.length === 0
    ) {
      await writeResult(writer.write.bind(writer), "failure");
      return;
    }

    let selected: readonly string[];
    try {
      selected = await readNullSeparatedSelectedFile(selectedFile);
    } catch (error) {
      console.error(
        `completion-callback failed to read selected file (${selectedFile}):`,
        error,
      );
      await writeResult(writer.write.bind(writer), "failure");
      return;
    }

    if (selected.length === 0) {
      const command = await createCandidatesCommand([], true);
      await writeResult(writer.write.bind(writer), "success", command);
      return;
    }

    const sources = await getCompletionSources();
    const source = sources.find((candidate) => candidate.id === sourceId);
    if (!source) {
      await writeResult(writer.write.bind(writer), "failure");
      return;
    }

    let resultCandidates: readonly string[] = selected;

    if (hasCallbackFunction(source)) {
      try {
        const context = await getConfigContext();
        const callbackResult = await source.callbackFunction({
          selected,
          context,
          lbuffer: input.lbuffer ?? "",
          rbuffer: input.rbuffer ?? "",
          expectKey,
        });

        if (!isStringArray(callbackResult)) {
          throw new Error(
            "Completion callback function must return an array of strings",
          );
        }
        resultCandidates = callbackResult;
      } catch (error) {
        console.error("completion-callback execution failed:", error);
        await writeResult(writer.write.bind(writer), "failure");
        return;
      }
    }

    const command = await createCandidatesCommand(resultCandidates, true);
    await writeResult(writer.write.bind(writer), "success", command);
  },
);

const handleFunctionCompletion = async (
  writeFn: WriteFunction,
  source: ResolvedCompletionFunctionSource,
): Promise<void> => {
  try {
    const context = await getConfigContext();
    const result = await source.sourceFunction(context);

    if (!Array.isArray(result)) {
      throw new Error(
        "Completion source function must return an array (items will be stringified)",
      );
    }

    const candidates = result.map((item) => `${item}`);
    const options = source.options;
    const separatorIsNull = Boolean(options["--read0"]);
    const command = await createCandidatesCommand(candidates, separatorIsNull);

    await writeCompletionResult(writeFn, source, command);
  } catch (_error) {
    await writeResult(writeFn, "failure");
  }
};

const resolveCallbackKind = (
  source: ResolvedCompletionSource,
): CallbackKind => {
  if (hasCallbackFunction(source)) {
    return "function";
  }

  if (source.callback) {
    return "shell";
  }

  return "none";
};

const writeCompletionResult = async (
  writeFn: WriteFunction,
  source: ResolvedCompletionSource,
  sourceCommand: string,
): Promise<void> => {
  await writeResult(
    writeFn,
    "success",
    sourceCommand,
    fzfOptionsToString(source.options),
    source.callback ?? "",
    source.callbackZero ? "zero" : "",
    resolveCallbackKind(source),
    source.id,
  );
};

const readNullSeparatedSelectedFile = async (
  filePath: string,
): Promise<readonly string[]> => {
  const data = await Deno.readFile(filePath);
  if (data.length === 0) {
    return [];
  }

  const text = new TextDecoder().decode(data);
  const selected = text.split("\0");
  if (selected.length > 0 && selected[selected.length - 1] === "") {
    selected.pop();
  }
  return selected;
};

const isStringArray = (value: unknown): value is readonly string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const createCandidatesCommand = async (
  candidates: readonly string[],
  useNullSeparator: boolean,
): Promise<string> => {
  if (candidates.length === 0) {
    return "printf ''";
  }

  const format = useNullSeparator ? "%s\\0" : "%s\\n";

  let inlineLength = `printf '${format}'`.length;
  const quotedCandidates: string[] = [];
  let exceedsArgMax = false;

  for (const candidate of candidates) {
    const quoted = quoteForSingleShellArg(candidate);
    inlineLength += quoted.length + 1; // account for the separating space
    if (inlineLength > MAX_INLINE_COMMAND_LENGTH) {
      exceedsArgMax = true;
      break;
    }
    quotedCandidates.push(quoted);
  }

  if (!exceedsArgMax) {
    return `printf '${format}' ${quotedCandidates.join(" ")}`;
  }

  const separator = useNullSeparator ? "\0" : "\n";
  const trailing = useNullSeparator ? "\0" : "\n";
  const tempFile = await Deno.makeTempFile({
    prefix: "zeno-completion-",
    suffix: useNullSeparator ? ".bin" : ".txt",
  });
  const encoder = new TextEncoder();
  const payload = candidates.join(separator) + trailing;
  await Deno.writeFile(tempFile, encoder.encode(payload));

  const quotedPath = quoteForSingleShellArg(tempFile);
  return `cat ${quotedPath}; rm -f ${quotedPath}`;
};

const quoteForSingleShellArg = (value: string): string => {
  if (value.length === 0) {
    return "''";
  }

  return `'${value.replace(/'/g, `'\"'\"'`)}'`;
};

/**
 * Create and register all commands
 */
export const createCommandRegistry = () => {
  const registry = createRegistry();

  // Register all commands
  registry.register(pidCommand);
  registry.register(chdirCommand);
  registry.register(snippetListCommand);
  registry.register(autoSnippetCommand);
  registry.register(insertSnippetCommand);
  registry.register(prepromptCommand);
  registry.register(prepromptSnippetCommand);
  registry.register(nextPlaceholderCommand);
  registry.register(completionCommand);
  registry.register(completionCallbackCommand);
  registry.register(
    createHistoryLogCommand({
      getHistoryModule,
      loadHistorySettings: async () => (await getSettings()).history,
      generateId: () => ulid(),
      now: () => new Date().toISOString(),
    }),
  );
  registry.register(
    createHistoryQueryCommand({
      getHistoryModule,
      loadHistorySettings: async () => (await getSettings()).history,
      now: () => new Date(),
    }),
  );
  registry.register(
    createHistoryFzfConfigCommand({
      loadHistorySettings: async () => (await getSettings()).history,
    }),
  );
  registry.register(
    createHistoryDeleteCommand({
      getHistoryModule,
    }),
  );
  registry.register(
    createHistoryExportCommand({
      getHistoryModule,
      loadHistorySettings: async () => (await getSettings()).history,
      now: () => new Date(),
    }),
  );
  registry.register(
    createHistoryImportCommand({
      getHistoryModule,
      loadHistorySettings: async () => (await getSettings()).history,
    }),
  );

  return registry;
};
