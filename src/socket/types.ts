import type { TextWriter } from "../text-writer.ts";
import type { ConnectionConfig } from "./connection-manager.ts";

export type SocketHandler = (context: {
  args: readonly string[];
  writer: TextWriter;
}) => Promise<void>;

export type SocketServerConfig = {
  socketPath: string;
  handler: SocketHandler;
  onError?: (error: unknown, writer: TextWriter) => Promise<void>;
  connectionConfig?: ConnectionConfig;
};
