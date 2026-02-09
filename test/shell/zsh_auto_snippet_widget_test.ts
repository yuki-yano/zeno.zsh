import { assertEquals, describe, it } from "../deps.ts";
import {
  hasZsh,
  parseNullSeparatedPairs,
  shellQuote,
  toHeredoc,
  ZSH_WIDGETS_DIR,
} from "./zsh_test_utils.ts";

type WidgetScenario = {
  widgetName: "zeno-auto-snippet" | "zeno-auto-snippet-and-accept-line";
  zenoEnable: 0 | 1;
  initialBuffer: string;
  initialCursor: number;
  lbuffer: string;
  rbuffer: string;
  responseLines: readonly string[];
  customFallbackBody?: string;
};

const runWidgetScenario = async (
  scenario: WidgetScenario,
): Promise<{ buffer: string; cursor: number; lastZleCall: string }> => {
  const fallbackFnName = "test-auto-snippet-fallback";
  const fallbackBody = scenario.customFallbackBody ??
    'BUFFER+="[fallback]"';
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
    `function ${fallbackFnName}() { ${fallbackBody} }`,
    "function zeno-call-client-and-fallback() {",
    "  cat <<'__ZENO_RESPONSE__'",
    toHeredoc(scenario.responseLines),
    "__ZENO_RESPONSE__",
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
    `autoload -Uz ${scenario.widgetName}`,
    `ZENO_ENABLE=${scenario.zenoEnable}`,
    `ZENO_AUTO_SNIPPET_FALLBACK=${fallbackFnName}`,
    `BUFFER=${shellQuote(scenario.initialBuffer)}`,
    `CURSOR=${scenario.initialCursor}`,
    `LBUFFER=${shellQuote(scenario.lbuffer)}`,
    `RBUFFER=${shellQuote(scenario.rbuffer)}`,
    scenario.widgetName,
    'zeno-test-print-kv "BUFFER" "$BUFFER"',
    'zeno-test-print-kv "CURSOR" "$CURSOR"',
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
    throw new Error(`zsh widget scenario failed: ${stderr}`);
  }

  const parsed = parseNullSeparatedPairs(result.stdout);

  return {
    buffer: parsed.BUFFER ?? "",
    cursor: Number(parsed.CURSOR ?? "0"),
    lastZleCall: parsed.LAST_ZLE_CALL ?? "",
  };
};

describe("zsh auto-snippet widgets", () => {
  it("zeno-auto-snippet updates BUFFER/CURSOR on success", async () => {
    if (!await hasZsh()) {
      return;
    }

    const result = await runWidgetScenario({
      widgetName: "zeno-auto-snippet",
      zenoEnable: 1,
      initialBuffer: "gs",
      initialCursor: 2,
      lbuffer: "gs",
      rbuffer: "",
      responseLines: ["success", "git status --short --branch", "25"],
    });

    assertEquals(result.buffer, "git status --short --branch");
    assertEquals(result.cursor, 25);
    assertEquals(result.lastZleCall, "reset-prompt");
  });

  it("zeno-auto-snippet falls back when command fails", async () => {
    if (!await hasZsh()) {
      return;
    }

    const result = await runWidgetScenario({
      widgetName: "zeno-auto-snippet",
      zenoEnable: 1,
      initialBuffer: "abc",
      initialCursor: 3,
      lbuffer: "abc",
      rbuffer: "",
      responseLines: ["failure"],
    });

    assertEquals(result.buffer, "abc[fallback]");
    assertEquals(result.cursor, 3);
    assertEquals(result.lastZleCall, "test-auto-snippet-fallback");
  });

  it("zeno-auto-snippet falls back when ZENO_ENABLE is disabled", async () => {
    if (!await hasZsh()) {
      return;
    }

    const result = await runWidgetScenario({
      widgetName: "zeno-auto-snippet",
      zenoEnable: 0,
      initialBuffer: "abc",
      initialCursor: 3,
      lbuffer: "abc",
      rbuffer: "",
      responseLines: ["success", "ignored-result", "1"],
    });

    assertEquals(result.buffer, "abc[fallback]");
    assertEquals(result.cursor, 3);
    assertEquals(result.lastZleCall, "test-auto-snippet-fallback");
  });

  it("zeno-auto-snippet-and-accept-line applies success buffer then accepts line", async () => {
    if (!await hasZsh()) {
      return;
    }

    const result = await runWidgetScenario({
      widgetName: "zeno-auto-snippet-and-accept-line",
      zenoEnable: 1,
      initialBuffer: "gs",
      initialCursor: 2,
      lbuffer: "gs",
      rbuffer: "",
      responseLines: ["success", "git status --short --branch", "25"],
    });

    assertEquals(result.buffer, "git status --short --branch");
    assertEquals(result.lastZleCall, "accept-line");
  });

  it("zeno-auto-snippet-and-accept-line keeps buffer on failure and still accepts line", async () => {
    if (!await hasZsh()) {
      return;
    }

    const result = await runWidgetScenario({
      widgetName: "zeno-auto-snippet-and-accept-line",
      zenoEnable: 1,
      initialBuffer: "plain",
      initialCursor: 5,
      lbuffer: "plain",
      rbuffer: "",
      responseLines: ["failure"],
    });

    assertEquals(result.buffer, "plain");
    assertEquals(result.lastZleCall, "accept-line");
  });
});
