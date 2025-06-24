import { argsParser, iterateReader } from "./deps.ts";
import { TextWriter, write } from "./text-writer.ts";
import { getErrorMessage } from "./utils/error.ts";
import { writeResult } from "./app-helpers.ts";
import { createCommandRegistry } from "./command/commands/index.ts";
import type { Input } from "./type/shell.ts";
import type { ArgParserArguments, ArgParserOptions } from "./deps.ts";
import type { CommandContext } from "./command/types.ts";

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

// Create a singleton registry
const commandRegistry = createCommandRegistry();

const execCommand = async (context: CommandContext & { mode: string }) => {
  const { mode } = context;
  const command = commandRegistry.get(mode);

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

    await execCommand({ mode, input, writer: { write } });
  } catch (error) {
    await write({ format: "%s\n", text: "failure" });
    await write({ format: "%s\n", text: getErrorMessage(error) });
    res = 1;
  }

  Deno.exit(res);
};
