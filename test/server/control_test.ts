import { assertEquals, assertStringIncludes } from "../deps.ts";
import { createServerControl } from "../../src/server/control.ts";

Deno.test("createServerControl", async (t) => {
  await t.step("status returns stopped when socket path is not configured", async () => {
    const control = createServerControl({
      getSocketPath: () => undefined,
    });

    const result = await control.status();

    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.value.state, "stopped");
      assertEquals(result.value.pid, undefined);
    }
  });

  await t.step("status returns running and pid when the socket server responds", async () => {
    const control = createServerControl({
      getSocketPath: () => "/tmp/zeno.sock",
      requestPid: async () => 4242,
    });

    const result = await control.status();

    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.value.state, "running");
      assertEquals(result.value.pid, 4242);
    }
  });

  await t.step("start reports already-running without spawning a new process", async () => {
    let spawnCalls = 0;
    const control = createServerControl({
      getSocketPath: () => "/tmp/zeno.sock",
      requestPid: async () => 777,
      spawnServer: async () => {
        spawnCalls += 1;
      },
    });

    const result = await control.start();

    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.value.action, "already-running");
      assertEquals(result.value.pid, 777);
    }
    assertEquals(spawnCalls, 0);
  });

  await t.step("start spawns the server and waits for the socket to respond", async () => {
    let attempts = 0;
    let spawnCalls = 0;
    let sleepCalls = 0;
    const control = createServerControl({
      getSocketPath: () => "/tmp/zeno.sock",
      requestPid: async () => {
        attempts += 1;
        if (attempts < 3) {
          throw new Error("not ready");
        }
        return 5150;
      },
      spawnServer: async () => {
        spawnCalls += 1;
      },
      ensureSocketDir: async () => {},
      removeSocketFile: async () => {},
      sleep: async () => {
        sleepCalls += 1;
      },
      pollAttempts: 5,
      pollIntervalMs: 0,
    });

    const result = await control.start();

    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.value.action, "started");
      assertEquals(result.value.pid, 5150);
    }
    assertEquals(spawnCalls, 1);
    assertEquals(sleepCalls, 1);
  });

  await t.step("stop returns already-stopped when the server is absent", async () => {
    let killedPid: number | undefined;
    const control = createServerControl({
      getSocketPath: () => "/tmp/zeno.sock",
      requestPid: async () => {
        throw new Error("unreachable");
      },
      killProcess: async (pid: number) => {
        killedPid = pid;
      },
      removeSocketFile: async () => {},
    });

    const result = await control.stop();

    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.value.action, "already-stopped");
      assertEquals(result.value.pid, undefined);
    }
    assertEquals(killedPid, undefined);
  });

  await t.step("stop kills the running server and removes the socket file", async () => {
    let removedSocket: string | undefined;
    let killCalls: Array<string> = [];
    let aliveChecks = 0;
    const control = createServerControl({
      getSocketPath: () => "/tmp/zeno.sock",
      requestPid: async () => 9090,
      killProcess: async (pid: number, signal: Deno.Signal) => {
        killCalls.push(`${pid}:${signal}`);
      },
      isProcessAlive: async () => {
        aliveChecks += 1;
        return aliveChecks < 2;
      },
      removeSocketFile: async (socketPath: string) => {
        removedSocket = socketPath;
      },
      sleep: async () => {},
      stopPollAttempts: 5,
      stopPollIntervalMs: 0,
    });

    const result = await control.stop();

    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.value.action, "stopped");
      assertEquals(result.value.pid, 9090);
    }
    assertEquals(killCalls, ["9090:SIGTERM"]);
    assertEquals(removedSocket, "/tmp/zeno.sock");
  });

  await t.step("restart stops first and then starts again", async () => {
    let phase = "stopped";
    const events: string[] = [];
    const control = createServerControl({
      getSocketPath: () => "/tmp/zeno.sock",
      requestPid: async () => {
        if (phase === "stopped") {
          throw new Error("stopped");
        }
        return 3030;
      },
      killProcess: async () => {
        events.push("kill");
        phase = "stopped";
      },
      isProcessAlive: async () => false,
      removeSocketFile: async () => {
        events.push("remove");
      },
      ensureSocketDir: async () => {},
      spawnServer: async () => {
        events.push("spawn");
        phase = "running";
      },
      sleep: async () => {},
      pollAttempts: 1,
      stopPollAttempts: 1,
      pollIntervalMs: 0,
      stopPollIntervalMs: 0,
    });

    const result = await control.restart();

    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.value.action, "restarted");
      assertEquals(result.value.pid, 3030);
    }
    assertEquals(events, ["remove", "remove", "spawn"]);
  });

  await t.step("start fails when the socket never becomes ready", async () => {
    const control = createServerControl({
      getSocketPath: () => "/tmp/zeno.sock",
      requestPid: async () => {
        throw new Error("not ready");
      },
      ensureSocketDir: async () => {},
      spawnServer: async () => {},
      removeSocketFile: async () => {},
      sleep: async () => {},
      pollAttempts: 2,
      pollIntervalMs: 0,
    });

    const result = await control.start();

    assertEquals(result.ok, false);
    if (!result.ok) {
      assertStringIncludes(result.error.message, "failed to start socket server");
    }
  });
});
