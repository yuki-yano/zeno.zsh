import { argParse, printf } from "./deps.ts";
import { autoSnippet } from "./snippet/auto-snippet.ts";
import { insertSnippet } from "./snippet/insert-snippet.ts";
import { snippetList, snippetListCommand } from "./snippet/snippet-list.ts";

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

    default: {
      console.error(`${mode} mode is not exist`);
    }
  }
};
