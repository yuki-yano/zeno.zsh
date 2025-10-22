import { createCommand } from "../types.ts";
import { createCommandRegistry as createRegistry } from "../registry.ts";
import { snippetList, snippetListOptions } from "../../snippet/snippet-list.ts";
import { autoSnippet } from "../../snippet/auto-snippet.ts";
import { insertSnippet } from "../../snippet/insert-snippet.ts";
import { nextPlaceholder } from "../../snippet/next-placeholder.ts";
import { completion } from "../../completion/completion.ts";
import { fzfOptionsToString } from "../../fzf/option/convert.ts";
import {
  handleNullableResult,
  handleStatusResult,
  writeResult,
} from "../../app-helpers.ts";
import type { WriteFunction } from "../../app-helpers.ts";
import { getConfigContext } from "../../config/index.ts";
import {
  type CompletionFunctionSource,
  isFunctionCompletionSource,
} from "../../type/fzf.ts";

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
    const separatorIsNull = Boolean(source.options["--read0"]);
    const command = createPrintfCommand(candidates, separatorIsNull);

    await writeResult(
      writeFn,
      "success",
      command,
      fzfOptionsToString(source.options),
      source.callback ?? "",
      source.callbackZero ? "zero" : "",
    );
  } catch (_error) {
    await writeResult(writeFn, "failure");
  }
};

const createPrintfCommand = (
  candidates: readonly string[],
  useNullSeparator: boolean,
): string => {
  if (candidates.length === 0) {
    return "printf ''";
  }

  const format = useNullSeparator ? "%s\\0" : "%s\\n";
  const quotedCandidates = candidates.map(quoteForSingleShellArg).join(" ");
  return `printf '${format}' ${quotedCandidates}`;
};

const quoteForSingleShellArg = (value: string): string =>
  `'${value.replace(/'/g, `'\\''`)}'`;

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
  registry.register(nextPlaceholderCommand);
  registry.register(completionCommand);

  return registry;
};
