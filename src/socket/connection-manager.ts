import type { TextWriter } from "../text-writer.ts";

export type ConnectionConfig = {
  maxConnections?: number;
  connectionTimeout?: number;
};

type Connection = {
  conn: Deno.Conn;
  writer: TextWriter;
  startTime: number;
};

type ConnectionManagerState = {
  connections: Map<number, Connection>;
  connectionId: number;
  maxConnections: number;
  connectionTimeout: number;
};

/**
 * Creates a connection manager with limits and timeouts
 */
export const createConnectionManager = (config: ConnectionConfig = {}) => {
  const state: ConnectionManagerState = {
    connections: new Map<number, Connection>(),
    connectionId: 0,
    maxConnections: config.maxConnections ?? 100,
    connectionTimeout: config.connectionTimeout ?? 60000, // 60 seconds default
  };

  /**
   * Add a new connection
   */
  const addConnection = (conn: Deno.Conn, writer: TextWriter): number => {
    // Check connection limit
    if (state.connections.size >= state.maxConnections) {
      throw new Error(`Connection limit reached (${state.maxConnections})`);
    }

    const id = state.connectionId++;

    // Handle ID overflow to prevent issues with long-running servers
    if (state.connectionId >= Number.MAX_SAFE_INTEGER) {
      // Find the next available ID starting from 0
      state.connectionId = 0;
      while (state.connections.has(state.connectionId)) {
        state.connectionId++;
        if (state.connectionId >= state.maxConnections) {
          // If we've cycled through all possible IDs up to maxConnections,
          // we're at capacity (this should have been caught earlier)
          throw new Error("Connection ID pool exhausted");
        }
      }
    }

    state.connections.set(id, {
      conn,
      writer,
      startTime: Date.now(),
    });

    return id;
  };

  /**
   * Remove a connection
   */
  const removeConnection = (id: number): void => {
    const connection = state.connections.get(id);
    if (connection) {
      connection.writer.clearConn();
      try {
        connection.conn.close();
      } catch {
        // Connection might already be closed
      }
      state.connections.delete(id);
    }
  };

  /**
   * Clean up timed out connections
   */
  const cleanupTimedOutConnections = (): void => {
    const now = Date.now();
    for (const [id, connection] of state.connections.entries()) {
      if (now - connection.startTime > state.connectionTimeout) {
        removeConnection(id);
      }
    }
  };

  /**
   * Get active connection count
   */
  const getActiveConnectionCount = (): number => {
    return state.connections.size;
  };

  /**
   * Close all connections
   */
  const closeAll = (): void => {
    for (const id of state.connections.keys()) {
      removeConnection(id);
    }
  };

  return {
    addConnection,
    removeConnection,
    cleanupTimedOutConnections,
    getActiveConnectionCount,
    closeAll,
  };
};
