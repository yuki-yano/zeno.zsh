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

/**
 * Manages socket connections with limits and timeouts
 */
export class ConnectionManager {
  private connections = new Map<number, Connection>();
  private connectionId = 0;
  private readonly maxConnections: number;
  private readonly connectionTimeout: number;

  constructor(config: ConnectionConfig = {}) {
    this.maxConnections = config.maxConnections ?? 100;
    this.connectionTimeout = config.connectionTimeout ?? 60000; // 60 seconds default
  }

  /**
   * Add a new connection
   */
  addConnection(conn: Deno.Conn, writer: TextWriter): number {
    // Check connection limit
    if (this.connections.size >= this.maxConnections) {
      throw new Error(`Connection limit reached (${this.maxConnections})`);
    }

    const id = this.connectionId++;
    this.connections.set(id, {
      conn,
      writer,
      startTime: Date.now(),
    });

    return id;
  }

  /**
   * Remove a connection
   */
  removeConnection(id: number): void {
    const connection = this.connections.get(id);
    if (connection) {
      connection.writer.clearConn();
      try {
        connection.conn.close();
      } catch {
        // Connection might already be closed
      }
      this.connections.delete(id);
    }
  }

  /**
   * Clean up timed out connections
   */
  cleanupTimedOutConnections(): void {
    const now = Date.now();
    for (const [id, connection] of this.connections.entries()) {
      if (now - connection.startTime > this.connectionTimeout) {
        this.removeConnection(id);
      }
    }
  }

  /**
   * Get active connection count
   */
  getActiveConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Close all connections
   */
  closeAll(): void {
    for (const id of this.connections.keys()) {
      this.removeConnection(id);
    }
  }
}
