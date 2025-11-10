import { describe, it } from "../deps.ts";
import { assertEquals } from "../deps.ts";
import { createRedactor } from "../../src/history/redactor.ts";

describe("createRedactor", () => {
  it("applies patterns sequentially", () => {
    const redactor = createRedactor([
      /token-\w+/g,
      /\d{4}-\d{4}/g,
    ]);

    const result = redactor.applyAll("token-abc and 1234-5678");
    assertEquals(result, "*** and ***");
  });

  it("allows patterns to be replaced", () => {
    const redactor = createRedactor([/secret/g]);
    redactor.setPatterns([/new/g]);

    const result = redactor.applyAll("secret new");
    assertEquals(result, "secret ***");
  });
});
