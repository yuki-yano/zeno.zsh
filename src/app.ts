import { argsParser, iterateReader, printf, sprintf } from "./deps.ts";
import { autoSnippet } from "./snippet/auto-snippet.ts";
import { insertSnippet } from "./snippet/insert-snippet.ts";
import { snippetList, snippetListOptions } from "./snippet/snippet-list.ts";
import { fzfOptionsToString } from "./fzf/option/convert.ts";
import { completion } from "./completion/completion.ts";
import { nextPlaceholder } from "./snippet/next-placeholder.ts";
import { ZENO_SOCK } from "./settings.ts";
import type { Input } from "./type/shell.ts";

type ClientCall = {
  args?: Array<string>;
};

type Args = {
  _: Array<string | number>;
  "zeno-mode": string;
  input: Input;
};

const argsParseOption = {
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

let textEncoder: TextEncoder;
let textDecoder: TextDecoder;
let conn: Deno.Conn | undefined;

const setConn = (newConn: Deno.Conn): void => {
  conn = newConn;
};

const getConn = (): Deno.Conn => {
  if (conn == null) {
    throw new Error("Conn is not set");
  }

  return conn;
};

const clearConn = (): void => {
  conn = undefined;
};

const write = async (
  { format, text }: { format: string; text: string },
): Promise<void> => {
  if (ZENO_SOCK != null && conn != null) {
    const conn = getConn();
    textEncoder = textEncoder ?? new TextEncoder();
    await conn.write(textEncoder.encode(sprintf(format, text)));
  } else {
    printf(format, text);
  }
};

const execCommand = async ({
  mode,
  input,
}: {
  mode: string;
  input: Input;
}) => {
  switch (mode) {
    case "snippet-list": {
      const snippets = snippetList();

      await write({ format: "%s\n", text: snippetListOptions() });
      for (const snippet of snippets) {
        await write({ format: "%s\n", text: snippet });
      }

      break;
    }

    case "auto-snippet": {
      const result = await autoSnippet(input);

      if (result.status === "failure") {
        await write({ format: "%s\n", text: result.status });
      }

      if (result.status === "success") {
        await write({ format: "%s\n", text: result.status });
        await write({ format: "%s \n", text: result.buffer });
        await write({ format: "%s\n", text: (result.cursor).toString() });
      }

      break;
    }

    case "insert-snippet": {
      const result = await insertSnippet(input);
      if (result.status === "failure") {
        await write({ format: "%s\n", text: result.status });
      }

      if (result.status === "success") {
        await write({ format: "%s\n", text: result.status });
        await write({ format: "%s\n", text: result.buffer });
        await write({ format: "%s\n", text: result.cursor.toString() });
      }

      break;
    }

    case "next-placeholder": {
      const result = nextPlaceholder(input);

      if (result?.index != null) {
        const { nextBuffer, index } = result;

        await write({ format: "%s\n", text: "success" });
        await write({ format: "%s\n", text: nextBuffer });
        await write({ format: "%s\n", text: index.toString() });
      } else {
        await write({ format: "&s\n", text: "failure" });
      }

      break;
    }

    case "completion": {
      const source = completion(input);

      if (source != null) {
        await write({ format: "%s\n", text: "success" });
        await write({ format: "%s\n", text: source.sourceCommand });
        await write({
          format: "%s\n",
          text: fzfOptionsToString(source.options),
        });
        await write({ format: "%s\n", text: source.callback });
      } else {
        await write({ format: "%s\n", text: "failure" });
      }

      break;
    }

    case "pid": {
      await write({ format: "%s\n", text: Deno.pid.toString() });
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
      await write({ format: "%s\n", text: "failure" });
      await write({ format: "%s mode is not exist\n", text: mode });
    }
  }
};

const parseArgs = ({ args }: { args: Array<string> }) => {
  const parsedArgs = argsParser(args, argsParseOption) as Args;
  const mode = parsedArgs["zeno-mode"] ?? "";
  const input = parsedArgs.input ?? {};
  const filteredInput = Object.fromEntries(
    Object.entries(input).map(
      ([key, value]) => [key, value === undefined ? undefined : `${value}`],
    ),
  ) as Input;
  return { mode, input: filteredInput };
};

export const execServer = async ({ socketPath }: { socketPath: string }) => {
  const listener = Deno.listen({
    transport: "unix",
    path: socketPath,
  });

  for await (const conn of listener) {
    for await (const r of iterateReader(conn)) {
      try {
        setConn(conn);

        textDecoder = textDecoder ?? new TextDecoder();
        const json = textDecoder.decode(r);
        const clientCall = JSON.parse(json) as ClientCall;
        const args = clientCall.args ?? [];
        const { mode, input } = parseArgs({ args });

        await execCommand({ mode, input });
      } catch (ex) {
        await write({ format: "%s\n", text: "failure" });
        await write({ format: "%s\n", text: `${ex}` });
      } finally {
        conn.closeWrite();
        clearConn();
      }
    }
  }
};

export const execCli = async ({ args }: { args: Array<string> }) => {
  let res = 0;

  try {
    const { mode, input } = parseArgs({ args });

    await execCommand({ mode, input });
  } catch (ex) {
    await write({ format: "%s\n", text: "failure" });
    await write({ format: "%s\n", text: `${ex}` });
    res = 1;
  }

  Deno.exit(res);
};
