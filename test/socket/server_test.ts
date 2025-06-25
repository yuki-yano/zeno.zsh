import { assertEquals } from "../deps.ts";
import { createSocketServer } from "../../src/socket/server.ts";

Deno.test("createSocketServer - basic functionality", async (t) => {
  await t.step("creates server with handler", () => {
    // Handler would be called when connection is made

    const server = createSocketServer({
      socketPath: "/tmp/test.sock",
      handler: ({ writer }) => {
        // Handler logic here
        return writer.write({ format: "%s\n", text: "success" });
      },
    });

    // Verify server object has expected methods
    assertEquals(typeof server.start, "function");
    assertEquals(typeof server.stop, "function");
    assertEquals(typeof server.getActiveConnections, "function");
  });

  await t.step("creates server with error handler", () => {
    // Error handler would be called when error occurs

    const server = createSocketServer({
      socketPath: "/tmp/test.sock",
      handler: () => {
        throw new Error("Test error");
      },
      onError: (_error, writer) => {
        // Error handler logic here
        return writer.write({ format: "%s\n", text: "custom error" });
      },
    });

    // Verify server object is created
    assertEquals(typeof server.start, "function");
  });

  await t.step("respects connection config", () => {
    const server = createSocketServer({
      socketPath: "/tmp/test.sock",
      handler: ({ writer }) => {
        return writer.write({ format: "%s\n", text: "ok" });
      },
      connectionConfig: {
        maxConnections: 25,
        connectionTimeout: 15000,
      },
    });

    // Initial connection count should be 0
    assertEquals(server.getActiveConnections(), 0);
  });
});

// Note: Full integration tests with actual socket connections
// should be done separately as they require careful resource management
// and can be flaky in CI environments
