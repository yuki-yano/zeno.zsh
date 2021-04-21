import { readAllSync } from "../deps.ts";

export const readFromStdin = () => {
  const decoder = new TextDecoder();
  return decoder.decode(readAllSync(Deno.stdin));
};
