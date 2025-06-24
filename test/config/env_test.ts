import { assertEquals } from "../deps.ts";
import { getEnv } from "../../src/config/env.ts";

Deno.test("getEnv", async (t) => {
  await t.step("returns default values when env vars are not set", () => {
    const originalEnv = {
      ZENO_DEFAULT_FZF_OPTIONS: Deno.env.get("ZENO_DEFAULT_FZF_OPTIONS"),
      ZENO_SOCK: Deno.env.get("ZENO_SOCK"),
      ZENO_GIT_CAT: Deno.env.get("ZENO_GIT_CAT"),
      ZENO_GIT_TREE: Deno.env.get("ZENO_GIT_TREE"),
      ZENO_DISABLE_BUILTIN_COMPLETION: Deno.env.get(
        "ZENO_DISABLE_BUILTIN_COMPLETION",
      ),
      ZENO_HOME: Deno.env.get("ZENO_HOME"),
    };

    // Clear env vars
    Deno.env.delete("ZENO_DEFAULT_FZF_OPTIONS");
    Deno.env.delete("ZENO_SOCK");
    Deno.env.delete("ZENO_GIT_CAT");
    Deno.env.delete("ZENO_GIT_TREE");
    Deno.env.delete("ZENO_DISABLE_BUILTIN_COMPLETION");
    Deno.env.delete("ZENO_HOME");

    const env = getEnv();

    assertEquals(env.DEFAULT_FZF_OPTIONS, "");
    assertEquals(env.SOCK, undefined);
    assertEquals(env.GIT_CAT, "cat");
    assertEquals(env.GIT_TREE, "tree");
    assertEquals(env.DISABLE_BUILTIN_COMPLETION, false);
    assertEquals(env.HOME, undefined);

    // Restore env vars
    Object.entries(originalEnv).forEach(([key, value]) => {
      if (value !== undefined) {
        Deno.env.set(key, value);
      }
    });
  });

  await t.step("returns custom values when env vars are set", () => {
    Deno.env.set("ZENO_DEFAULT_FZF_OPTIONS", "--height 50%");
    Deno.env.set("ZENO_SOCK", "/tmp/zeno.sock");
    Deno.env.set("ZENO_GIT_CAT", "bat");
    Deno.env.set("ZENO_GIT_TREE", "exa");
    Deno.env.set("ZENO_DISABLE_BUILTIN_COMPLETION", "1");
    Deno.env.set("ZENO_HOME", "/home/user/.zeno");

    const env = getEnv();

    assertEquals(env.DEFAULT_FZF_OPTIONS, "--height 50%");
    assertEquals(env.SOCK, "/tmp/zeno.sock");
    assertEquals(env.GIT_CAT, "bat");
    assertEquals(env.GIT_TREE, "exa");
    assertEquals(env.DISABLE_BUILTIN_COMPLETION, true);
    assertEquals(env.HOME, "/home/user/.zeno");

    // Cleanup
    Deno.env.delete("ZENO_DEFAULT_FZF_OPTIONS");
    Deno.env.delete("ZENO_SOCK");
    Deno.env.delete("ZENO_GIT_CAT");
    Deno.env.delete("ZENO_GIT_TREE");
    Deno.env.delete("ZENO_DISABLE_BUILTIN_COMPLETION");
    Deno.env.delete("ZENO_HOME");
  });

  await t.step(
    "DISABLE_BUILTIN_COMPLETION is true for any non-null value",
    () => {
      Deno.env.set("ZENO_DISABLE_BUILTIN_COMPLETION", "");
      assertEquals(getEnv().DISABLE_BUILTIN_COMPLETION, true);

      Deno.env.set("ZENO_DISABLE_BUILTIN_COMPLETION", "false");
      assertEquals(getEnv().DISABLE_BUILTIN_COMPLETION, true);

      Deno.env.set("ZENO_DISABLE_BUILTIN_COMPLETION", "0");
      assertEquals(getEnv().DISABLE_BUILTIN_COMPLETION, true);

      Deno.env.delete("ZENO_DISABLE_BUILTIN_COMPLETION");
      assertEquals(getEnv().DISABLE_BUILTIN_COMPLETION, false);
    },
  );
});
