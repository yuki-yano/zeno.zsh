import { sprintf } from "./deps.ts";

let textEncoder: TextEncoder;
let conn: Deno.Conn | undefined;

export const setConn = (newConn: Deno.Conn): void => {
  conn = newConn;
};

export const getConn = (): Deno.Conn => {
  if (conn === undefined) {
    throw new Error("Conn is not set");
  }
  return conn;
};

export const hasConn = (): boolean => {
  return conn !== undefined;
};

export const clearConn = (): void => {
  conn = undefined;
};

export const write = async (
  { format, text }: { format: string; text: string },
): Promise<void> => {
  textEncoder ??= new TextEncoder();
  const data = textEncoder.encode(sprintf(format, text));
  if (hasConn()) {
    const conn = getConn();
    await conn.write(data);
  } else {
    await Deno.stdout.write(data);
  }
};
