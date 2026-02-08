import { describe, it } from "../deps.ts";
import { assertEquals, assertStrictEquals } from "../deps.ts";
import {
  parseBooleanFlag,
  parseInteger,
  parseLimit,
  parseNonEmptyString,
  parseStringArray,
} from "../../src/history/input-parsers.ts";

describe("history input parsers", () => {
  it("parses integer values from numbers and strings", () => {
    assertEquals(parseInteger(10), 10);
    assertEquals(parseInteger("42"), 42);
    assertEquals(parseInteger("08"), 8);
    assertStrictEquals(parseInteger(""), null);
    assertStrictEquals(parseInteger("abc"), null);
    assertStrictEquals(parseInteger(undefined), null);
  });

  it("parses limit with clamp and fallback", () => {
    assertEquals(parseLimit(100), 100);
    assertEquals(parseLimit("250"), 250);
    assertEquals(parseLimit(-1), 1);
    assertEquals(parseLimit("0"), 1);
    assertEquals(parseLimit("abc", { fallback: 10 }), 10);
    assertEquals(parseLimit("9999", { max: 5000 }), 5000);
    assertEquals(parseLimit(undefined, { fallback: 2000 }), 2000);
  });

  it("returns non-empty strings only", () => {
    assertEquals(parseNonEmptyString("value"), "value");
    assertStrictEquals(parseNonEmptyString(""), null);
    assertStrictEquals(parseNonEmptyString(1), null);
    assertStrictEquals(parseNonEmptyString(null), null);
  });

  it("normalizes string arrays from scalar and array values", () => {
    assertEquals(parseStringArray("token"), ["token"]);
    assertEquals(parseStringArray(["a", "b"]), ["a", "b"]);
    assertEquals(parseStringArray(["a", 1, "", null]), ["a"]);
    assertEquals(parseStringArray(undefined), []);
  });

  it("parses boolean flags from bool and string values", () => {
    assertStrictEquals(parseBooleanFlag(true), true);
    assertStrictEquals(parseBooleanFlag("true"), true);
    assertStrictEquals(parseBooleanFlag(false), false);
    assertStrictEquals(parseBooleanFlag("false"), false);
    assertStrictEquals(parseBooleanFlag(undefined), false);
    assertStrictEquals(parseBooleanFlag("1"), false);
  });
});
