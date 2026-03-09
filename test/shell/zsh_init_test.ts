import { assertEquals, describe, it, path } from "../deps.ts";
import {
  hasZsh,
  parseNullSeparatedPairs,
  REPO_ROOT,
  shellQuote,
  ZSH_BOOTSTRAP_ENTRYPOINT,
  ZSH_ENTRYPOINT,
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
    throw new Error(`zsh init scenario failed: ${stderr}`);
  }

  return parseNullSeparatedPairs(result.stdout);
};

const createStubAutoloadDir = async (): Promise<string> => {
  const dir = await Deno.makeTempDir({ prefix: "zeno-zsh-init-stubs-" });
  const stubs = [
    {
      name: "zeno-enable-sock",
      body: [
        "#autoload",
        "typeset -gi ZENO_TEST_SOCK_CALLS=${ZENO_TEST_SOCK_CALLS:-0}",
        "ZENO_TEST_SOCK_CALLS=$(( ZENO_TEST_SOCK_CALLS + 1 ))",
        "typeset -g ZENO_TEST_SOCK_ENABLED=1",
        "",
      ].join("\n"),
    },
    {
      name: "zeno-history-hooks",
      body: [
        "#autoload",
        "typeset -gi ZENO_TEST_HISTORY_HOOK_CALLS=${ZENO_TEST_HISTORY_HOOK_CALLS:-0}",
        "ZENO_TEST_HISTORY_HOOK_CALLS=$(( ZENO_TEST_HISTORY_HOOK_CALLS + 1 ))",
        "typeset -g ZENO_TEST_HISTORY_HOOK_ENABLED=1",
        "",
      ].join("\n"),
    },
    {
      name: "zeno-preprompt-hooks",
      body: [
        "#autoload",
        "typeset -gi ZENO_TEST_PREPROMPT_HOOK_CALLS=${ZENO_TEST_PREPROMPT_HOOK_CALLS:-0}",
        "ZENO_TEST_PREPROMPT_HOOK_CALLS=$(( ZENO_TEST_PREPROMPT_HOOK_CALLS + 1 ))",
        "typeset -g ZENO_TEST_PREPROMPT_HOOK_ENABLED=1",
        "",
      ].join("\n"),
    },
  ];

  for (const stub of stubs) {
    const filePath = path.join(dir, stub.name);
    await Deno.writeTextFile(filePath, stub.body);
  }

  return dir;
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
  "function zeno-test-is-widget-registered() {",
  '  local widget_name="$1"',
  '  if (( ${REGISTERED_WIDGETS[(Ie)$widget_name]} > 0 )); then',
  '    print -rn -- "1"',
  "  else",
  '    print -rn -- "0"',
  "  fi",
  "}",
];

const createSetupLines = (): string[] => [
  "unset ZENO_ROOT ZENO_ENABLE ZENO_LOADED ZENO_FZF_COMMAND ZENO_DISABLE_SOCK",
  "unset ZENO_TEST_SOCK_CALLS ZENO_TEST_HISTORY_HOOK_CALLS ZENO_TEST_PREPROMPT_HOOK_CALLS",
  "function zle() {",
  '  if [[ "$1" == "-N" ]]; then',
  '    local widget_name="$2"',
  '    if [[ "$widget_name" == "--" ]]; then',
  '      widget_name="$3"',
  "    fi",
  '    if (( $+parameters[REGISTERED_WIDGETS] )); then',
  '      REGISTERED_WIDGETS+=("$widget_name")',
  "    fi",
  "    return 0",
  "  fi",
  "  if (( $+functions[$1] )); then",
  '    "$1"',
  "    return $?",
  "  fi",
  "  return 0",
  "}",
];

describe("zsh initialization entrypoints", () => {
  it("source zeno.zsh keeps the existing eager initialization behavior", async () => {
    if (!await hasZsh()) {
      return;
    }

    const stubDir = await createStubAutoloadDir();

    try {
      const parsed = await runZshScript([
        "emulate -L zsh",
        "unsetopt err_return err_exit",
        "typeset -ga REGISTERED_WIDGETS",
        ...createSetupLines(),
        ...createPrintHelpers(),
        `fpath=(${shellQuote(stubDir)} $fpath)`,
        "export ZENO_DISABLE_EXECUTE_CACHE_COMMAND=1",
        `source ${shellQuote(ZSH_ENTRYPOINT)}`,
        'zeno-test-print-kv "ZENO_ROOT" "${ZENO_ROOT-}"',
        'zeno-test-print-kv "ZENO_BOOTSTRAPPED" "${ZENO_BOOTSTRAPPED-}"',
        'zeno-test-print-kv "ZENO_ENABLE" "${ZENO_ENABLE-}"',
        'zeno-test-print-kv "ZENO_LOADED" "${ZENO_LOADED-}"',
        'zeno-test-print-kv "SOCK_CALLS" "${ZENO_TEST_SOCK_CALLS:-0}"',
        'zeno-test-print-kv "HISTORY_HOOK_CALLS" "${ZENO_TEST_HISTORY_HOOK_CALLS:-0}"',
        'zeno-test-print-kv "PREPROMPT_HOOK_CALLS" "${ZENO_TEST_PREPROMPT_HOOK_CALLS:-0}"',
        'zeno-test-print-kv "HAS_BIN_PATH" "$(( ${path[(I)$ZENO_ROOT/bin]} > 0 ? 1 : 0 ))"',
        'zeno-test-print-kv "HAS_FUNCTIONS_FPATH" "$(( ${fpath[(I)$ZENO_ROOT/shells/zsh/functions]} > 0 ? 1 : 0 ))"',
        'zeno-test-print-kv "HAS_WIDGETS_FPATH" "$(( ${fpath[(I)$ZENO_ROOT/shells/zsh/widgets]} > 0 ? 1 : 0 ))"',
        'zeno-test-print-kv "COMPLETION_WIDGET_REGISTERED" "$(zeno-test-is-widget-registered zeno-completion)"',
        "",
      ].join("\n"));

      assertEquals(parsed.ZENO_ROOT, REPO_ROOT);
      assertEquals(parsed.ZENO_BOOTSTRAPPED, "1");
      assertEquals(parsed.ZENO_ENABLE, "1");
      assertEquals(parsed.ZENO_LOADED, "1");
      assertEquals(parsed.SOCK_CALLS, "1");
      assertEquals(parsed.HISTORY_HOOK_CALLS, "1");
      assertEquals(parsed.PREPROMPT_HOOK_CALLS, "1");
      assertEquals(parsed.HAS_BIN_PATH, "1");
      assertEquals(parsed.HAS_FUNCTIONS_FPATH, "1");
      assertEquals(parsed.HAS_WIDGETS_FPATH, "1");
      assertEquals(parsed.COMPLETION_WIDGET_REGISTERED, "1");
    } finally {
      await Deno.remove(stubDir, { recursive: true }).catch(() => undefined);
    }
  });

  it("source zeno-bootstrap.zsh defers heavy initialization until zeno-init is called", async () => {
    if (!await hasZsh()) {
      return;
    }

    const stubDir = await createStubAutoloadDir();

    try {
      const parsed = await runZshScript([
        "emulate -L zsh",
        "unsetopt err_return err_exit",
        "typeset -ga REGISTERED_WIDGETS",
        ...createSetupLines(),
        ...createPrintHelpers(),
        `fpath=(${shellQuote(stubDir)} $fpath)`,
        "export ZENO_DISABLE_EXECUTE_CACHE_COMMAND=1",
        `source ${shellQuote(ZSH_BOOTSTRAP_ENTRYPOINT)}`,
        'zeno-test-print-kv "BOOTSTRAPPED" "${ZENO_BOOTSTRAPPED-}"',
        'zeno-test-print-kv "BEFORE_LOADED" "${ZENO_LOADED-}"',
        'zeno-test-print-kv "BEFORE_SOCK_CALLS" "${ZENO_TEST_SOCK_CALLS:-0}"',
        'zeno-test-print-kv "BEFORE_HISTORY_HOOK_CALLS" "${ZENO_TEST_HISTORY_HOOK_CALLS:-0}"',
        'zeno-test-print-kv "BEFORE_PREPROMPT_HOOK_CALLS" "${ZENO_TEST_PREPROMPT_HOOK_CALLS:-0}"',
        'zeno-test-print-kv "COMPLETION_WIDGET_REGISTERED" "$(zeno-test-is-widget-registered zeno-completion)"',
        "zeno-init",
        'zeno-test-print-kv "AFTER_LOADED" "${ZENO_LOADED-}"',
        'zeno-test-print-kv "AFTER_SOCK_CALLS" "${ZENO_TEST_SOCK_CALLS:-0}"',
        'zeno-test-print-kv "AFTER_HISTORY_HOOK_CALLS" "${ZENO_TEST_HISTORY_HOOK_CALLS:-0}"',
        'zeno-test-print-kv "AFTER_PREPROMPT_HOOK_CALLS" "${ZENO_TEST_PREPROMPT_HOOK_CALLS:-0}"',
        "",
      ].join("\n"));

      assertEquals(parsed.BOOTSTRAPPED, "1");
      assertEquals(parsed.BEFORE_LOADED, "");
      assertEquals(parsed.BEFORE_SOCK_CALLS, "0");
      assertEquals(parsed.BEFORE_HISTORY_HOOK_CALLS, "0");
      assertEquals(parsed.BEFORE_PREPROMPT_HOOK_CALLS, "0");
      assertEquals(parsed.COMPLETION_WIDGET_REGISTERED, "1");
      assertEquals(parsed.AFTER_LOADED, "1");
      assertEquals(parsed.AFTER_SOCK_CALLS, "1");
      assertEquals(parsed.AFTER_HISTORY_HOOK_CALLS, "1");
      assertEquals(parsed.AFTER_PREPROMPT_HOOK_CALLS, "1");
    } finally {
      await Deno.remove(stubDir, { recursive: true }).catch(() => undefined);
    }
  });

  it("zeno-ensure-loaded can initialize from a wrapper widget before calling the target widget", async () => {
    if (!await hasZsh()) {
      return;
    }

    const stubDir = await createStubAutoloadDir();

    try {
      const parsed = await runZshScript([
        "emulate -L zsh",
        "unsetopt err_return err_exit",
        "typeset -ga REGISTERED_WIDGETS",
        "typeset -gi ZENO_TEST_WRAPPER_CALLS=0",
        ...createSetupLines(),
        ...createPrintHelpers(),
        `fpath=(${shellQuote(stubDir)} $fpath)`,
        "export ZENO_DISABLE_EXECUTE_CACHE_COMMAND=1",
        `source ${shellQuote(ZSH_BOOTSTRAP_ENTRYPOINT)}`,
        "function zeno-completion() {",
        "  ZENO_TEST_WRAPPER_CALLS=$(( ZENO_TEST_WRAPPER_CALLS + 1 ))",
        "}",
        "function zeno-lazy-wrapper() {",
        "  zeno-ensure-loaded || return $?",
        "  zle zeno-completion",
        "}",
        "zle -N zeno-lazy-wrapper",
        "zeno-lazy-wrapper",
        'zeno-test-print-kv "LOADED" "${ZENO_LOADED-}"',
        'zeno-test-print-kv "SOCK_CALLS" "${ZENO_TEST_SOCK_CALLS:-0}"',
        'zeno-test-print-kv "HISTORY_HOOK_CALLS" "${ZENO_TEST_HISTORY_HOOK_CALLS:-0}"',
        'zeno-test-print-kv "PREPROMPT_HOOK_CALLS" "${ZENO_TEST_PREPROMPT_HOOK_CALLS:-0}"',
        'zeno-test-print-kv "WRAPPER_CALLS" "${ZENO_TEST_WRAPPER_CALLS:-0}"',
        "",
      ].join("\n"));

      assertEquals(parsed.LOADED, "1");
      assertEquals(parsed.SOCK_CALLS, "1");
      assertEquals(parsed.HISTORY_HOOK_CALLS, "1");
      assertEquals(parsed.PREPROMPT_HOOK_CALLS, "1");
      assertEquals(parsed.WRAPPER_CALLS, "1");
    } finally {
      await Deno.remove(stubDir, { recursive: true }).catch(() => undefined);
    }
  });

  it("zeno-init is idempotent and avoids duplicate heavy registrations", async () => {
    if (!await hasZsh()) {
      return;
    }

    const stubDir = await createStubAutoloadDir();

    try {
      const parsed = await runZshScript([
        "emulate -L zsh",
        "unsetopt err_return err_exit",
        ...createSetupLines(),
        ...createPrintHelpers(),
        `fpath=(${shellQuote(stubDir)} $fpath)`,
        "export ZENO_DISABLE_EXECUTE_CACHE_COMMAND=1",
        `source ${shellQuote(ZSH_BOOTSTRAP_ENTRYPOINT)}`,
        "zeno-init",
        "zeno-init",
        "zeno-ensure-loaded",
        'zeno-test-print-kv "SOCK_CALLS" "${ZENO_TEST_SOCK_CALLS:-0}"',
        'zeno-test-print-kv "HISTORY_HOOK_CALLS" "${ZENO_TEST_HISTORY_HOOK_CALLS:-0}"',
        'zeno-test-print-kv "PREPROMPT_HOOK_CALLS" "${ZENO_TEST_PREPROMPT_HOOK_CALLS:-0}"',
        "",
      ].join("\n"));

      assertEquals(parsed.SOCK_CALLS, "1");
      assertEquals(parsed.HISTORY_HOOK_CALLS, "1");
      assertEquals(parsed.PREPROMPT_HOOK_CALLS, "1");
    } finally {
      await Deno.remove(stubDir, { recursive: true }).catch(() => undefined);
    }
  });
});
