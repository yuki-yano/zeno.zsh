import { describe, it } from "https://deno.land/x/test_suite@0.9.1/mod.ts";
import { assertEquals } from "https://deno.land/std@0.113.0/testing/asserts.ts";

import { normalizeCommand, parseCommand } from "../src/command.ts";
import type { ParsedCommand } from "../src/command.ts";
import { parametrize } from "./helpers.ts";

describe("command", () => {
  describe("parseCommand()", () => {
    parametrize<[string, ParsedCommand]>([
      [
        `ls`,
        {
          command: `ls`,
          normalized: `ls`,
          args: ["ls"],
          hasLeadingSpace: false,
          hasTrailingSpace: false,
        },
      ],
      [
        `ls  `,
        {
          command: `ls  `,
          normalized: `ls`,
          args: ["ls"],
          hasLeadingSpace: false,
          hasTrailingSpace: true,
        },
      ],
      [
        ` ls -al`,
        {
          command: ` ls -al`,
          normalized: `ls -al`,
          args: ["ls", "-al"],
          hasLeadingSpace: true,
          hasTrailingSpace: false,
        },
      ],
      [
        `  ls -al `,
        {
          command: `  ls -al `,
          normalized: `ls -al`,
          args: ["ls", "-al"],
          hasLeadingSpace: true,
          hasTrailingSpace: true,
        },
      ],
      [
        `ls  -l foo   "bar baz" 'qux' '$qux' "$qux" `,
        {
          command: `ls  -l foo   "bar baz" 'qux' '$qux' "$qux" `,
          normalized: `ls -l foo "bar baz" qux '$qux' "$qux"`,
          args: ["ls", "-l", "foo", `"bar baz"`, "qux", "'$qux'", `"$qux"`],
          hasLeadingSpace: false,
          hasTrailingSpace: true,
        },
      ],
    ], ([command, expected], index) => {
      it(`returns parsed command object (${index})[${command}]`, () => {
        const parsed = parseCommand(command);

        assertEquals(parsed, expected);
      });
    });
  });

  describe("normalizeCommand()", () => {
    it(`returns normalized command string`, () => {
      const command = `ls  -l foo   "bar baz" 'qux' '$qux' "$qux" `;
      const expected = `ls -l foo "bar baz" qux '$qux' "$qux"`;

      const normalized = normalizeCommand(command);

      assertEquals(normalized, expected);
    });
  });
});
