import { assertEquals, describe, it, path } from "../deps.ts";

const TEST_DIR = path.dirname(path.fromFileUrl(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, "..", "..");
const ZSH_WIDGETS_DIR = path.join(REPO_ROOT, "shells", "zsh", "widgets");

const toHeredoc = (lines: readonly string[]): string =>
  lines.length === 0 ? "" : `${lines.join("\n")}\n`;

const shellQuote = (value: string): string =>
  `'${value.replaceAll("'", `'\"'\"'`)}'`;

const hasZsh = async (): Promise<boolean> => {
  try {
    const result = await new Deno.Command("zsh", {
      args: ["-lc", "exit 0"],
      stdin: "null",
      stdout: "null",
      stderr: "null",
    }).output();
    return result.success;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return false;
    }
    throw error;
  }
};

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
    `fpath=(${shellQuote(ZSH_WIDGETS_DIR)} $fpath)`,
    `autoload -Uz ${scenario.widgetName}`,
    `ZENO_ENABLE=${scenario.zenoEnable}`,
    `ZENO_AUTO_SNIPPET_FALLBACK=${fallbackFnName}`,
    `BUFFER=${shellQuote(scenario.initialBuffer)}`,
    `CURSOR=${scenario.initialCursor}`,
    `LBUFFER=${shellQuote(scenario.lbuffer)}`,
    `RBUFFER=${shellQuote(scenario.rbuffer)}`,
    scenario.widgetName,
    'print -r -- "BUFFER=${BUFFER}"',
    'print -r -- "CURSOR=${CURSOR}"',
    'print -r -- "LAST_ZLE_CALL=${LAST_ZLE_CALL}"',
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

  const stdout = new TextDecoder().decode(result.stdout).trimEnd();
  const parsed: Record<string, string> = {};
  for (const line of stdout.split("\n")) {
    const index = line.indexOf("=");
    if (index <= 0) {
      continue;
    }
    const key = line.slice(0, index);
    const value = line.slice(index + 1);
    parsed[key] = value;
  }

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
