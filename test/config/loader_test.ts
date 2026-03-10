import { assertEquals, path } from "../deps.ts";
import {
  getXdgConfigBaseDirs,
  parseXdgConfigDirs,
} from "../../src/config/loader.ts";

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

Deno.test("getXdgConfigBaseDirs adds ~/.config when XDG_CONFIG_HOME is unset", () => {
  const result = getXdgConfigBaseDirs({
    xdgConfigHome: "",
    xdgConfigDirs: ["/etc/xdg"],
    fallbackConfigDirs: ["/Library/Preferences"],
    homeDirectory: "/tmp/test-home",
  });

  assertEquals(result, [
    "/tmp/test-home/.config",
    "/etc/xdg",
    "/Library/Preferences",
  ]);
});

Deno.test(
  "getXdgConfigBaseDirs treats whitespace-only XDG_CONFIG_HOME as unset",
  () => {
    const result = getXdgConfigBaseDirs({
      xdgConfigHome: "   ",
      xdgConfigDirs: ["/etc/xdg"],
      fallbackConfigDirs: ["/Library/Preferences"],
      homeDirectory: " /tmp/test-home ",
    });

    assertEquals(result, [
      "/tmp/test-home/.config",
      "/etc/xdg",
      "/Library/Preferences",
    ]);
  },
);

Deno.test("getXdgConfigBaseDirs deduplicates overlapping config dirs", () => {
  const result = getXdgConfigBaseDirs({
    xdgConfigHome: "/tmp/test-home/.config",
    xdgConfigDirs: ["/etc/xdg", "/tmp/test-home/.config"],
    fallbackConfigDirs: ["/etc/xdg", "/Library/Preferences"],
    homeDirectory: "/tmp/test-home",
  });

  assertEquals(result, [
    "/tmp/test-home/.config",
    "/etc/xdg",
    "/Library/Preferences",
  ]);
});
