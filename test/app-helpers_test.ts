import { assertEquals } from "./deps.ts";
import type { write } from "../src/text-writer.ts";
import {
  handleNullableResult,
  handleStatusResult,
  writeResult,
} from "../src/app-helpers.ts";

// Mock write function for testing
const createMockWriter = () => {
  const output: string[] = [];
  const mockWrite: typeof write = ({ format, text }) => {
    output.push(format.replace("%s", text));
    return Promise.resolve();
  };
  return { mockWrite, output };
};

Deno.test("writeResult - writes status and data lines", async () => {
  const { mockWrite, output } = createMockWriter();

  await writeResult(mockWrite, "success", "line1", "line2");

  assertEquals(output, ["success\n", "line1\n", "line2\n"]);
});

Deno.test("writeResult - writes only status when no data", async () => {
  const { mockWrite, output } = createMockWriter();

  await writeResult(mockWrite, "failure");

  assertEquals(output, ["failure\n"]);
});

Deno.test("handleStatusResult - handles success status", async () => {
  const { mockWrite, output } = createMockWriter();
  const result = {
    status: "success" as const,
    buffer: "test buffer",
    cursor: 42,
  };

  await handleStatusResult(mockWrite, result, (r) => [
    r.buffer,
    r.cursor.toString(),
  ]);

  assertEquals(output, ["success\n", "test buffer\n", "42\n"]);
});

Deno.test("handleStatusResult - handles failure status", async () => {
  const { mockWrite, output } = createMockWriter();
  const result = { status: "failure" as const };

  await handleStatusResult(mockWrite, result, () => []);

  assertEquals(output, ["failure\n"]);
});

Deno.test("handleNullableResult - handles non-null result", async () => {
  const { mockWrite, output } = createMockWriter();
  const result = {
    sourceCommand: "git status",
    options: {},
    callback: "echo",
    callbackZero: true,
  };

  await handleNullableResult(mockWrite, result, (r) => [
    r.sourceCommand,
    r.callback ?? "",
    r.callbackZero ? "zero" : "",
  ]);

  assertEquals(output, ["success\n", "git status\n", "echo\n", "zero\n"]);
});

Deno.test("handleNullableResult - handles null result", async () => {
  const { mockWrite, output } = createMockWriter();

  await handleNullableResult(mockWrite, null, () => []);

  assertEquals(output, ["failure\n"]);
});

Deno.test("handleNullableResult - handles undefined result", async () => {
  const { mockWrite, output } = createMockWriter();

  await handleNullableResult(mockWrite, undefined, () => []);

  assertEquals(output, ["failure\n"]);
});
