import { argParse, iter, sprintf } from "./deps.ts";
import { autoSnippet } from "./snippet/auto-snippet.ts";
import { insertSnippet } from "./snippet/insert-snippet.ts";
import { snippetList, snippetListOptions } from "./snippet/snippet-list.ts";
import { fzfOptionsToString } from "./fzf/option/convert.ts";
import { completion } from "./completion/completion.ts";
import { nextPlaceholder } from "./snippet/next-placeholder.ts";

type Args = {
  _: Array<string | number>;
  mode: string;
};

export const exec = async () => {
  const socketPath = Deno.env.get("ZENO_SOCK")!;
  const listener = Deno.listen({
    transport: "unix",
    path: socketPath,
  });
  for await (const conn of listener) {
    for await (const r of iter(conn)) {
      const command = new TextDecoder().decode(r);
      const args = command.split(/ +/);
      const parsedArgs = argParse(args) as Args;
      const { mode } = parsedArgs;
      const input = parsedArgs._.join(" ");

      switch (mode) {
        case "snippet-list": {
          const snippets = snippetList();

          conn.write(
            new TextEncoder().encode(sprintf("%s\n", snippetListOptions())),
          );
          for (const snippet of snippets) {
            conn.write(new TextEncoder().encode(sprintf(`%s\n`, snippet)));
          }

          break;
        }

        case "auto-snippet": {
          const result = await autoSnippet(input);

          if (result.status === "failure") {
            conn.write(
              new TextEncoder().encode(sprintf("%s\n", result.status)),
            );
          }

          if (result.status === "success") {
            conn.write(
              new TextEncoder().encode(sprintf("%s\n", result.status)),
            );
            conn.write(
              new TextEncoder().encode(sprintf("%s \n", result.buffer)),
            );
            conn.write(
              new TextEncoder().encode(
                sprintf("%s\n", (result.cursor).toString()),
              ),
            );
          }

          break;
        }

        case "insert-snippet": {
          const result = await insertSnippet(input);
          if (result.status === "failure") {
            conn.write(
              new TextEncoder().encode(sprintf("%s\n", result.status)),
            );
          }

          if (result.status === "success") {
            conn.write(
              new TextEncoder().encode(sprintf("%s\n", result.status)),
            );
            conn.write(
              new TextEncoder().encode(sprintf("%s\n", result.buffer)),
            );
            conn.write(
              new TextEncoder().encode(sprintf("%s\n", result.cursor)),
            );
          }

          break;
        }

        case "next-placeholder": {
          const buffer = input.replace(/\n$/, "");
          const result = nextPlaceholder(buffer);

          if (result == null) {
            conn.write(new TextEncoder().encode(sprintf("failure\n")));
            break;
          }

          const { nextBuffer, index } = result;

          conn.write(new TextEncoder().encode(sprintf("success\n")));
          conn.write(new TextEncoder().encode(sprintf("%s\n", nextBuffer)));
          conn.write(new TextEncoder().encode(sprintf("%s\n", index)));

          break;
        }

        case "completion": {
          const buffer = input.replace(/\n$/, "");
          const source = completion(buffer);

          if (source == null) {
            conn.write(new TextEncoder().encode(sprintf("failure\n")));
            break;
          }

          conn.write(new TextEncoder().encode(sprintf("success\n")));
          conn.write(
            new TextEncoder().encode(sprintf("%s\n", source.sourceCommand)),
          );
          conn.write(
            new TextEncoder().encode(
              sprintf("%s\n", fzfOptionsToString(source.options)),
            ),
          );
          conn.write(
            new TextEncoder().encode(sprintf("%s\n", source.callback)),
          );

          break;
        }

        default: {
          conn.write(new TextEncoder().encode(sprintf("failure\n")));
          conn.write(
            new TextEncoder().encode(sprintf("%s mode is not exist\n", mode)),
          );
        }
      }
      conn.closeWrite();
    }
  }
};
