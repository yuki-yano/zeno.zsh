import { assertEquals } from "./deps.ts";
import { exists } from "../src/deps.ts";

Deno.test("server - exists function works asynchronously", async () => {
  const tempFile = await Deno.makeTempFile();

  try {
    // Test that file exists
    const fileExists = await exists(tempFile);
    assertEquals(fileExists, true);

    // Remove file and test it doesn't exist
    await Deno.remove(tempFile);
    const fileDoesNotExist = await exists(tempFile);
    assertEquals(fileDoesNotExist, false);
  } catch (e) {
    // Clean up if test fails
    try {
      await Deno.remove(tempFile);
    } catch {
      // Ignore error if file already removed
    }
    throw e;
  }
});

Deno.test("server - exists handles directories", async () => {
  const tempDir = await Deno.makeTempDir();

  try {
    const dirExists = await exists(tempDir);
    assertEquals(dirExists, true);

    await Deno.remove(tempDir);
    const dirDoesNotExist = await exists(tempDir);
    assertEquals(dirDoesNotExist, false);
  } catch (e) {
    // Clean up if test fails
    try {
      await Deno.remove(tempDir);
    } catch {
      // Ignore error if already removed
    }
    throw e;
  }
});
