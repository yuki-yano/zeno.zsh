import { createCommand } from "../types.ts";
import { createCommandRegistry as createRegistry } from "../registry.ts";
import { snippetList, snippetListOptions } from "../../snippet/snippet-list.ts";
import { autoSnippet } from "../../snippet/auto-snippet.ts";
import { insertSnippet } from "../../snippet/insert-snippet.ts";
import { nextPlaceholder } from "../../snippet/next-placeholder.ts";
import { completion } from "../../completion/completion.ts";
import { fzfOptionsToString } from "../../fzf/option/convert.ts";
import { handleNullableResult, handleStatusResult } from "../../app-helpers.ts";

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
    await handleNullableResult(writer.write.bind(writer), source, (s) => [
      s.sourceCommand,
      fzfOptionsToString(s.options),
      s.callback ?? "",
      s.callbackZero ? "zero" : "",
    ]);
  },
);

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
