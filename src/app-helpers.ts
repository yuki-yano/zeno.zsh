import type { write } from "./text-writer.ts";

export type WriteFunction = typeof write;

/**
 * Write result status and optional data lines
 */
export const writeResult = async (
  writeFn: WriteFunction,
  status: "success" | "failure",
  ...dataLines: string[]
): Promise<void> => {
  await writeFn({ format: "%s\n", text: status });
  for (const data of dataLines) {
    await writeFn({ format: "%s\n", text: data });
  }
};

/**
 * Handle result object with status property
 */
export const handleStatusResult = async <
  T extends { status: "success" | "failure" },
>(
  writeFn: WriteFunction,
  result: T,
  getSuccessData: (result: T) => string[],
): Promise<void> => {
  if (result.status === "failure") {
    await writeResult(writeFn, "failure");
  } else if (result.status === "success") {
    await writeResult(writeFn, "success", ...getSuccessData(result));
  }
};

/**
 * Handle nullable result
 */
export const handleNullableResult = async <T>(
  writeFn: WriteFunction,
  result: T | null | undefined,
  getSuccessData: (result: T) => string[],
): Promise<void> => {
  if (result != null) {
    await writeResult(writeFn, "success", ...getSuccessData(result));
  } else {
    await writeResult(writeFn, "failure");
  }
};
