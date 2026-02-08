import { describe, it } from "../deps.ts";
import { assertEquals, assertStrictEquals } from "../deps.ts";
import {
  buildCliLiteralRedactPatterns,
  buildCombinedRedactPatterns,
  buildConfigRedactPatterns,
  MAX_REDACT_PATTERN_LENGTH,
} from "../../src/history/redact-patterns.ts";

describe("history redact patterns", () => {
  it("builds config patterns from regex and string entries", () => {
    const result = buildConfigRedactPatterns([/apiKey/g, "token=.*"]);
    assertStrictEquals(result.ok, true);
    if (!result.ok) {
      return;
    }
    assertEquals(result.value.length, 2);
    assertEquals(String(result.value[0]), "/apiKey/g");
    assertEquals(String(result.value[1]), "/token=.*/g");
  });

  it("returns error for invalid config regexp pattern", () => {
    const result = buildConfigRedactPatterns(["[invalid"]);
    assertStrictEquals(result.ok, false);
    if (!result.ok) {
      assertEquals(result.error, "history.redact[0] is invalid");
    }
  });

  it("returns error for unsupported config entry types", () => {
    const result = buildConfigRedactPatterns([
      "ok",
      1 as unknown as string,
    ]);
    assertStrictEquals(result.ok, false);
    if (!result.ok) {
      assertEquals(result.error, "history.redact[1] must be string or RegExp");
    }
  });

  it("returns error for too long cli pattern", () => {
    const tooLong = "a".repeat(MAX_REDACT_PATTERN_LENGTH + 1);
    const result = buildCliLiteralRedactPatterns(tooLong);
    assertStrictEquals(result.ok, false);
    if (!result.ok) {
      assertEquals(result.error, "pattern[0] is too long");
    }
  });

  it("escapes cli patterns as literal expressions", () => {
    const result = buildCliLiteralRedactPatterns("token.*");
    assertStrictEquals(result.ok, true);
    if (!result.ok) {
      return;
    }
    assertEquals(result.value[0].source, "token\\.\\*");
  });

  it("combines config and cli patterns", () => {
    const result = buildCombinedRedactPatterns(["foo.*"], ["token"]);
    assertStrictEquals(result.ok, true);
    if (!result.ok) {
      return;
    }
    assertEquals(result.value.length, 2);
    assertEquals(result.value[0].source, "foo.*");
    assertEquals(result.value[1].source, "token");
  });
});
