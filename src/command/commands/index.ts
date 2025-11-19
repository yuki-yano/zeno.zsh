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
import { fzfOptionsToString } from "../../fzf/option/convert.ts";
import {
  handleNullableResult,
  handleStatusResult,
  writeResult,
} from "../../app-helpers.ts";
import type { WriteFunction } from "../../app-helpers.ts";
import { getConfigContext, getSettings } from "../../config/index.ts";
import {
  type CompletionFunctionSource,
  isFunctionCompletionSource,
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

    await writeResult(
      writer.write.bind(writer),
      "success",
      source.sourceCommand,
      fzfOptionsToString(source.options),
      source.callback ?? "",
      source.callbackZero ? "zero" : "",
    );
  },
);

const handleFunctionCompletion = async (
  writeFn: WriteFunction,
  source: CompletionFunctionSource,
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

    await writeResult(
      writeFn,
      "success",
      command,
      fzfOptionsToString(options),
      source.callback ?? "",
      source.callbackZero ? "zero" : "",
    );
  } catch (_error) {
    await writeResult(writeFn, "failure");
  }
};

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
