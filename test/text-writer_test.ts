import { assert, assertEquals, assertThrows } from "./deps.ts";
import { TextWriter } from "../src/text-writer.ts";

Deno.test("TextWriter - write to stdout", async () => {
  const writer = new TextWriter();
  const chunks: Uint8Array[] = [];

  // Mock Deno.stdout.write
  const originalWrite = Deno.stdout.write;
  Deno.stdout.write = (data: Uint8Array) => {
    chunks.push(data);
    return Promise.resolve(data.length);
  };

  try {
    await writer.write({ format: "%s", text: "test output" });
    await writer.write({ format: "%s\n", text: "with newline" });

    const decoder = new TextDecoder();
    assertEquals(decoder.decode(chunks[0]), "test output");
    assertEquals(decoder.decode(chunks[1]), "with newline\n");
  } finally {
    Deno.stdout.write = originalWrite;
  }
});

Deno.test("TextWriter - write to connection", async () => {
  const writer = new TextWriter();
  const chunks: Uint8Array[] = [];

  // Mock connection
  const mockConn = {
    write: (data: Uint8Array) => {
      chunks.push(data);
      return Promise.resolve(data.length);
    },
    closeWrite: () => {},
  } as unknown as Deno.Conn;

  writer.setConn(mockConn);
  assert(writer.hasConn());

  await writer.write({ format: "%s", text: "test to conn" });

  const decoder = new TextDecoder();
  assertEquals(decoder.decode(chunks[0]), "test to conn");
});

Deno.test("TextWriter - connection management", () => {
  const writer = new TextWriter();

  // Initially no connection
  assertEquals(writer.hasConn(), false);
  assertThrows(() => writer.getConn(), Error, "Conn is not set");

  // Set connection
  const mockConn = {} as Deno.Conn;
  writer.setConn(mockConn);
  assertEquals(writer.hasConn(), true);
  assertEquals(writer.getConn(), mockConn);

  // Clear connection
  writer.clearConn();
  assertEquals(writer.hasConn(), false);
  assertThrows(() => writer.getConn(), Error, "Conn is not set");
});

Deno.test("TextWriter - format string interpolation", async () => {
  const writer = new TextWriter();
  const chunks: Uint8Array[] = [];

  // Mock Deno.stdout.write
  const originalWrite = Deno.stdout.write;
  Deno.stdout.write = (data: Uint8Array) => {
    chunks.push(data);
    return Promise.resolve(data.length);
  };

  try {
    await writer.write({ format: "Hello %s!", text: "World" });
    await writer.write({ format: "Number: %s\n", text: "42" });

    const decoder = new TextDecoder();
    assertEquals(decoder.decode(chunks[0]), "Hello World!");
    assertEquals(decoder.decode(chunks[1]), "Number: 42\n");
  } finally {
    Deno.stdout.write = originalWrite;
  }
});

Deno.test("TextWriter - multiple instances are independent", () => {
  const writer1 = new TextWriter();
  const writer2 = new TextWriter();

  const mockConn1 = { id: 1 } as unknown as Deno.Conn;
  const mockConn2 = { id: 2 } as unknown as Deno.Conn;

  writer1.setConn(mockConn1);
  writer2.setConn(mockConn2);

  assertEquals(writer1.getConn(), mockConn1);
  assertEquals(writer2.getConn(), mockConn2);

  writer1.clearConn();
  assertEquals(writer1.hasConn(), false);
  assertEquals(writer2.hasConn(), true);
});
