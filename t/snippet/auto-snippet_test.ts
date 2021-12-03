import {
  beforeAll,
  describe,
  it,
} from "https://deno.land/x/test_suite@0.9.1/mod.ts";
import { assertEquals } from "https://deno.land/std@0.113.0/testing/asserts.ts";

import { autoSnippet } from "../../src/snippet/auto-snippet.ts";
import type { AutoSnippetData } from "../../src/snippet/auto-snippet.ts";
import { setSettings } from "../../src/settings.ts";
import type { Input } from "../../src/type/shell.ts";
import { parametrize } from "../helpers.ts";

describe("snippet/auto-snippet", () => {
  beforeAll(() => {
    setSettings({
      snippets: [
        {
          name: "git status",
          keyword: "gs",
          snippet: "git status --short --branch",
        },
        {
          name: "null",
          keyword: "null",
          snippet: ">/dev/null 2>&1",
          context: {
            lbuffer: ".+\\s",
          },
        },
        {
          name: "brabra",
          keyword: "bra",
          snippet: "echo brabra",
          context: {
            lbuffer: "^\\s*bra\\s*$",
            rbuffer: "\\S",
          },
        },
        {
          name: "toto",
          keyword: "toto",
          snippet: `perl -e "$x='HOHO'; print $x;"`,
          evaluate: true,
        },
      ],
      completions: [],
    });
  });

  describe("autoSnippet()", () => {
    parametrize<[Input, AutoSnippetData]>([
      [
        {
          lbuffer: "gs",
          rbuffer: "",
        },
        {
          status: "success",
          buffer: "git status --short --branch",
          cursor: 28,
        },
      ],
      [
        {
          lbuffer: "  gs",
          rbuffer: "",
        },
        {
          status: "success",
          buffer: "git status --short --branch",
          cursor: 28,
        },
      ],
      [
        {
          lbuffer: "gs",
          rbuffer: "foo",
        },
        {
          status: "failure",
        },
      ],
      [
        {
          lbuffer: "gs",
          rbuffer: " foo",
        },
        {
          status: "success",
          buffer: "git status --short --branch foo",
          cursor: 28,
        },
      ],
      [
        {
          lbuffer: "ls   -al  null",
          rbuffer: "",
        },
        {
          status: "success",
          buffer: "ls -al >/dev/null 2>&1",
          cursor: 23,
        },
      ],
      [
        {
          lbuffer: "bra",
          rbuffer: " zee",
        },
        {
          status: "success",
          buffer: "echo brabra zee",
          cursor: 12,
        },
      ],
      [
        {
          lbuffer: "bra",
          rbuffer: " ",
        },
        {
          status: "failure",
        },
      ],
      [
        {
          lbuffer: "xyz bra",
          rbuffer: " zee",
        },
        {
          status: "failure",
        },
      ],
      [
        {
          lbuffer: "toto",
          rbuffer: "",
        },
        {
          status: "success",
          buffer: "HOHO",
          cursor: 5,
        },
      ],
    ], ([input, expected], index) => {
      it(`returns completion object (${index})[${input.lbuffer}${input.rbuffer}]`, async () => {
        const data = await autoSnippet(input);

        assertEquals(data, expected);
      });
    });
  });
});
