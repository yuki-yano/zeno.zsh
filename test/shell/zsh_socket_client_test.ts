import { assert, assertEquals, describe, it, path } from "../deps.ts";
import {
  hasZsh,
  parseNullSeparatedPairs,
  shellQuote,
  ZSH_FUNCTIONS_DIR,
} from "./zsh_test_utils.ts";

const runZshScript = async (
  script: string,
  options: {
    allowFailure?: boolean;
  } = {},
): Promise<{
  code: number;
  success: boolean;
  stdout: Uint8Array;
  stderr: string;
  durationMs: number;
}> => {
  const startedAt = Date.now();
  const result = await new Deno.Command("zsh", {
    args: ["-lc", script],
    stdin: "null",
    stdout: "piped",
    stderr: "piped",
  }).output();
  const durationMs = Date.now() - startedAt;
  const stderr = new TextDecoder().decode(result.stderr).trimEnd();

  if (!result.success && options.allowFailure !== true) {
    throw new Error(`zsh script failed: ${stderr}`);
  }

  return {
    code: result.code,
    success: result.success,
    stdout: result.stdout,
    stderr,
    durationMs,
  };
};

const createZshPrintHelpers = (): string[] => [
  "function zeno-test-print-kv() {",
  '  local key="$1"',
  '  local value="$2"',
  '  print -rn -- "$key"',
  "  print -rn -- $'\\0'",
  '  print -rn -- "$value"',
  "  print -rn -- $'\\0'",
  "}",
];

describe("zsh socket client behavior", () => {
  it("zeno-client reads a full response from the socket server", async () => {
    if (!await hasZsh()) {
      return;
    }

    const tempDir = await Deno.makeTempDir({
      prefix: "zeno-zsh-client-success-",
    });
    const socketPath = path.join(tempDir, "zeno.sock");
    const listener = Deno.listen({ transport: "unix", path: socketPath });
    const encoder = new TextEncoder();

    const serverTask = (async () => {
      const conn = await listener.accept();
      try {
        await conn.read(new Uint8Array(4096));
        await conn.write(encoder.encode("success\npayload\n"));
        await conn.closeWrite();
      } finally {
        conn.close();
        listener.close();
      }
    })();

    try {
      const script = [
        "emulate -L zsh",
        "unsetopt err_return err_exit",
        "function add-zsh-hook() { :; }",
        ...createZshPrintHelpers(),
        `fpath=(${shellQuote(ZSH_FUNCTIONS_DIR)} $fpath)`,
        "autoload -Uz zeno-enable-sock",
        `export ZENO_SOCK=${shellQuote(socketPath)}`,
        `export ZENO_SOCK_DIR=${shellQuote(tempDir)}`,
        "zeno-enable-sock",
        "output_file=$(mktemp)",
        'if zeno-client --zeno-mode=pid >"$output_file"; then',
        "  exit_code=0",
        "else",
        '  exit_code="$?"',
        "fi",
        'output="$(<"$output_file")"',
        'rm -f -- "$output_file"',
        'zeno-test-print-kv "STATUS" "$exit_code"',
        'zeno-test-print-kv "OUTPUT" "$output"',
        "",
      ].join("\n");

      const result = await runZshScript(script);
      const parsed = parseNullSeparatedPairs(result.stdout, [
        "STATUS",
        "OUTPUT",
      ]);

      assertEquals(parsed.STATUS, "0");
      assertEquals(parsed.OUTPUT, "success\npayload");
    } finally {
      await serverTask;
      await Deno.remove(tempDir, { recursive: true }).catch(() => undefined);
    }
  });

  it("zeno-client times out instead of blocking indefinitely", async () => {
    if (!await hasZsh()) {
      return;
    }

    const tempDir = await Deno.makeTempDir({
      prefix: "zeno-zsh-client-timeout-",
    });
    const socketPath = path.join(tempDir, "zeno.sock");
    const listener = Deno.listen({ transport: "unix", path: socketPath });

    const serverTask = (async () => {
      const conn = await listener.accept();
      try {
        await conn.read(new Uint8Array(4096));
        await new Promise((resolve) => setTimeout(resolve, 1500));
      } finally {
        conn.close();
        listener.close();
      }
    })();

    try {
      const script = [
        "emulate -L zsh",
        "unsetopt err_return err_exit",
        "function add-zsh-hook() { :; }",
        `fpath=(${shellQuote(ZSH_FUNCTIONS_DIR)} $fpath)`,
        "autoload -Uz zeno-enable-sock",
        `export ZENO_SOCK=${shellQuote(socketPath)}`,
        `export ZENO_SOCK_DIR=${shellQuote(tempDir)}`,
        "export ZENO_CLIENT_TIMEOUT_SECONDS=0.1",
        "zeno-enable-sock",
        "zeno-client --zeno-mode=pid",
        "",
      ].join("\n");

      const result = await runZshScript(script, { allowFailure: true });

      assertEquals(result.code, 124);
      assertEquals(new TextDecoder().decode(result.stdout), "");
      assert(
        result.durationMs < 500,
        `expected timeout under 500ms, got ${result.durationMs}ms`,
      );
    } finally {
      await serverTask;
      await Deno.remove(tempDir, { recursive: true }).catch(() => undefined);
    }
  });

  it("zeno-call-client-and-fallback falls back to direct execution after client failure", async () => {
    if (!await hasZsh()) {
      return;
    }

    const tempDir = await Deno.makeTempDir({
      prefix: "zeno-zsh-client-fallback-",
    });
    const socketPath = path.join(tempDir, "zeno.sock");
    const listener = Deno.listen({ transport: "unix", path: socketPath });

    try {
      const script = [
        "emulate -L zsh",
        "unsetopt err_return err_exit",
        "typeset -g CLIENT_CALLS=0 START_CALLS=0 RESET_CALLS=0",
        "function zeno-client() { CLIENT_CALLS=$(( CLIENT_CALLS + 1 )); return 124 }",
        "function zeno-start-server() { START_CALLS=$(( START_CALLS + 1 )); return 1 }",
        "function zeno-reset-socket-state() {",
        "  RESET_CALLS=$(( RESET_CALLS + 1 ))",
        "  ZENO_PID=''",
        '  rm -f -- "$ZENO_SOCK"',
        "}",
        'function zeno() { print -rn -- "fallback:$*" }',
        "function zeno-enable-sock() { :; }",
        ...createZshPrintHelpers(),
        `fpath=(${shellQuote(ZSH_FUNCTIONS_DIR)} $fpath)`,
        "autoload -Uz zeno-call-client-and-fallback",
        `export ZENO_SOCK=${shellQuote(socketPath)}`,
        `export ZENO_SOCK_DIR=${shellQuote(tempDir)}`,
        "export ZENO_PID=99999",
        "output_file=$(mktemp)",
        'if zeno-call-client-and-fallback --zeno-mode=pid >"$output_file"; then',
        "  exit_code=0",
        "else",
        '  exit_code="$?"',
        "fi",
        'output="$(<"$output_file")"',
        'rm -f -- "$output_file"',
        'zeno-test-print-kv "STATUS" "$exit_code"',
        'zeno-test-print-kv "OUTPUT" "$output"',
        'zeno-test-print-kv "CLIENT_CALLS" "$CLIENT_CALLS"',
        'zeno-test-print-kv "START_CALLS" "$START_CALLS"',
        'zeno-test-print-kv "RESET_CALLS" "$RESET_CALLS"',
        "",
      ].join("\n");

      const result = await runZshScript(script);
      const parsed = parseNullSeparatedPairs(result.stdout, [
        "STATUS",
        "OUTPUT",
        "CLIENT_CALLS",
        "START_CALLS",
        "RESET_CALLS",
      ]);

      assertEquals(parsed.STATUS, "0");
      assertEquals(parsed.OUTPUT, "fallback:--zeno-mode=pid");
      assertEquals(parsed.CLIENT_CALLS, "1");
      assertEquals(parsed.START_CALLS, "1");
      assertEquals(parsed.RESET_CALLS, "2");
    } finally {
      listener.close();
      await Deno.remove(tempDir, { recursive: true }).catch(() => undefined);
    }
  });
});
