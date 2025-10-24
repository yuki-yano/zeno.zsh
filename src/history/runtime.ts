import { path, xdg } from "../deps.ts";
import { createHistoryModule } from "./module.ts";
import { createRedactor } from "./redactor.ts";
import { createRepoFinder } from "./repo-finder.ts";
import { createSQLiteStore } from "./sqlite-store.ts";
import { createHistfileEditor } from "./histfile-editor.ts";
import { createHistoryIO } from "./io.ts";
import type { HistoryModule } from "./types.ts";

type HistoryRuntime = {
  module: HistoryModule;
};

let runtimePromise: Promise<HistoryRuntime> | null = null;

const resolveDatabasePath = (): string => {
  const base = xdg.data();
  return path.join(base, "zeno", "history.db");
};

const createRuntime = async (): Promise<HistoryRuntime> => {
  const store = await createSQLiteStore({
    databasePath: resolveDatabasePath(),
  });
  const repoFinder = createRepoFinder();
  const redactor = createRedactor([]);
  const histfileEditor = createHistfileEditor({
    histfilePath: Deno.env.get("HISTFILE") ?? null,
  });
  const historyIO = createHistoryIO({});

  const module = createHistoryModule({
    store,
    repoFinder,
    redactor,
    histfileEditor,
    historyIO,
    now: () => new Date().toISOString(),
  });

  return { module };
};

export const getHistoryModule = async (): Promise<HistoryModule> => {
  if (!runtimePromise) {
    runtimePromise = createRuntime();
  }

  const runtime = await runtimePromise;
  return runtime.module;
};
