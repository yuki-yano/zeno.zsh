import { assertEquals, assertStringIncludes } from "../deps.ts";
import { createServerControl } from "../../src/server/control.ts";

Deno.test("createServerControl", async (t) => {
  await t.step(
    "status returns stopped when socket path is not configured",
    async () => {
      const control = createServerControl({
        getSocketPath: () => undefined,
      });

      const result = await control.status();

      assertEquals(result.ok, true);
      if (result.ok) {
        assertEquals(result.value.state, "stopped");
        assertEquals(result.value.pid, undefined);
      }
    },
  );

  await t.step(
    "status returns running and pid when the socket server responds",
    async () => {
      const control = createServerControl({
        getSocketPath: () => "/tmp/zeno.sock",
        requestPid: () => 4242,
      });

      const result = await control.status();

      assertEquals(result.ok, true);
      if (result.ok) {
        assertEquals(result.value.state, "running");
        assertEquals(result.value.pid, 4242);
      }
    },
  );

  await t.step(
    "start reports already-running without spawning a new process",
    async () => {
      let spawnCalls = 0;
      const control = createServerControl({
        getSocketPath: () => "/tmp/zeno.sock",
        requestPid: () => 777,
        spawnServer: () => {
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
    },
  );

  await t.step(
    "start spawns the server and waits for the socket to respond",
    async () => {
      let attempts = 0;
      let spawnCalls = 0;
      let sleepCalls = 0;
      const control = createServerControl({
        getSocketPath: () => "/tmp/zeno.sock",
        requestPid: () => {
          attempts += 1;
          if (attempts < 3) {
            throw new Error("not ready");
          }
          return 5150;
        },
        spawnServer: () => {
          spawnCalls += 1;
        },
        ensureSocketDir: () => {},
        removeSocketFile: () => {},
        sleep: () => {
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
    },
  );

  await t.step(
    "stop returns already-stopped when the server is absent",
    async () => {
      let killedPid: number | undefined;
      const control = createServerControl({
        getSocketPath: () => "/tmp/zeno.sock",
        requestPid: () => {
          throw new Error("unreachable");
        },
        killProcess: (pid: number) => {
          killedPid = pid;
        },
        removeSocketFile: () => {},
      });

      const result = await control.stop();

      assertEquals(result.ok, true);
      if (result.ok) {
        assertEquals(result.value.action, "already-stopped");
        assertEquals(result.value.pid, undefined);
      }
      assertEquals(killedPid, undefined);
    },
  );

  await t.step(
    "stop kills the running server and removes the socket file",
    async () => {
      let removedSocket: string | undefined;
      const killCalls: Array<string> = [];
      let aliveChecks = 0;
      const control = createServerControl({
        getSocketPath: () => "/tmp/zeno.sock",
        requestPid: () => 9090,
        killProcess: (pid: number, signal: Deno.Signal) => {
          killCalls.push(`${pid}:${signal}`);
        },
        isProcessAlive: () => {
          aliveChecks += 1;
          return aliveChecks < 2;
        },
        removeSocketFile: (socketPath: string) => {
          removedSocket = socketPath;
        },
        sleep: () => {},
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
    },
  );

  await t.step("restart stops first and then starts again", async () => {
    let phase = "stopped";
    const events: string[] = [];
    const control = createServerControl({
      getSocketPath: () => "/tmp/zeno.sock",
      requestPid: () => {
        if (phase === "stopped") {
          throw new Error("stopped");
        }
        return 3030;
      },
      killProcess: () => {
        events.push("kill");
        phase = "stopped";
      },
      isProcessAlive: () => false,
      removeSocketFile: () => {
        events.push("remove");
      },
      ensureSocketDir: () => {},
      spawnServer: () => {
        events.push("spawn");
        phase = "running";
      },
      sleep: () => {},
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
      requestPid: () => {
        throw new Error("not ready");
      },
      ensureSocketDir: () => {},
      spawnServer: () => {},
      removeSocketFile: () => {},
      sleep: () => {},
      pollAttempts: 2,
      pollIntervalMs: 0,
    });

    const result = await control.start();

    assertEquals(result.ok, false);
    if (!result.ok) {
      assertStringIncludes(
        result.error.message,
        "failed to start socket server",
      );
    }
  });
});
