import { argsParser, iterateReader } from "./deps.ts";
import { autoSnippet } from "./snippet/auto-snippet.ts";
import { insertSnippet } from "./snippet/insert-snippet.ts";
import { snippetList, snippetListOptions } from "./snippet/snippet-list.ts";
import { fzfOptionsToString } from "./fzf/option/convert.ts";
import { completion } from "./completion/completion.ts";
import { nextPlaceholder } from "./snippet/next-placeholder.ts";
import { TextWriter, write } from "./text-writer.ts";
import { getErrorMessage } from "./utils/error.ts";
import {
  handleNullableResult,
  handleStatusResult,
  writeResult,
} from "./app-helpers.ts";
import type { Input } from "./type/shell.ts";
import type { ArgParserArguments, ArgParserOptions } from "./deps.ts";

type ClientCall = Readonly<{
  args?: readonly string[];
}>;

interface Args extends ArgParserArguments {
  "zeno-mode": string;
  input: Input;
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

let textDecoder: TextDecoder;

const execCommand = async ({
  mode,
  input,
  writer = { write },
}: {
  mode: string;
  input: Input;
  writer?: { write: typeof write };
}) => {
  switch (mode) {
    case "snippet-list": {
      const snippets = await snippetList();

      await writer.write({ format: "%s\n", text: snippetListOptions() });
      for (const snippet of snippets) {
        await writer.write({ format: "%s\n", text: snippet });
      }

      break;
    }

    case "auto-snippet": {
      const result = await autoSnippet(input);
      await handleStatusResult(writer.write.bind(writer), result, (r) => [
        r.buffer,
        r.cursor.toString(),
      ]);
      break;
    }

    case "insert-snippet": {
      const result = await insertSnippet(input);
      await handleStatusResult(writer.write.bind(writer), result, (r) => [
        r.buffer,
        r.cursor.toString(),
      ]);
      break;
    }

    case "next-placeholder": {
      const result = nextPlaceholder(input);
      await handleNullableResult(
        writer.write.bind(writer),
        result?.index != null ? result : null,
        (r) => [r.nextBuffer, r.index.toString()],
      );
      break;
    }

    case "completion": {
      const source = await completion(input);
      await handleNullableResult(writer.write.bind(writer), source, (s) => [
        s.sourceCommand,
        fzfOptionsToString(s.options),
        s.callback ?? "",
        s.callbackZero ? "zero" : "",
      ]);
      break;
    }

    case "pid": {
      await writer.write({ format: "%s\n", text: Deno.pid.toString() });
      break;
    }

    case "chdir": {
      if (input.dir === undefined) {
        throw new Error("option required: --input.dir=<path>");
      }
      Deno.chdir(input.dir);
      break;
    }

    default: {
      await writeResult(writer.write.bind(writer), "failure");
      await writer.write({ format: "%s mode is not exist\n", text: mode });
    }
  }
};

const parseArgs = ({ args }: { args: readonly string[] }) => {
  const parsedArgs = argsParser([...args], argsParseOption) as Readonly<Args>;
  const mode = parsedArgs["zeno-mode"] ?? "";
  const rawInput = parsedArgs.input ?? {};

  // Validate and convert input fields
  const input: Input = {
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

  return { mode, input };
};

export const execServer = async ({ socketPath }: { socketPath: string }) => {
  const listener = Deno.listen({
    transport: "unix",
    path: socketPath,
  });

  for await (const conn of listener) {
    for await (const r of iterateReader(conn)) {
      const writer = new TextWriter();
      writer.setConn(conn);

      try {
        textDecoder = textDecoder ?? new TextDecoder();
        const json = textDecoder.decode(r);
        const clientCall = JSON.parse(json) as ClientCall;
        const args = clientCall.args ?? [];
        const { mode, input } = parseArgs({ args });

        await execCommand({ mode, input, writer });
      } catch (error) {
        await writer.write({ format: "%s\n", text: "failure" });
        await writer.write({ format: "%s\n", text: getErrorMessage(error) });
      } finally {
        conn.closeWrite();
      }
    }
  }
};

export const execCli = async ({ args }: { args: Array<string> }) => {
  let res = 0;

  try {
    const { mode, input } = parseArgs({ args });

    await execCommand({ mode, input });
  } catch (error) {
    await write({ format: "%s\n", text: "failure" });
    await write({ format: "%s\n", text: getErrorMessage(error) });
    res = 1;
  }

  Deno.exit(res);
};
