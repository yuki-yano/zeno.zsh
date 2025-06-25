import { createApp } from "./app-factory.ts";

// Create default app instance for backward compatibility
const app = createApp();

export const execServer = async ({ socketPath }: { socketPath: string }) => {
  await app.execServer(socketPath);
};

export const execCli = async ({ args }: { args: Array<string> }) => {
  await app.execCli(args);
};
