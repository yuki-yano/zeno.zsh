import { argParse, printf } from "./deps.ts";
import { autoSnippet } from "./snippet/auto-snippet.ts";
import { insertSnippet } from "./snippet/insert-snippet.ts";
import { snippetList, snippetListCommand } from "./snippet/snippet-list.ts";
import { readFromStdin } from "./util/io.ts";
import { fzfOptionsToString } from "./fzf/option/convert.ts";
import { completion } from "./completion/completion.ts";
import type { CompletionResult } from "./type/fzf.ts";
import { resultToCompletionItems } from "./completion/callback.ts";

type Args = {
  _: Array<string | number>;
  mode: string;
};

export const exec = () => {
  const { mode } = argParse(Deno.args) as Args;

  switch (mode) {
    case "snippet-list": {
      const snippets = snippetList();

      printf(`${snippetListCommand()}\n`);
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
        printf(`${result.buffer} \n`);
        printf(`${(result.cursor).toString()}\n`);
      }

      break;
    }

    case "insert-snippet": {
      const { status, buffer, cursor } = insertSnippet();
      printf(`${status}\n`);
      printf(`${buffer}\n`);
      printf(`${cursor}\n`);

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
      printf(`${source.id}\n`);
      printf(`${source.sourceCommand}\n`);
      printf(`${source.preview}\n`);
      printf("%s\n", fzfOptionsToString(source.options));

      break;
    }

    case "completion-callback": {
      const result = readFromStdin().split("\n");
      const items = resultToCompletionItems(result as CompletionResult);

      if (items == null) {
        return;
      }

      printf(`${items.join(" ")}\n`);

      break;
    }

    default: {
      console.error(`${mode} mode is not exist`);
      Deno.exit(1);
    }
  }
};
