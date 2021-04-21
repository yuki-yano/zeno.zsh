import { argParse } from "./deps.ts";
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

      console.log(snippetListCommand());
      for (const snippet of snippets) {
        console.log(snippet);
      }

      break;
    }

    case "insert-snippet": {
      const { status, buffer, cursor } = insertSnippet();
      console.log(status);
      console.log(buffer);
      console.log(cursor);

      break;
    }

    default: {
      console.error(`${mode} mode is not exist`);
    }
  }
};
