export interface HistfileEntry {
  command: string;
}

export type HistfileErrorType = "lock" | "io";

export interface HistfileError {
  type: HistfileErrorType;
  message: string;
  cause?: unknown;
}

export type HistfileResult =
  | { ok: true; value: void }
  | { ok: false; error: HistfileError };

export interface HistfileEditor {
  prune(entry: HistfileEntry): Promise<HistfileResult>;
}

interface HistfileEditorDeps {
  histfilePath?: string | null;
  lockPath?: string;
  readTextFile?: (path: string) => Promise<string>;
  writeTextFile?: (path: string, data: string) => Promise<void>;
  rename?: (from: string, to: string) => Promise<void>;
  remove?: (path: string) => Promise<void>;
  openLock?: (path: string) => Promise<Deno.FsFile>;
  runReload?: () => Promise<void>;
}

const defaultDeps = (): Required<
  Omit<HistfileEditorDeps, "histfilePath" | "lockPath" | "runReload">
> => ({
  readTextFile: async (path) => await Deno.readTextFile(path),
  writeTextFile: async (path, data) => await Deno.writeTextFile(path, data),
  rename: async (from, to) => await Deno.rename(from, to),
  remove: async (path) => await Deno.remove(path),
  openLock: async (path) =>
    await Deno.open(path, {
      write: true,
      createNew: true,
    }),
});

const success = (): HistfileResult => ({ ok: true, value: undefined });

const failure = (error: HistfileError): HistfileResult => ({
  ok: false,
  error,
});

export const createHistfileEditor = (
  deps: HistfileEditorDeps,
): HistfileEditor => {
  const histfilePath = deps.histfilePath ?? Deno.env.get("HISTFILE") ?? null;
  if (!histfilePath) {
    return {
      prune() {
        return Promise.resolve(success());
      },
    };
  }

  const lockPath = deps.lockPath ?? `${histfilePath}.lock`;
  const defaults = defaultDeps();
  const readTextFile = deps.readTextFile ?? defaults.readTextFile;
  const writeTextFile = deps.writeTextFile ?? defaults.writeTextFile;
  const rename = deps.rename ?? defaults.rename;
  const remove = deps.remove ?? defaults.remove;
  const openLock = deps.openLock ?? defaults.openLock;
  const runReload = deps.runReload;

  const withLock = async <T>(
    fn: () => Promise<T>,
  ): Promise<["ok", T] | ["err", HistfileError]> => {
    let lock: Deno.FsFile | null = null;
    try {
      lock = await openLock(lockPath);
    } catch (error) {
      if (error instanceof Deno.errors.AlreadyExists) {
        return ["err", {
          type: "lock",
          message: `histfile lock exists: ${lockPath}`,
          cause: error,
        }];
      }
      return ["err", {
        type: "io",
        message: `failed to acquire histfile lock: ${lockPath}`,
        cause: error,
      }];
    }

    try {
      const result = await fn();
      return ["ok", result];
    } catch (error) {
      return ["err", {
        type: "io",
        message: `failed to modify histfile: ${histfilePath}`,
        cause: error,
      }];
    } finally {
      try {
        lock?.close();
      } catch (_) {
        // ignore close errors
      }
      try {
        await remove(lockPath);
      } catch (_) {
        // ignore removal errors
      }
    }
  };

  const prune = async (entry: HistfileEntry): Promise<HistfileResult> => {
    const [status, value] = await withLock(async () => {
      let text = "";
      try {
        text = await readTextFile(histfilePath);
      } catch (error) {
        if (error instanceof Deno.errors.NotFound) {
          text = "";
        } else {
          throw error;
        }
      }

      const lines = text.split("\n");
      const targetIndex = lines.findIndex((line) => {
        const trimmed = line.trim();
        if (!trimmed.length) {
          return false;
        }
        const delimiter = trimmed.lastIndexOf(";");
        if (delimiter >= 0) {
          return trimmed.slice(delimiter + 1) === entry.command;
        }
        return trimmed === entry.command;
      });

      if (targetIndex >= 0) {
        lines.splice(targetIndex, 1);
      }

      const updated = lines.join("\n");
      const tempPath = `${histfilePath}.tmp-${crypto.randomUUID()}`;
      await writeTextFile(tempPath, updated);
      await rename(tempPath, histfilePath);

      if (runReload) {
        await runReload();
      }
    });

    if (status === "err") {
      return failure(value);
    }

    return success();
  };

  return { prune };
};
