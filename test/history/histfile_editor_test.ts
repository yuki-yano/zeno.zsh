import { afterEach, beforeEach, describe, it } from "../deps.ts";
import { assertEquals, assertStrictEquals } from "../deps.ts";
import { createHistfileEditor } from "../../src/history/histfile-editor.ts";

let tempDir: string;

beforeEach(async () => {
  tempDir = await Deno.makeTempDir({ prefix: "histfile-editor-test-" });
});

afterEach(async () => {
  await Deno.remove(tempDir, { recursive: true });
});

const writeHistfile = async (contents: string) => {
  const path = `${tempDir}/.zsh_history`;
  await Deno.writeTextFile(path, contents);
  return path;
};

describe("createHistfileEditor", () => {
  it("removes matching command and preserves others", async () => {
    const histfile = await writeHistfile([
      ": 1700000000:0;echo foo",
      ": 1700000001:0;echo bar",
    ].join("\n"));

    const editor = createHistfileEditor({
      histfilePath: histfile,
    });

    const result = await editor.prune({ command: "echo foo" });
    assertStrictEquals(result.ok, true);

    const updated = await Deno.readTextFile(histfile);
    assertEquals(updated.trim(), ": 1700000001:0;echo bar");
  });

  it("fails when lock already exists", async () => {
    const histfile = await writeHistfile(": 1700000000:0;echo foo\n");
    const lockPath = `${histfile}.lock`;
    await Deno.writeTextFile(lockPath, "locked");

    const editor = createHistfileEditor({
      histfilePath: histfile,
    });

    const result = await editor.prune({ command: "echo foo" });
    assertStrictEquals(result.ok, false);
    assertEquals(result.error.type, "lock");
  });
});
