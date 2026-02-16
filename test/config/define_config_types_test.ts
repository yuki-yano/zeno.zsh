import { describe, it } from "../deps.ts";
import { defineConfig } from "../../src/mod.ts";
import type { ConfigContext } from "../../src/mod.ts";

describe("defineConfig type definitions", () => {
  it("accepts partial history settings", () => {
    defineConfig(() => ({
      history: {
        defaultScope: "repository",
      },
    }));

    defineConfig(() => ({
      history: {
        keymap: {
          toggleScope: "ctrl-t",
        },
      },
    }));
  });

  it("preserves sync config return type", () => {
    const config = defineConfig((_context: ConfigContext) => ({
      snippets: [] as const,
    }));

    const assign: (_context: ConfigContext) => { snippets: readonly [] } =
      config;
    void assign;
  });

  it("preserves async config return type", () => {
    const config = defineConfig(async (_context: ConfigContext) => ({
      snippets: [] as const,
    }));

    const assign: (
      _context: ConfigContext,
    ) => Promise<{ snippets: readonly [] }> = config;
    void assign;
  });
});
