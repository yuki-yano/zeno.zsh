import { assertEquals, describe, it } from "./deps.ts";
import { fzfOptionsToString } from "../src/fzf/option/convert.ts";
import type { FzfOptions } from "../src/type/fzf.ts";

describe("fzf option convert", () => {
  describe("fzfOptionsToString", () => {
    it("handles string values correctly", () => {
      const options: FzfOptions = {
        "--header-lines": "2",
        "--height": "80%",
      };

      const result = fzfOptionsToString(options);

      // The function always adds --expect="alt-enter" by default
      assertEquals(
        result,
        '--expect="alt-enter" --header-lines=2 --height=80%',
      );
    });

    it("handles number values correctly", () => {
      const options: FzfOptions = {
        "--header-lines": 2,
        "--height": 80,
      };

      const result = fzfOptionsToString(options);

      // Now with the fix, numbers should be handled correctly
      assertEquals(result, '--expect="alt-enter" --header-lines=2 --height=80');
    });

    it("handles boolean values correctly", () => {
      const options: FzfOptions = {
        "--multi": true,
        "--ansi": true,
        "--disabled": false,
      };

      const result = fzfOptionsToString(options);

      assertEquals(result, '--expect="alt-enter" --multi --ansi');
    });

    it("handles mixed types", () => {
      const options: FzfOptions = {
        "--header": "Results",
        "--header-lines": 2,
        "--multi": true,
        "--preview": "echo {}",
      };

      const result = fzfOptionsToString(options);

      // Should include all options properly formatted
      assertEquals(result.includes('--preview="echo {}"'), true);
      assertEquals(result.includes("--header=Results"), true);
      assertEquals(result.includes("--header-lines=2"), true);
      assertEquals(result.includes("--multi"), true);
      assertEquals(result.includes('--expect="alt-enter"'), true);
    });

    it("handles undefined and null correctly", () => {
      const options: FzfOptions = {
        "--undefined-value": undefined,
        "--null-value": null,
      };

      const result = fzfOptionsToString(options);

      // undefined and null should just output the key
      assertEquals(
        result,
        '--expect="alt-enter" --undefined-value --null-value',
      );
    });
  });
});
