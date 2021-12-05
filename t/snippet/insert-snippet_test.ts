import { assertEquals, beforeAll, describe, it } from "t/deps.ts";
import { parametrize } from "t/helpers.ts";

import { insertSnippet } from "src/snippet/insert-snippet.ts";
import type { InsertSnippetData } from "src/snippet/insert-snippet.ts";
import { setSettings } from "src/settings.ts";
import type { Input } from "src/type/shell.ts";

describe("snippet/insert-snippet", () => {
  beforeAll(() => {
    setSettings({
      snippets: [
        {
          name: "foo",
          snippet: "Foo Foo",
        },
        {
          name: "  bar ",
          snippet: ">/dev/null 2>&1",
        },
        {
          name: "evaluate",
          snippet: `perl -e "$x='HOHO'; print $x;"`,
          evaluate: true,
        },
        {
          name: "placeholder",
          snippet: "| sed 's/{{MATCH}}/{{REPLACE}}/g'",
        },
        {
          name: "evaluate-placeholder",
          snippet: `perl -e "print '| sed \\'s/{{MATCH}}/{{REPLACE}}/g\\''"`,
          evaluate: true,
        },
      ],
      completions: [],
    });
  });

  describe("insertSnippet()", () => {
    parametrize<[Input, InsertSnippetData]>([
      [
        {
          snippet: "foo",
          lbuffer: "",
          rbuffer: "",
        },
        {
          status: "success",
          buffer: "Foo Foo ",
          cursor: 8,
        },
      ],
      [
        // TODO: Is this valid spec?
        {
          snippet: "foo",
          lbuffer: "bar",
          rbuffer: "",
        },
        {
          status: "success",
          buffer: "barFoo Foo ",
          cursor: 11,
        },
      ],
      [
        // TODO: Is this valid spec?
        {
          snippet: "foo",
          lbuffer: "bar",
          rbuffer: "baz",
        },
        {
          status: "success",
          buffer: "barFoo Foobaz ",
          cursor: 11,
        },
      ],
      [
        {
          snippet: "evaluate",
          lbuffer: "bar",
          rbuffer: "",
        },
        {
          status: "success",
          buffer: "barHOHO ",
          cursor: 8,
        },
      ],
      [
        {
          snippet: "placeholder",
          lbuffer: "bar",
          rbuffer: "",
        },
        {
          status: "success",
          buffer: "bar| sed 's//{{REPLACE}}/g' ",
          cursor: 12,
        },
      ],
      [
        {
          snippet: "evaluate-placeholder",
          lbuffer: "bar",
          rbuffer: "",
        },
        {
          status: "success",
          buffer: "bar| sed 's//{{REPLACE}}/g' ",
          cursor: 12,
        },
      ],
    ], ([input, expected], index) => {
      const label = `${input.snippet},${input.lbuffer},${input.rbuffer}`;
      it(`returns completion object (${index})[${label}]`, async () => {
        const data = await insertSnippet(input);

        assertEquals(data, expected);
      });
    });
  });
});
