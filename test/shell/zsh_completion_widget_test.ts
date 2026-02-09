import { assertEquals, describe, it, path } from "../deps.ts";
import {
  hasZsh,
  shellQuote,
  toHeredoc,
  ZSH_WIDGETS_DIR,
} from "./zsh_test_utils.ts";

type ScenarioParams = {
  initialLbuffer: string;
  fzfTokens: readonly string[];
  completionResponseLines: readonly string[];
  callbackResponseLines?: readonly string[];
};

const runZshCompletionScenario = async (
  params: ScenarioParams,
): Promise<string> => {
  const tempDir = await Deno.makeTempDir({ prefix: "zeno-zsh-widget-test-" });
  try {
    const fzfPath = path.join(tempDir, "fake-fzf.sh");
    const fzfScript = [
      "#!/usr/bin/env sh",
      `printf '%s\\0' ${params.fzfTokens.map(shellQuote).join(" ")}`,
      "",
    ].join("\n");
    await Deno.writeTextFile(fzfPath, fzfScript);
    await Deno.chmod(fzfPath, 0o755);

    const callbackBody = toHeredoc(params.callbackResponseLines ?? ["failure"]);
    const script = [
      "emulate -L zsh",
      "function zle() { :; }",
      "function zeno-call-client-and-fallback() {",
      '  local mode=""',
      "  local arg",
      '  for arg in "$@"; do',
      '    case "$arg" in',
      '      --zeno-mode=*) mode="${arg#--zeno-mode=}" ;;',
      "    esac",
      "  done",
      '  case "$mode" in',
      "    completion)",
      "      cat <<'__ZENO_COMPLETION__'",
      toHeredoc(params.completionResponseLines),
      "__ZENO_COMPLETION__",
      "      ;;",
      "    completion-callback)",
      "      cat <<'__ZENO_CALLBACK__'",
      callbackBody,
      "__ZENO_CALLBACK__",
      "      ;;",
      "    *)",
      "      return 1",
      "      ;;",
      "  esac",
      "}",
      `fpath=(${shellQuote(ZSH_WIDGETS_DIR)} $fpath)`,
      "autoload -Uz zeno-completion",
      `export ZENO_FZF_COMMAND=${shellQuote(fzfPath)}`,
      `LBUFFER=${shellQuote(params.initialLbuffer)}`,
      "RBUFFER=''",
      "zeno-completion",
      'print -r -- "$LBUFFER"',
      "",
    ].join("\n");

    const result = await new Deno.Command("zsh", {
      args: ["-lc", script],
      stdin: "null",
      stdout: "piped",
      stderr: "piped",
    }).output();

    const stdout = new TextDecoder().decode(result.stdout).trimEnd();
    const stderr = new TextDecoder().decode(result.stderr).trimEnd();
    if (!result.success) {
      throw new Error(`zsh scenario failed: ${stderr}`);
    }

    const lines = stdout.split("\n");
    return lines[lines.length - 1];
  } finally {
    await Deno.remove(tempDir, { recursive: true }).catch(() => undefined);
  }
};

describe("zsh completion widget callback behavior", () => {
  it("reconstructs collapsed function callback fields and strips duplicated prefix for multi-select", async () => {
    if (!await hasZsh()) {
      return;
    }

    const finalLbuffer = await runZshCompletionScenario({
      initialLbuffer: "npm run ",
      fzfTokens: ["", "dev", "dev:client"],
      completionResponseLines: [
        "success",
        "printf '%s\\n' dev dev:client",
        '--expect="alt-enter" --print0',
        "function",
        "u0001",
      ],
      callbackResponseLines: [
        "success",
        "printf '%s\\0' 'npm run dev' 'npm run dev:client'",
      ],
    });

    assertEquals(finalLbuffer, "npm run dev dev:client");
  });

  it("handles quoted --expect values and does not insert alt-enter token", async () => {
    if (!await hasZsh()) {
      return;
    }

    const finalLbuffer = await runZshCompletionScenario({
      initialLbuffer: "npm run ",
      fzfTokens: ["alt-enter", "dev"],
      completionResponseLines: [
        "success",
        "printf '%s\\n' dev",
        '--expect="alt-enter" --print0',
        "function",
        "u0001",
      ],
      callbackResponseLines: [
        "success",
        "printf '%s\\0' 'dev'",
      ],
    });

    assertEquals(finalLbuffer, "npm run dev");
  });

  it("keeps shell callback behavior with collapsed response fields", async () => {
    if (!await hasZsh()) {
      return;
    }

    const finalLbuffer = await runZshCompletionScenario({
      initialLbuffer: "kill ",
      fzfTokens: ["", "1001 node", "1002 deno"],
      completionResponseLines: [
        "success",
        "printf '%s\\n' '1001 node' '1002 deno'",
        "--print0",
        "awk '{print $1}'",
        "shell",
        "u0001",
      ],
    });

    assertEquals(finalLbuffer, "kill 1001 1002");
  });
});
