import { argParse, iter, printf, sprintf } from "./deps.ts";
import { autoSnippet } from "./snippet/auto-snippet.ts";
import { insertSnippet } from "./snippet/insert-snippet.ts";
import { snippetList, snippetListOptions } from "./snippet/snippet-list.ts";
import { fzfOptionsToString } from "./fzf/option/convert.ts";
import { completion } from "./completion/completion.ts";
import { nextPlaceholder } from "./snippet/next-placeholder.ts";
import { ZENO_ENABLE_SOCK, ZENO_SOCK } from "./settings.ts";
import { readFromStdin } from "./util/io.ts";

type Args = {
  _: Array<string | number>;
  mode: string;
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
  { format, text }: {
    format: string;
    text: string;
  },
): Promise<void> => {
  if (ZENO_SOCK != null && conn != null) {
    const conn = getConn();
    textEncoder = textEncoder ?? new TextEncoder();
    await conn.write(textEncoder.encode(sprintf(format, text)));
  } else {
    printf(format, text);
  }
};

const execCommand = async (
  { mode, input }: { mode: string; input: string },
) => {
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
      const buffer = input.replace(/\n$/, "");
      const result = nextPlaceholder(buffer);

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
      const buffer = input.replace(/\n$/, "");
      const source = completion(buffer);

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

    default: {
      await write({ format: "%s\n", text: "failure" });
      await write({ format: "%s mode is not exist\n", text: mode });
    }
  }
};

export const exec = async () => {
  if (ZENO_ENABLE_SOCK != null && ZENO_SOCK != null) {
    const listener = Deno.listen({
      transport: "unix",
      path: ZENO_SOCK,
    });

    for await (const conn of listener) {
      for await (const r of iter(conn)) {
        setConn(conn);
        textDecoder = textDecoder ?? new TextDecoder();

        const command = textDecoder.decode(r);
        const args = command.split(/ +/);
        const parsedArgs = argParse(args) as Args;
        const { mode } = parsedArgs;
        const input = parsedArgs._.join(" ");

        await execCommand({ mode, input });

        conn.closeWrite();
        clearConn();
      }
    }
  } else {
    const command = readFromStdin();
    const { mode } = argParse(Deno.args) as Args;
    const args = command.split(/ +/);
    const parsedArgs = argParse(args) as Args;
    const input = parsedArgs._.join(" ");

    await execCommand({ mode, input });
    Deno.exit(0);
  }
};
