import { assertEquals, assertThrows } from "../deps.ts";
import { createCommandRegistry } from "../../src/command/registry.ts";
import { createCommand } from "../../src/command/types.ts";
import type { CommandContext } from "../../src/command/types.ts";

Deno.test("CommandRegistry", async (t) => {
  await t.step("register and get commands", () => {
    const registry = createCommandRegistry();
    const command = createCommand(
      "test-command",
      async (_context: CommandContext) => {
        // Test implementation
      },
    );

    registry.register(command);

    assertEquals(registry.get("test-command"), command);
    assertEquals(registry.has("test-command"), true);
    assertEquals(registry.has("non-existent"), false);
  });

  await t.step("list registered commands", () => {
    const registry = createCommandRegistry();
    const command1 = createCommand("command1", async () => {});
    const command2 = createCommand("command2", async () => {});

    registry.register(command1);
    registry.register(command2);

    const list = registry.list();
    assertEquals(list.length, 2);
    assertEquals(list.includes("command1"), true);
    assertEquals(list.includes("command2"), true);
  });

  await t.step("throws error when registering duplicate command", () => {
    const registry = createCommandRegistry();
    const command1 = createCommand("duplicate", async () => {});
    const command2 = createCommand("duplicate", async () => {});

    registry.register(command1);

    assertThrows(
      () => registry.register(command2),
      Error,
      'Command "duplicate" is already registered',
    );
  });

  await t.step("returns undefined for non-existent command", () => {
    const registry = createCommandRegistry();

    assertEquals(registry.get("non-existent"), undefined);
  });
});
