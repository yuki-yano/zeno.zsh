import { assertEquals, path } from "../deps.ts";
import { parseXdgConfigDirs } from "../../src/config/loader.ts";

const detectDelimiter = (): string => {
  const maybePath = path as unknown as {
    delimiter?: string;
    DELIMITER?: string;
  };
  if (typeof maybePath.delimiter === "string") {
    return maybePath.delimiter;
  }
  if (typeof maybePath.DELIMITER === "string") {
    return maybePath.DELIMITER;
  }
  return Deno.build.os === "windows" ? ";" : ":";
};

Deno.test("parseXdgConfigDirs splits and trims entries", () => {
  const delimiter = detectDelimiter();
  const raw = [
    " /home/user/.config ",
    "",
    "/etc/xdg",
  ].join(delimiter);
  const result = parseXdgConfigDirs(raw);

  assertEquals(result, ["/home/user/.config", "/etc/xdg"]);
});

Deno.test("parseXdgConfigDirs returns empty array for empty input", () => {
  assertEquals(parseXdgConfigDirs(""), []);
});
