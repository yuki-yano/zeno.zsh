import { assertEquals, assertThrows } from "../deps.ts";
import { createConnectionManager } from "../../src/socket/connection-manager.ts";
import { TextWriter } from "../../src/text-writer.ts";

// Mock Deno.Conn for testing
const createMockConn = (): Deno.Conn => ({
  localAddr: { transport: "tcp", hostname: "127.0.0.1", port: 8080 } as Deno.NetAddr,
  remoteAddr: { transport: "tcp", hostname: "127.0.0.1", port: 8081 } as Deno.NetAddr,
  readable: new ReadableStream(),
  writable: new WritableStream(),
  read: () => Promise.resolve(null),
  write: () => Promise.resolve(0),
  close: () => {},
  closeWrite: () => Promise.resolve(),
  ref: () => {},
  unref: () => {},
  [Symbol.dispose]: () => {},
});

Deno.test("createConnectionManager", async (t) => {
  await t.step("adds and removes connections", () => {
    const manager = createConnectionManager({ maxConnections: 10 });
    const conn = createMockConn();
    const writer = new TextWriter();

    // Add connection
    const id = manager.addConnection(conn, writer);
    assertEquals(typeof id, "number");
    assertEquals(manager.getActiveConnectionCount(), 1);

    // Remove connection
    manager.removeConnection(id);
    assertEquals(manager.getActiveConnectionCount(), 0);
  });

  await t.step("enforces connection limit", () => {
    const manager = createConnectionManager({ maxConnections: 2 });
    const conn1 = createMockConn();
    const conn2 = createMockConn();
    const conn3 = createMockConn();
    const writer = new TextWriter();

    // Add two connections (should succeed)
    manager.addConnection(conn1, writer);
    manager.addConnection(conn2, writer);
    assertEquals(manager.getActiveConnectionCount(), 2);

    // Try to add third connection (should fail)
    assertThrows(
      () => manager.addConnection(conn3, writer),
      Error,
      "Connection limit reached (2)",
    );
  });

  await t.step("removes non-existent connection gracefully", () => {
    const manager = createConnectionManager();
    
    // Should not throw when removing non-existent connection
    manager.removeConnection(999);
    assertEquals(manager.getActiveConnectionCount(), 0);
  });

  await t.step("cleans up timed out connections", async () => {
    const manager = createConnectionManager({ connectionTimeout: 100 }); // 100ms timeout
    const conn = createMockConn();
    const writer = new TextWriter();

    // Add connection
    const id = manager.addConnection(conn, writer);
    assertEquals(manager.getActiveConnectionCount(), 1);

    // Wait for timeout
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Clean up timed out connections
    manager.cleanupTimedOutConnections();
    assertEquals(manager.getActiveConnectionCount(), 0);
  });

  await t.step("closes all connections", () => {
    const manager = createConnectionManager();
    const conn1 = createMockConn();
    const conn2 = createMockConn();
    const writer = new TextWriter();

    // Add multiple connections
    manager.addConnection(conn1, writer);
    manager.addConnection(conn2, writer);
    assertEquals(manager.getActiveConnectionCount(), 2);

    // Close all
    manager.closeAll();
    assertEquals(manager.getActiveConnectionCount(), 0);
  });

  await t.step("handles multiple operations correctly", () => {
    const manager = createConnectionManager({ maxConnections: 5 });
    const connections = [];
    const writer = new TextWriter();

    // Add 3 connections
    for (let i = 0; i < 3; i++) {
      const conn = createMockConn();
      const id = manager.addConnection(conn, writer);
      connections.push(id);
    }
    assertEquals(manager.getActiveConnectionCount(), 3);

    // Remove middle connection
    manager.removeConnection(connections[1]);
    assertEquals(manager.getActiveConnectionCount(), 2);

    // Add new connection
    const newConn = createMockConn();
    manager.addConnection(newConn, writer);
    assertEquals(manager.getActiveConnectionCount(), 3);
  });
});