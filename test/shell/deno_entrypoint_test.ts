import { assert } from "../deps.ts";
import { path } from "../../src/deps.ts";
import { hasZsh, shellQuote } from "./zsh_test_utils.ts";

const REPO_ROOT = path.resolve(
  path.dirname(path.fromFileUrl(import.meta.url)),
  "../..",
);

const createIsolatedEnv = (tempDir: string): Record<string, string> => ({
  HOME: tempDir,
  XDG_CONFIG_HOME: path.join(tempDir, "config"),
  XDG_CONFIG_DIRS: "",
  ZENO_DISABLE_AUTOMATIC_WORKSPACE_LOOKUP: "1",
  ZENO_HOME: path.join(tempDir, "zeno"),
  ZENO_LOCAL_CONFIG_PATH: "",
  ZENO_ROOT: REPO_ROOT,
});

const assertPidResult = async (command: Deno.Command): Promise<void> => {
  const result = await command.output();
  const stdout = new TextDecoder().decode(result.stdout).trim();
  const stderr = new TextDecoder().decode(result.stderr).trim();
  const lastLine = stdout.split("\n").at(-1) ?? "";

  assert(result.success, stderr);
  assert(/^\d+$/.test(lastLine), `expected a PID, got: ${stdout}`);
};

const hasFish = async (): Promise<boolean> => {
  try {
    return (await new Deno.Command("fish", {
      args: ["--version"],
      stdout: "null",
      stderr: "null",
    }).output()).success;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return false;
    }
    throw error;
  }
};

Deno.test("Deno CLI entrypoints", async (t) => {
  await t.step("bin/zeno starts the CLI with the current Deno", async () => {
    const tempDir = await Deno.makeTempDir({ prefix: "zeno-deno-entrypoint-" });
    try {
      await assertPidResult(
        new Deno.Command(path.join(REPO_ROOT, "bin/zeno"), {
          args: ["--zeno-mode=pid"],
          cwd: tempDir,
          env: createIsolatedEnv(tempDir),
          stdout: "piped",
          stderr: "piped",
        }),
      );
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step("bin/zeno-server starts the socket server", async () => {
    const tempDir = await Deno.makeTempDir({ prefix: "zeno-deno-server-" });
    const env = {
      ...createIsolatedEnv(tempDir),
      ZENO_SOCK: path.join(tempDir, "zeno.sock"),
    };
    let serverPid: number | undefined;

    try {
      const start = await new Deno.Command(path.join(REPO_ROOT, "bin/zeno"), {
        args: ["server", "start"],
        cwd: tempDir,
        env,
        stdout: "piped",
        stderr: "piped",
      }).output();
      const startStdout = new TextDecoder().decode(start.stdout).trim();
      const startStderr = new TextDecoder().decode(start.stderr).trim();
      const pidLine = startStdout.split("\n").findLast((line) =>
        /^\d+$/.test(line)
      );
      serverPid = pidLine === undefined ? undefined : Number(pidLine);

      assert(start.success, startStderr);
      assert(startStdout.includes("started"), startStdout);
      assert(
        serverPid !== undefined && Number.isSafeInteger(serverPid) &&
          serverPid > 0,
        startStdout,
      );

      const status = await new Deno.Command(
        path.join(REPO_ROOT, "bin/zeno"),
        {
          args: ["server", "status"],
          cwd: tempDir,
          env,
          stdout: "piped",
          stderr: "piped",
        },
      ).output();
      const statusStdout = new TextDecoder().decode(status.stdout);
      const statusStderr = new TextDecoder().decode(status.stderr).trim();

      assert(status.success, statusStderr);
      assert(statusStdout.includes("Status  running"), statusStdout);
    } finally {
      const stop = await new Deno.Command(path.join(REPO_ROOT, "bin/zeno"), {
        args: ["server", "stop"],
        cwd: tempDir,
        env,
        stdout: "null",
        stderr: "null",
      }).output();
      if (!stop.success && serverPid !== undefined) {
        try {
          Deno.kill(serverPid, "SIGKILL");
        } catch {
          // The process may have exited between the failed stop and cleanup.
        }
      }
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step("the zsh autoload function starts the CLI", async () => {
    if (!await hasZsh()) {
      return;
    }

    const tempDir = await Deno.makeTempDir({ prefix: "zeno-deno-zsh-" });
    const functionsDir = path.join(REPO_ROOT, "shells/zsh/functions");
    try {
      await assertPidResult(
        new Deno.Command("zsh", {
          args: [
            "-dfc",
            `fpath=(${
              shellQuote(functionsDir)
            } $fpath); autoload -Uz zeno; zeno --zeno-mode=pid`,
          ],
          cwd: tempDir,
          env: createIsolatedEnv(tempDir),
          stdout: "piped",
          stderr: "piped",
        }),
      );
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step("the fish function starts the CLI", async () => {
    if (!await hasFish()) {
      return;
    }

    const tempDir = await Deno.makeTempDir({ prefix: "zeno-deno-fish-" });
    try {
      await assertPidResult(
        new Deno.Command("fish", {
          args: [
            "--no-config",
            "-c",
            'source "$ZENO_ROOT/shells/fish/functions/zeno.fish"; zeno --zeno-mode=pid',
          ],
          cwd: tempDir,
          env: createIsolatedEnv(tempDir),
          stdout: "piped",
          stderr: "piped",
        }),
      );
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });
});
