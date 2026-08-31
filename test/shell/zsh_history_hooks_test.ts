import { assertEquals, describe, it, path } from "../deps.ts";
import {
  hasZsh,
  parseNullSeparatedPairs,
  shellQuote,
  ZSH_FUNCTIONS_DIR,
} from "./zsh_test_utils.ts";

const HISTORY_HOOKS_PATH = path.join(ZSH_FUNCTIONS_DIR, "zeno-history-hooks");

const runHistoryScenario = async (
  optionCommand: "setopt hist_ignore_space" | "unsetopt hist_ignore_space",
  command: string,
): Promise<Record<string, string>> => {
  const result = await new Deno.Command("zsh", {
    args: [
      "-dfc",
      [
        "emulate -L zsh",
        "unsetopt err_return err_exit",
        "typeset -gi ZENO_TEST_CLIENT_CALLS=0",
        "typeset -g ZENO_TEST_RECORDED_COMMAND",
        "function zeno-call-client-and-fallback() {",
        "  ZENO_TEST_CLIENT_CALLS=$(( ZENO_TEST_CLIENT_CALLS + 1 ))",
        "  while (( $# > 0 )); do",
        '    if [[ "$1" == "--cmd" ]]; then',
        '      ZENO_TEST_RECORDED_COMMAND="$2"',
        "      break",
        "    fi",
        "    shift",
        "  done",
        "}",
        "function zeno-test-print-kv() {",
        '  print -rn -- "$1"',
        "  print -rn -- $'\\0'",
        '  print -rn -- "$2"',
        "  print -rn -- $'\\0'",
        "}",
        `source ${shellQuote(HISTORY_HOOKS_PATH)}`,
        "zeno-history-hooks",
        optionCommand,
        `zeno-history-preexec ${shellQuote(command)}`,
        "zeno-history-precmd",
        'zeno-test-print-kv "CLIENT_CALLS" "$ZENO_TEST_CLIENT_CALLS"',
        'zeno-test-print-kv "RECORDED_COMMAND" "${ZENO_TEST_RECORDED_COMMAND-}"',
        "",
      ].join("\n"),
    ],
    stdin: "null",
    stdout: "piped",
    stderr: "piped",
  }).output();

  if (!result.success) {
    const stderr = new TextDecoder().decode(result.stderr).trimEnd();
    throw new Error(`zsh history hook scenario failed: ${stderr}`);
  }

  return parseNullSeparatedPairs(result.stdout, [
    "CLIENT_CALLS",
    "RECORDED_COMMAND",
  ]);
};

describe("zsh history hooks", () => {
  it("skips leading-space commands when HIST_IGNORE_SPACE is enabled", async () => {
    if (!await hasZsh()) {
      return;
    }

    const parsed = await runHistoryScenario(
      "setopt hist_ignore_space",
      " echo private",
    );

    assertEquals(parsed.CLIENT_CALLS, "0");
    assertEquals(parsed.RECORDED_COMMAND, "");
  });

  it("records leading-space commands when HIST_IGNORE_SPACE is disabled", async () => {
    if (!await hasZsh()) {
      return;
    }

    const parsed = await runHistoryScenario(
      "unsetopt hist_ignore_space",
      " echo visible",
    );

    assertEquals(parsed.CLIENT_CALLS, "1");
    assertEquals(parsed.RECORDED_COMMAND, " echo visible");
  });

  it("records normal commands when HIST_IGNORE_SPACE is enabled", async () => {
    if (!await hasZsh()) {
      return;
    }

    const parsed = await runHistoryScenario(
      "setopt hist_ignore_space",
      "echo visible",
    );

    assertEquals(parsed.CLIENT_CALLS, "1");
    assertEquals(parsed.RECORDED_COMMAND, "echo visible");
  });
});
