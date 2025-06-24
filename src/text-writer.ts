import { sprintf } from "./deps.ts";

export class TextWriter {
  private textEncoder: TextEncoder;
  private conn: Deno.Conn | undefined;

  constructor() {
    this.textEncoder = new TextEncoder();
  }

  setConn(newConn: Deno.Conn): void {
    this.conn = newConn;
  }

  getConn(): Deno.Conn {
    if (this.conn === undefined) {
      throw new Error("Conn is not set");
    }
    return this.conn;
  }

  hasConn(): boolean {
    return this.conn !== undefined;
  }

  clearConn(): void {
    this.conn = undefined;
  }

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
export const setConn = (newConn: Deno.Conn): void =>
  defaultWriter.setConn(newConn);
export const getConn = (): Deno.Conn => defaultWriter.getConn();
export const hasConn = (): boolean => defaultWriter.hasConn();
export const clearConn = (): void => defaultWriter.clearConn();
export const write = (
  { format, text }: { format: string; text: string },
): Promise<void> => defaultWriter.write({ format, text });
