import { assertEquals, describe, it, path } from "../deps.ts";
import {
  hasZsh,
  parseNullSeparatedPairs,
  shellQuote,
  toHeredoc,
  ZSH_WIDGETS_DIR,
} from "./zsh_test_utils.ts";

type CompletionScenario = {
  initialLbuffer: string;
  initialBuffer: string;
  completionResponseLines: readonly string[];
  fzfTokens?: readonly string[];
};

const runCompletionScenario = async (
  scenario: CompletionScenario,
): Promise<{ lbuffer: string; buffer: string; lastZleCall: string }> => {
  const tempDir = await Deno.makeTempDir({
    prefix: "zeno-zsh-completion-basic-test-",
  });

  try {
    const fzfPath = path.join(tempDir, "fake-fzf.sh");
    const fzfTokens = scenario.fzfTokens ?? ["", "value"];
    const fzfScript = [
      "#!/usr/bin/env sh",
      `printf '%s\\0' ${fzfTokens.map(shellQuote).join(" ")}`,
      "",
    ].join("\n");
    await Deno.writeTextFile(fzfPath, fzfScript);
    await Deno.chmod(fzfPath, 0o755);

    const fallbackFnName = "test-completion-fallback";
    const script = [
      "emulate -L zsh",
      "LAST_ZLE_CALL=''",
      "function zle() {",
      '  if [[ "$1" == "-N" ]]; then',
      "    return 0",
      "  fi",
      '  LAST_ZLE_CALL="$1"',
      "  if (( $+functions[$1] )); then",
      '    "$1"',
      "  fi",
      "}",
      `function ${fallbackFnName}() { LBUFFER+=\"[fallback]\"; BUFFER=\"$LBUFFER\" }`,
      "function zeno-call-client-and-fallback() {",
      "  cat <<'__ZENO_COMPLETION_RESPONSE__'",
      toHeredoc(scenario.completionResponseLines),
      "__ZENO_COMPLETION_RESPONSE__",
      "}",
      "function zeno-test-print-kv() {",
      '  local key="$1"',
      '  local value="$2"',
      '  print -rn -- "$key"',
      "  print -rn -- $'\\0'",
      '  print -rn -- "$value"',
      "  print -rn -- $'\\0'",
      "}",
      `fpath=(${shellQuote(ZSH_WIDGETS_DIR)} $fpath)`,
      "autoload -Uz zeno-completion",
      `export ZENO_FZF_COMMAND=${shellQuote(fzfPath)}`,
      `ZENO_COMPLETION_FALLBACK=${fallbackFnName}`,
      `LBUFFER=${shellQuote(scenario.initialLbuffer)}`,
      `BUFFER=${shellQuote(scenario.initialBuffer)}`,
      "RBUFFER=''",
      "zeno-completion",
      'zeno-test-print-kv "LBUFFER" "$LBUFFER"',
      'zeno-test-print-kv "BUFFER" "$BUFFER"',
      'zeno-test-print-kv "LAST_ZLE_CALL" "$LAST_ZLE_CALL"',
      "",
    ].join("\n");

    const result = await new Deno.Command("zsh", {
      args: ["-lc", script],
      stdin: "null",
      stdout: "piped",
      stderr: "piped",
    }).output();

    if (!result.success) {
      const stderr = new TextDecoder().decode(result.stderr).trimEnd();
      throw new Error(`zsh completion scenario failed: ${stderr}`);
    }

    const parsed = parseNullSeparatedPairs(
      result.stdout,
      ["LBUFFER", "BUFFER", "LAST_ZLE_CALL"],
    );

    return {
      lbuffer: parsed.LBUFFER ?? "",
      buffer: parsed.BUFFER ?? "",
      lastZleCall: parsed.LAST_ZLE_CALL ?? "",
    };
  } finally {
    await Deno.remove(tempDir, { recursive: true }).catch(() => undefined);
  }
};

describe("zsh completion widget basic behavior", () => {
  it("inserts selected candidate without callback", async () => {
    if (!await hasZsh()) {
      return;
    }

    const result = await runCompletionScenario({
      initialLbuffer: "echo ",
      initialBuffer: "echo ",
      completionResponseLines: [
        "success",
        "printf '%s\\n' 'foo bar'",
        "--print0",
        "none",
        "u0001",
      ],
      fzfTokens: ["", "foo bar"],
    });

    assertEquals(result.lbuffer, "echo foo\\ bar");
    assertEquals(result.lastZleCall, "reset-prompt");
  });

  it("invokes configured fallback when completion source fails", async () => {
    if (!await hasZsh()) {
      return;
    }

    const result = await runCompletionScenario({
      initialLbuffer: "echo ",
      initialBuffer: "echo ",
      completionResponseLines: ["failure"],
    });

    assertEquals(result.lbuffer, "echo [fallback]");
    assertEquals(result.buffer, "echo [fallback]");
    assertEquals(result.lastZleCall, "test-completion-fallback");
  });
});
