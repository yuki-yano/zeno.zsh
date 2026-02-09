import { assertEquals } from "../deps.ts";
import { getEnv } from "../../src/config/env.ts";

const TRACKED_ENV_KEYS = [
  "ZENO_DEFAULT_FZF_OPTIONS",
  "ZENO_SOCK",
  "ZENO_GIT_CAT",
  "ZENO_GIT_TREE",
  "ZENO_DISABLE_BUILTIN_COMPLETION",
  "ZENO_DISABLE_AUTOMATIC_WORKSPACE_LOOKUP",
  "ZENO_LOCAL_CONFIG_PATH",
  "ZENO_HOME",
] as const;

const snapshotEnv = (): Record<
  (typeof TRACKED_ENV_KEYS)[number],
  string | undefined
> => {
  return {
    ZENO_DEFAULT_FZF_OPTIONS: Deno.env.get("ZENO_DEFAULT_FZF_OPTIONS"),
    ZENO_SOCK: Deno.env.get("ZENO_SOCK"),
    ZENO_GIT_CAT: Deno.env.get("ZENO_GIT_CAT"),
    ZENO_GIT_TREE: Deno.env.get("ZENO_GIT_TREE"),
    ZENO_DISABLE_BUILTIN_COMPLETION: Deno.env.get(
      "ZENO_DISABLE_BUILTIN_COMPLETION",
    ),
    ZENO_DISABLE_AUTOMATIC_WORKSPACE_LOOKUP: Deno.env.get(
      "ZENO_DISABLE_AUTOMATIC_WORKSPACE_LOOKUP",
    ),
    ZENO_LOCAL_CONFIG_PATH: Deno.env.get("ZENO_LOCAL_CONFIG_PATH"),
    ZENO_HOME: Deno.env.get("ZENO_HOME"),
  };
};

const restoreEnv = (
  snapshot: Record<(typeof TRACKED_ENV_KEYS)[number], string | undefined>,
): void => {
  for (const key of TRACKED_ENV_KEYS) {
    const value = snapshot[key];
    if (value == null) {
      Deno.env.delete(key);
      continue;
    }
    Deno.env.set(key, value);
  }
};

Deno.test("getEnv", async (t) => {
  await t.step("returns default values when env vars are not set", () => {
    const originalEnv = snapshotEnv();
    try {
      for (const key of TRACKED_ENV_KEYS) {
        Deno.env.delete(key);
      }

      const env = getEnv();

      assertEquals(env.DEFAULT_FZF_OPTIONS, "");
      assertEquals(env.SOCK, undefined);
      assertEquals(env.GIT_CAT, "cat");
      assertEquals(env.GIT_TREE, "tree");
      assertEquals(env.DISABLE_BUILTIN_COMPLETION, false);
      assertEquals(env.DISABLE_AUTOMATIC_WORKSPACE_LOOKUP, false);
      assertEquals(env.LOCAL_CONFIG_PATH, undefined);
      assertEquals(env.HOME, undefined);
    } finally {
      restoreEnv(originalEnv);
    }
  });

  await t.step("returns custom values when env vars are set", () => {
    const originalEnv = snapshotEnv();
    try {
      Deno.env.set("ZENO_DEFAULT_FZF_OPTIONS", "--height 50%");
      Deno.env.set("ZENO_SOCK", "/tmp/zeno.sock");
      Deno.env.set("ZENO_GIT_CAT", "bat");
      Deno.env.set("ZENO_GIT_TREE", "exa");
      Deno.env.set("ZENO_DISABLE_BUILTIN_COMPLETION", "1");
      Deno.env.set("ZENO_DISABLE_AUTOMATIC_WORKSPACE_LOOKUP", "1");
      Deno.env.set("ZENO_LOCAL_CONFIG_PATH", " ./project/.zeno-local ");
      Deno.env.set("ZENO_HOME", "/home/user/.zeno");

      const env = getEnv();

      assertEquals(env.DEFAULT_FZF_OPTIONS, "--height 50%");
      assertEquals(env.SOCK, "/tmp/zeno.sock");
      assertEquals(env.GIT_CAT, "bat");
      assertEquals(env.GIT_TREE, "exa");
      assertEquals(env.DISABLE_BUILTIN_COMPLETION, true);
      assertEquals(env.DISABLE_AUTOMATIC_WORKSPACE_LOOKUP, true);
      assertEquals(env.LOCAL_CONFIG_PATH, "./project/.zeno-local");
      assertEquals(env.HOME, "/home/user/.zeno");
    } finally {
      restoreEnv(originalEnv);
    }
  });

  await t.step(
    "DISABLE_BUILTIN_COMPLETION is true for any non-null value",
    () => {
      const originalEnv = snapshotEnv();
      try {
        Deno.env.set("ZENO_DISABLE_BUILTIN_COMPLETION", "");
        assertEquals(getEnv().DISABLE_BUILTIN_COMPLETION, true);

        Deno.env.set("ZENO_DISABLE_BUILTIN_COMPLETION", "false");
        assertEquals(getEnv().DISABLE_BUILTIN_COMPLETION, true);

        Deno.env.set("ZENO_DISABLE_BUILTIN_COMPLETION", "0");
        assertEquals(getEnv().DISABLE_BUILTIN_COMPLETION, true);

        Deno.env.delete("ZENO_DISABLE_BUILTIN_COMPLETION");
        assertEquals(getEnv().DISABLE_BUILTIN_COMPLETION, false);
      } finally {
        restoreEnv(originalEnv);
      }
    },
  );

  await t.step(
    "DISABLE_AUTOMATIC_WORKSPACE_LOOKUP is true only when value is 1",
    () => {
      const originalEnv = snapshotEnv();
      try {
        Deno.env.set("ZENO_DISABLE_AUTOMATIC_WORKSPACE_LOOKUP", "1");
        assertEquals(getEnv().DISABLE_AUTOMATIC_WORKSPACE_LOOKUP, true);

        Deno.env.set("ZENO_DISABLE_AUTOMATIC_WORKSPACE_LOOKUP", "0");
        assertEquals(getEnv().DISABLE_AUTOMATIC_WORKSPACE_LOOKUP, false);

        Deno.env.set("ZENO_DISABLE_AUTOMATIC_WORKSPACE_LOOKUP", "true");
        assertEquals(getEnv().DISABLE_AUTOMATIC_WORKSPACE_LOOKUP, false);

        Deno.env.delete("ZENO_DISABLE_AUTOMATIC_WORKSPACE_LOOKUP");
        assertEquals(getEnv().DISABLE_AUTOMATIC_WORKSPACE_LOOKUP, false);
      } finally {
        restoreEnv(originalEnv);
      }
    },
  );

  await t.step("LOCAL_CONFIG_PATH trims whitespace and ignores empty", () => {
    const originalEnv = snapshotEnv();
    try {
      Deno.env.set("ZENO_LOCAL_CONFIG_PATH", " ./local-config ");
      assertEquals(getEnv().LOCAL_CONFIG_PATH, "./local-config");

      Deno.env.set("ZENO_LOCAL_CONFIG_PATH", "   ");
      assertEquals(getEnv().LOCAL_CONFIG_PATH, undefined);

      Deno.env.delete("ZENO_LOCAL_CONFIG_PATH");
      assertEquals(getEnv().LOCAL_CONFIG_PATH, undefined);
    } finally {
      restoreEnv(originalEnv);
    }
  });
});
