import { argParse, printf } from "./deps.ts";
import { autoSnippet } from "./snippet/auto-snippet.ts";
import { insertSnippet } from "./snippet/insert-snippet.ts";
import { snippetList, snippetListOptions } from "./snippet/snippet-list.ts";
import { readFromStdin } from "./util/io.ts";
import { fzfOptionsToString } from "./fzf/option/convert.ts";
import { completion } from "./completion/completion.ts";
import { nextPlaceholder } from "./snippet/next-placeholder.ts";

type Args = {
  _: Array<string | number>;
  mode: string;
};

export const exec = () => {
  const { mode } = argParse(Deno.args) as Args;

  switch (mode) {
    case "snippet-list": {
      const snippets = snippetList();

      printf("%s\n", snippetListOptions());
      for (const snippet of snippets) {
        printf(`${snippet}\n`);
      }

      break;
    }

    case "auto-snippet": {
      const result = autoSnippet();

      if (result.status === "failure") {
        printf(`${result.status}\n`);
      }

      if (result.status === "success") {
        printf(`${result.status}\n`);
        printf("%s \n", result.buffer);
        printf(`${(result.cursor).toString()}\n`);
      }

      break;
    }

    case "insert-snippet": {
      const { status, buffer, cursor } = insertSnippet();
      printf(`${status}\n`);
      printf("%s\n", buffer);
      printf(`${cursor}\n`);

      break;
    }

    case "next-placeholder": {
      const buffer = readFromStdin().replace(/\n$/, "");
      const result = nextPlaceholder(buffer);

      if (result == null) {
        printf("failure\n");
        return;
      }

      const { nextBuffer, index } = result;

      printf("success\n");
      printf("%s\n", nextBuffer);
      printf(`${index}\n`);

      break;
    }

    case "completion": {
      const buffer = readFromStdin().replace(/\n$/, "");
      const source = completion(buffer);

      if (source == null) {
        printf("failure\n");
        return;
      }

      printf("success\n");
      printf("%s\n", source.sourceCommand);
      printf("%s\n", fzfOptionsToString(source.options));
      printf("%s\n", source.callback);

      break;
    }

    default: {
      console.error(`${mode} mode is not exist`);
      Deno.exit(1);
    }
  }
};
