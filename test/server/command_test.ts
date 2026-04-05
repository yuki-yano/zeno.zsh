import { assertEquals } from "../deps.ts";
import { createServerStatusCommand } from "../../src/server/command.ts";

Deno.test("createServerStatusCommand", async (t) => {
  await t.step("prints formatted running status", async () => {
    const command = createServerStatusCommand({
      getSocketPath: () => "/tmp/zeno.sock",
      requestPid: async () => 4242,
      useColor: () => false,
    });

    const lines: string[] = [];
    await command.execute({
      input: {},
      writer: {
        write: ({ text }: { format: string; text: string }) => {
          lines.push(text);
          return Promise.resolve();
        },
      },
    });

    assertEquals(lines, [
      "Status  running",
      "PID     4242",
      "Socket  /tmp/zeno.sock",
    ]);
  });

  await t.step("prints formatted stopped status", async () => {
    const command = createServerStatusCommand({
      getSocketPath: () => "/tmp/zeno.sock",
      requestPid: async () => {
        throw new Error("not running");
      },
      useColor: () => false,
    });

    const lines: string[] = [];
    await command.execute({
      input: {},
      writer: {
        write: ({ text }: { format: string; text: string }) => {
          lines.push(text);
          return Promise.resolve();
        },
      },
    });

    assertEquals(lines, [
      "Status  stopped",
      "PID     -",
      "Socket  /tmp/zeno.sock",
    ]);
  });

  await t.step("prints colorized status when colors are enabled", async () => {
    const command = createServerStatusCommand({
      getSocketPath: () => "/tmp/zeno.sock",
      requestPid: async () => 4242,
      useColor: () => true,
    });

    const lines: string[] = [];
    await command.execute({
      input: {},
      writer: {
        write: ({ text }: { format: string; text: string }) => {
          lines.push(text);
          return Promise.resolve();
        },
      },
    });

    assertEquals(lines[0], "Status  \u001b[32mrunning\u001b[0m");
  });
});
