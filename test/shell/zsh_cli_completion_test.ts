import { assertEquals, describe, it } from "../deps.ts";
import {
  hasZsh,
  parseNullSeparatedPairs,
  shellQuote,
  ZSH_BOOTSTRAP_ENTRYPOINT,
} from "./zsh_test_utils.ts";

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
    throw new Error(`zsh cli completion scenario failed: ${stderr}`);
  }

  return parseNullSeparatedPairs(result.stdout);
};

describe("zsh cli completion integration", () => {
  it("registers _zeno when compinit runs after zeno-bootstrap.zsh", async () => {
    if (!await hasZsh()) {
      return;
    }

    const zcompdump = await Deno.makeTempFile({
      prefix: "zeno-zcompdump-after-bootstrap-",
    });

    try {
      const parsed = await runZshScript([
        "emulate -L zsh",
        "unsetopt err_return err_exit",
        ...createPrintHelpers(),
        `source ${shellQuote(ZSH_BOOTSTRAP_ENTRYPOINT)}`,
        `autoload -Uz compinit && compinit -i -d ${shellQuote(zcompdump)}`,
        'zeno-test-print-kv "HAS_COMPLETIONS_FPATH" "$(( ${fpath[(I)$ZENO_ROOT/shells/zsh/completions]} > 0 ? 1 : 0 ))"',
        'zeno-test-print-kv "ZENO_COMPDEF" "${_comps[zeno]-}"',
        'zeno-test-print-kv "HISTORY_CLIENT_COMPDEF" "${_comps[zeno-history-client]-}"',
        'zeno-test-print-kv "SERVER_COMPDEF" "${_comps[zeno-server]-}"',
        "",
      ].join("\n"));

      assertEquals(parsed.HAS_COMPLETIONS_FPATH, "1");
      assertEquals(parsed.ZENO_COMPDEF, "_zeno");
      assertEquals(parsed.HISTORY_CLIENT_COMPDEF, "_zeno");
      assertEquals(parsed.SERVER_COMPDEF, "_zeno");
    } finally {
      await Deno.remove(zcompdump).catch(() => undefined);
    }
  });

  it("registers _zeno immediately when compinit already ran", async () => {
    if (!await hasZsh()) {
      return;
    }

    const zcompdump = await Deno.makeTempFile({
      prefix: "zeno-zcompdump-before-bootstrap-",
    });

    try {
      const parsed = await runZshScript([
        "emulate -L zsh",
        "unsetopt err_return err_exit",
        ...createPrintHelpers(),
        `autoload -Uz compinit && compinit -i -d ${shellQuote(zcompdump)}`,
        `source ${shellQuote(ZSH_BOOTSTRAP_ENTRYPOINT)}`,
        'zeno-test-print-kv "HAS_COMPLETIONS_FPATH" "$(( ${fpath[(I)$ZENO_ROOT/shells/zsh/completions]} > 0 ? 1 : 0 ))"',
        'zeno-test-print-kv "ZENO_COMPDEF" "${_comps[zeno]-}"',
        'zeno-test-print-kv "HISTORY_CLIENT_COMPDEF" "${_comps[zeno-history-client]-}"',
        'zeno-test-print-kv "SERVER_COMPDEF" "${_comps[zeno-server]-}"',
        "",
      ].join("\n"));

      assertEquals(parsed.HAS_COMPLETIONS_FPATH, "1");
      assertEquals(parsed.ZENO_COMPDEF, "_zeno");
      assertEquals(parsed.HISTORY_CLIENT_COMPDEF, "_zeno");
      assertEquals(parsed.SERVER_COMPDEF, "_zeno");
    } finally {
      await Deno.remove(zcompdump).catch(() => undefined);
    }
  });

  it("offers top-level zeno commands and server subcommands", async () => {
    if (!await hasZsh()) {
      return;
    }

    const parsed = await runZshScript([
      "emulate -L zsh",
      "unsetopt err_return err_exit",
      ...createPrintHelpers(),
      `source ${shellQuote(ZSH_BOOTSTRAP_ENTRYPOINT)}`,
      "function _arguments() {",
      "  case $CURRENT in",
      "    2) state=command ;;",
      "    3) state=subcommand ;;",
      "    *) state=args ;;",
      "  esac",
      "  case $CURRENT in",
      "    3) line=(server) ;;",
      "    4) line=(server start) ;;",
      "    *) line=() ;;",
      "  esac",
      "  return 1",
      "}",
      "function _describe() {",
      '  local array_name="${@: -1}"',
      "  case $array_name in",
      '    top_level_commands) print -r -- "history,server" ;;',
      '    server_subcommands) print -r -- "run,start,stop,restart,status" ;;',
      '    history_subcommands) print -r -- "log,query,delete,export,import,fzf-config" ;;',
      "  esac",
      "}",
      "function _values() {",
      '  local -a values=("${@:3}")',
      '  print -r -- "${(j:,:)${values%%:*}}"',
      "}",
      "autoload -Uz _zeno",
      'words=(zeno "")',
      "CURRENT=2",
      "state=''",
      'zeno-test-print-kv "TOP_LEVEL" "$(_zeno)"',
      'words=(zeno server "")',
      "CURRENT=3",
      "state=''",
      'zeno-test-print-kv "SERVER_SUBCOMMANDS" "$(_zeno)"',
      "",
    ].join("\n"));

    assertEquals(parsed.TOP_LEVEL, "history,server");
    assertEquals(parsed.SERVER_SUBCOMMANDS, "run,start,stop,restart,status");
  });
});
