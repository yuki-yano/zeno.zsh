import { sprintf } from "./deps.ts";

/**
 * TextWriter handles writing formatted text output to either a socket connection or stdout
 *
 * This class provides a unified interface for writing output that can be directed
 * to either a Deno connection (when in socket mode) or standard output (when in CLI mode).
 */
export class TextWriter {
  private textEncoder: TextEncoder;
  private conn: Deno.Conn | undefined;

  constructor() {
    this.textEncoder = new TextEncoder();
  }

  /**
   * Set the connection to write to
   * @param newConn - The Deno connection to use for output
   */
  setConn(newConn: Deno.Conn): void {
    this.conn = newConn;
  }

  /**
   * Get the current connection
   * @returns The current Deno connection
   * @throws Error if no connection is set
   */
  getConn(): Deno.Conn {
    if (this.conn === undefined) {
      throw new Error("Conn is not set");
    }
    return this.conn;
  }

  /**
   * Check if a connection is set
   * @returns true if a connection is set, false otherwise
   */
  hasConn(): boolean {
    return this.conn !== undefined;
  }

  /**
   * Clear the current connection
   */
  clearConn(): void {
    this.conn = undefined;
  }

  /**
   * Write formatted text to the output
   * @param params - Write parameters
   * @param params.format - sprintf-style format string
   * @param params.text - Text to format and write
   */
  async write(
    { format, text }: { format: string; text: string },
  ): Promise<void> {
    try {
      const data = this.textEncoder.encode(sprintf(format, text));
      if (this.hasConn()) {
        await this.conn!.write(data);
      } else {
        await Deno.stdout.write(data);
      }
    } catch (error) {
      throw new Error(`Failed to write output: ${error}`);
    }
  }
}

// Create a singleton instance for backward compatibility
export const defaultWriter = new TextWriter();

// Export functions for backward compatibility

/**
 * Set the connection for the default writer
 * @param newConn - The Deno connection to use for output
 */
export const setConn = (newConn: Deno.Conn): void =>
  defaultWriter.setConn(newConn);

/**
 * Get the current connection from the default writer
 * @returns The current Deno connection
 * @throws Error if no connection is set
 */
export const getConn = (): Deno.Conn => defaultWriter.getConn();

/**
 * Check if the default writer has a connection
 * @returns true if a connection is set, false otherwise
 */
export const hasConn = (): boolean => defaultWriter.hasConn();

/**
 * Clear the connection from the default writer
 */
export const clearConn = (): void => defaultWriter.clearConn();

/**
 * Write formatted text using the default writer
 * @param params - Write parameters
 * @param params.format - sprintf-style format string
 * @param params.text - Text to format and write
 */
export const write = (
  { format, text }: { format: string; text: string },
): Promise<void> => defaultWriter.write({ format, text });
