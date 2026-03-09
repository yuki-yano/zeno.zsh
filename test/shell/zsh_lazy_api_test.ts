import { assertEquals, describe, it } from "../deps.ts";
import {
  hasZsh,
  parseNullSeparatedPairs,
  shellQuote,
  ZSH_BOOTSTRAP_ENTRYPOINT,
} from "./zsh_test_utils.ts";

const runZshScript = async (
  script: string,
): Promise<Record<string, string>> => {
  const result = await new Deno.Command("zsh", {
    args: ["-dfc", script],
    stdin: "null",
    stdout: "piped",
    stderr: "piped",
  }).output();

  if (!result.success) {
    const stderr = new TextDecoder().decode(result.stderr).trimEnd();
    throw new Error(`zsh lazy api scenario failed: ${stderr}`);
  }

  return parseNullSeparatedPairs(result.stdout);
};

const createPrintHelpers = (): string[] => [
  "function zeno-test-print-kv() {",
  '  local key="$1"',
  '  local value="$2"',
  '  print -rn -- "$key"',
  "  print -rn -- $'\\0'",
  '  print -rn -- "$value"',
  "  print -rn -- $'\\0'",
  "}",
];

const createSetupLines = (): string[] => [
  "unset ZENO_ROOT ZENO_ENABLE ZENO_LOADED ZENO_BOOTSTRAPPED ZENO_FZF_COMMAND ZENO_DISABLE_SOCK",
  "unset ZENO_COMPLETION_FALLBACK ZENO_AUTO_SNIPPET_FALLBACK",
  "typeset -gA ZENO_TEST_WIDGET_MAP",
  "typeset -ga ZENO_TEST_ZLE_LOG",
  "typeset -ga ZENO_TEST_BINDKEY_LOG",
  "function zle() {",
  '  if [[ "$1" == "-N" ]]; then',
  '    local widget_name="$2"',
  '    local widget_function="$3"',
  '    if [[ "$widget_name" == "--" ]]; then',
  '      widget_name="$3"',
  '      widget_function="$4"',
  "    fi",
  '    if [[ -z "$widget_function" ]]; then',
  '      widget_function="$widget_name"',
  "    fi",
  '    ZENO_TEST_WIDGET_MAP[$widget_name]="$widget_function"',
  "    return 0",
  "  fi",
  '  ZENO_TEST_ZLE_LOG+=("$1")',
  '  local widget_function="${ZENO_TEST_WIDGET_MAP[$1]-$1}"',
  "  if (( $+functions[$widget_function] )); then",
  '    local WIDGET="$1"',
  '    "$widget_function"',
  "    return $?",
  "  fi",
  "  return 0",
  "}",
  "function bindkey() {",
  '  ZENO_TEST_BINDKEY_LOG+=("$*")',
  "}",
];

describe("zsh lazy public api", () => {
  it("zeno-register-lazy-widget ensures load before executing the real widget", async () => {
    if (!await hasZsh()) {
      return;
    }

    const parsed = await runZshScript([
      "emulate -L zsh",
      "unsetopt err_return err_exit",
      ...createSetupLines(),
      ...createPrintHelpers(),
      "typeset -gi ZENO_TEST_ENSURE_CALLS=0",
      "typeset -gi ZENO_TEST_WIDGET_CALLS=0",
      `source ${shellQuote(ZSH_BOOTSTRAP_ENTRYPOINT)}`,
      "function zeno-ensure-loaded() {",
      "  ZENO_TEST_ENSURE_CALLS=$(( ZENO_TEST_ENSURE_CALLS + 1 ))",
      "  typeset -g ZENO_LOADED=1",
      "}",
      "function zeno-completion() {",
      "  ZENO_TEST_WIDGET_CALLS=$(( ZENO_TEST_WIDGET_CALLS + 1 ))",
      "}",
      "zeno-register-lazy-widget zeno-completion",
      "zle zeno-completion",
      'zeno-test-print-kv "ENSURE_CALLS" "${ZENO_TEST_ENSURE_CALLS}"',
      'zeno-test-print-kv "WIDGET_CALLS" "${ZENO_TEST_WIDGET_CALLS}"',
      "",
    ].join("\n"));

    assertEquals(parsed.ENSURE_CALLS, "1");
    assertEquals(parsed.WIDGET_CALLS, "1");
  });

  it("lazy widget fallback uses upstream defaults when ensure-loaded fails", async () => {
    if (!await hasZsh()) {
      return;
    }

    const parsed = await runZshScript([
      "emulate -L zsh",
      "unsetopt err_return err_exit",
      ...createSetupLines(),
      ...createPrintHelpers(),
      "typeset -gi ZENO_TEST_COMPLETION_WIDGET_CALLS=0",
      "typeset -gi ZENO_TEST_COMPLETION_FALLBACK_CALLS=0",
      "typeset -gi ZENO_TEST_AUTO_SNIPPET_FALLBACK_CALLS=0",
      "typeset -gi ZENO_TEST_SMART_HISTORY_FALLBACK_CALLS=0",
      "typeset -gi ZENO_TEST_SPACE_FALLBACK_CALLS=0",
      `source ${shellQuote(ZSH_BOOTSTRAP_ENTRYPOINT)}`,
      "function zeno-ensure-loaded() {",
      "  return 1",
      "}",
      "function zeno-completion() {",
      "  ZENO_TEST_COMPLETION_WIDGET_CALLS=$(( ZENO_TEST_COMPLETION_WIDGET_CALLS + 1 ))",
      "}",
      "function expand-or-complete() {",
      "  ZENO_TEST_COMPLETION_FALLBACK_CALLS=$(( ZENO_TEST_COMPLETION_FALLBACK_CALLS + 1 ))",
      "}",
      "function self-insert() {",
      "  ZENO_TEST_AUTO_SNIPPET_FALLBACK_CALLS=$(( ZENO_TEST_AUTO_SNIPPET_FALLBACK_CALLS + 1 ))",
      "}",
      "function zeno-history-selection() {",
      "  ZENO_TEST_SMART_HISTORY_FALLBACK_CALLS=$(( ZENO_TEST_SMART_HISTORY_FALLBACK_CALLS + 1 ))",
      "}",
      "zeno-register-lazy-widget zeno-completion",
      "zeno-register-lazy-widget zeno-auto-snippet",
      "zeno-register-lazy-widget zeno-smart-history-selection",
      "zeno-register-lazy-widget zeno-insert-space",
      "zle zeno-completion",
      "zle zeno-auto-snippet",
      "zle zeno-smart-history-selection",
      "BUFFER=''",
      "LBUFFER=''",
      "RBUFFER=''",
      "CURSOR=0",
      "zle zeno-insert-space",
      'zeno-test-print-kv "COMPLETION_WIDGET_CALLS" "${ZENO_TEST_COMPLETION_WIDGET_CALLS}"',
      'zeno-test-print-kv "COMPLETION_FALLBACK_CALLS" "${ZENO_TEST_COMPLETION_FALLBACK_CALLS}"',
      'zeno-test-print-kv "AUTO_SNIPPET_FALLBACK_CALLS" "${ZENO_TEST_AUTO_SNIPPET_FALLBACK_CALLS}"',
      'zeno-test-print-kv "SMART_HISTORY_FALLBACK_CALLS" "${ZENO_TEST_SMART_HISTORY_FALLBACK_CALLS}"',
      'zeno-test-print-kv "SPACE_BUFFER" "${BUFFER-}"',
      'zeno-test-print-kv "SPACE_LBUFFER" "${LBUFFER-}"',
      'zeno-test-print-kv "SPACE_CURSOR" "${CURSOR-}"',
      "",
    ].join("\n"));

    assertEquals(parsed.COMPLETION_WIDGET_CALLS, "0");
    assertEquals(parsed.COMPLETION_FALLBACK_CALLS, "1");
    assertEquals(parsed.AUTO_SNIPPET_FALLBACK_CALLS, "1");
    assertEquals(parsed.SMART_HISTORY_FALLBACK_CALLS, "1");
    assertEquals(parsed.SPACE_BUFFER, " ");
    assertEquals(parsed.SPACE_LBUFFER, " ");
    assertEquals(parsed.SPACE_CURSOR, "1");
  });

  it("zeno-bind-default-keys supports lazy mode without user-defined wrappers", async () => {
    if (!await hasZsh()) {
      return;
    }

    const parsed = await runZshScript([
      "emulate -L zsh",
      "unsetopt err_return err_exit",
      ...createSetupLines(),
      ...createPrintHelpers(),
      "typeset -gi ZENO_TEST_ENSURE_CALLS=0",
      "typeset -gi ZENO_TEST_COMPLETION_CALLS=0",
      `source ${shellQuote(ZSH_BOOTSTRAP_ENTRYPOINT)}`,
      "function zeno-ensure-loaded() {",
      "  ZENO_TEST_ENSURE_CALLS=$(( ZENO_TEST_ENSURE_CALLS + 1 ))",
      "  typeset -g ZENO_LOADED=1",
      "}",
      "function zeno-completion() {",
      "  ZENO_TEST_COMPLETION_CALLS=$(( ZENO_TEST_COMPLETION_CALLS + 1 ))",
      "}",
      "zeno-bind-default-keys --lazy",
      "zle zeno-completion",
      'zeno-test-print-kv "ENSURE_CALLS" "${ZENO_TEST_ENSURE_CALLS}"',
      'zeno-test-print-kv "COMPLETION_CALLS" "${ZENO_TEST_COMPLETION_CALLS}"',
      'zeno-test-print-kv "BIND_SPACE" "${ZENO_TEST_BINDKEY_LOG[1]-}"',
      'zeno-test-print-kv "BIND_TAB" "${ZENO_TEST_BINDKEY_LOG[3]-}"',
      'zeno-test-print-kv "BIND_HISTORY" "${ZENO_TEST_BINDKEY_LOG[10]-}"',
      "",
    ].join("\n"));

    assertEquals(parsed.ENSURE_CALLS, "1");
    assertEquals(parsed.COMPLETION_CALLS, "1");
    assertEquals(parsed.BIND_SPACE, "  zeno-auto-snippet");
    assertEquals(parsed.BIND_TAB, "^i zeno-completion");
    assertEquals(parsed.BIND_HISTORY, "^r zeno-history-selection");
  });

  it("zeno-preload is a public preload alias for ensure-loaded", async () => {
    if (!await hasZsh()) {
      return;
    }

    const parsed = await runZshScript([
      "emulate -L zsh",
      "unsetopt err_return err_exit",
      ...createSetupLines(),
      ...createPrintHelpers(),
      "typeset -gi ZENO_TEST_ENSURE_CALLS=0",
      `source ${shellQuote(ZSH_BOOTSTRAP_ENTRYPOINT)}`,
      "function zeno-ensure-loaded() {",
      "  ZENO_TEST_ENSURE_CALLS=$(( ZENO_TEST_ENSURE_CALLS + 1 ))",
      "  typeset -g ZENO_LOADED=1",
      "}",
      "zeno-preload",
      'zeno-test-print-kv "ENSURE_CALLS" "${ZENO_TEST_ENSURE_CALLS}"',
      'zeno-test-print-kv "LOADED" "${ZENO_LOADED-}"',
      "",
    ].join("\n"));

    assertEquals(parsed.ENSURE_CALLS, "1");
    assertEquals(parsed.LOADED, "1");
  });

  it("zeno-bind-default-keys supports eager mode and initializes before binding", async () => {
    if (!await hasZsh()) {
      return;
    }

    const parsed = await runZshScript([
      "emulate -L zsh",
      "unsetopt err_return err_exit",
      ...createSetupLines(),
      ...createPrintHelpers(),
      "typeset -gi ZENO_TEST_ENSURE_CALLS=0",
      `source ${shellQuote(ZSH_BOOTSTRAP_ENTRYPOINT)}`,
      "function zeno-ensure-loaded() {",
      "  ZENO_TEST_ENSURE_CALLS=$(( ZENO_TEST_ENSURE_CALLS + 1 ))",
      "  typeset -g ZENO_LOADED=1",
      "}",
      "zeno-bind-default-keys",
      'zeno-test-print-kv "ENSURE_CALLS" "${ZENO_TEST_ENSURE_CALLS}"',
      'zeno-test-print-kv "LOADED" "${ZENO_LOADED-}"',
      'zeno-test-print-kv "BIND_TAB" "${ZENO_TEST_BINDKEY_LOG[3]-}"',
      "",
    ].join("\n"));

    assertEquals(parsed.ENSURE_CALLS, "1");
    assertEquals(parsed.LOADED, "1");
    assertEquals(parsed.BIND_TAB, "^i zeno-completion");
  });
});
