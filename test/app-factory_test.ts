import { assertEquals, assertStringIncludes } from "./deps.ts";
import { createApp } from "../src/app-factory.ts";
import { createCommandRegistry } from "../src/command/registry.ts";
import { createCommand } from "../src/command/types.ts";

Deno.test("createApp", async (t) => {
  await t.step("creates app with default registry", () => {
    const app = createApp();
    const registry = app.getCommandRegistry();

    // Should have default commands registered
    assertEquals(registry.get("pid") !== undefined, true);
    assertEquals(registry.get("chdir") !== undefined, true);
    assertEquals(registry.get("snippet-list") !== undefined, true);
  });

  await t.step("creates app with custom registry", () => {
    const customRegistry = createCommandRegistry();
    const testCommand = createCommand("custom-test", async ({ writer }) => {
      await writer.write({ format: "%s\n", text: "custom output" });
    });
    customRegistry.register(testCommand);

    const app = createApp({ commandRegistry: customRegistry });
    const registry = app.getCommandRegistry();

    // Should have custom command
    assertEquals(registry.get("custom-test") !== undefined, true);
    // Should not have default commands
    assertEquals(registry.get("pid") === undefined, true);
  });

  await t.step("execCli with valid command", async () => {
    // Create custom registry to control output
    const customRegistry = createCommandRegistry();
    const testCommand = createCommand("test-cli", async ({ input, writer }) => {
      await writer.write({
        format: "%s\n",
        text: `lbuffer: ${input.lbuffer || "empty"}`,
      });
    });
    customRegistry.register(testCommand);

    const app = createApp({ commandRegistry: customRegistry });

    // Capture output
    const originalWrite = Deno.stdout.write;
    const output: Uint8Array[] = [];
    Deno.stdout.write = (data: Uint8Array) => {
      output.push(data.slice());
      return Promise.resolve(data.length);
    };

    // Mock Deno.exit
    const originalExit = Deno.exit;
    let exitCode: number | undefined;
    Deno.exit = (code?: number) => {
      exitCode = code;
      throw new Error("exit");
    };

    try {
      await app.execCli(["--zeno-mode=test-cli", "--input.lbuffer=hello"]);
    } catch (_e) {
      if ((_e as Error).message !== "exit") throw _e;
    }

    // Restore
    Deno.stdout.write = originalWrite;
    Deno.exit = originalExit;

    const outputText = new TextDecoder().decode(output[0]);
    assertStringIncludes(outputText, "lbuffer: hello");
    assertEquals(exitCode, 0);
  });

  await t.step("execCli with invalid command", async () => {
    const app = createApp({ commandRegistry: createCommandRegistry() });

    // Capture output
    const originalWrite = Deno.stdout.write;
    const output: Uint8Array[] = [];
    Deno.stdout.write = (data: Uint8Array) => {
      output.push(data.slice());
      return Promise.resolve(data.length);
    };

    // Mock Deno.exit
    const originalExit = Deno.exit;
    let exitCode: number | undefined;
    Deno.exit = (code?: number) => {
      exitCode = code;
      throw new Error("exit");
    };

    try {
      await app.execCli(["--zeno-mode=non-existent"]);
    } catch (_e) {
      if ((_e as Error).message !== "exit") throw _e;
    }

    // Restore
    Deno.stdout.write = originalWrite;
    Deno.exit = originalExit;

    const outputText = output.map((d) => new TextDecoder().decode(d)).join("");
    assertStringIncludes(outputText, "failure");
    assertStringIncludes(outputText, "non-existent mode is not exist");
    assertEquals(exitCode, 0);
  });

  await t.step("accepts custom connection config", () => {
    const app = createApp({
      connectionConfig: {
        maxConnections: 25,
        connectionTimeout: 15000,
      },
    });

    // The config should be passed through to the socket server
    // We can't directly test this without starting a server,
    // but we can verify the app accepts the config
    assertEquals(typeof app.execServer, "function");
  });
});
