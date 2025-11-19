import { describe, it } from "../deps.ts";
import { assertEquals } from "../deps.ts";
import { applyFirstPlaceholder } from "../../src/snippet/placeholder.ts";

describe("snippet/placeholder", () => {
  describe("applyFirstPlaceholder", () => {
    it("removes first placeholder and returns its index", () => {
      const result = applyFirstPlaceholder("cmd {{TARGET}} tail", 99);
      assertEquals(result, { text: "cmd  tail", cursor: 4 });
    });

    it("uses fallback cursor when no placeholder found", () => {
      const result = applyFirstPlaceholder("echo ok", 12);
      assertEquals(result, { text: "echo ok", cursor: 12 });
    });

    it("uses text length as fallback when not provided", () => {
      const result = applyFirstPlaceholder("abc");
      assertEquals(result, { text: "abc", cursor: 3 });
    });
  });
});
