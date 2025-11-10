export type HistfileEntry = {
  command: string;
};

export type HistfileErrorType = "lock" | "io";

export type HistfileError = {
  type: HistfileErrorType;
  message: string;
  cause?: unknown;
};

export type HistfileResult =
  | { ok: true; value: void }
  | { ok: false; error: HistfileError };

export type HistfileEditor = {
  prune(entry: HistfileEntry): Promise<HistfileResult>;
};

type HistfileEditorDeps = {
  histfilePath?: string | null;
  lockPath?: string;
  normalizeForMatch?: (value: string) => string;
  generateId?: () => string;
  readTextFile?: (path: string) => Promise<string>;
  writeTextFile?: (path: string, data: string) => Promise<void>;
  rename?: (from: string, to: string) => Promise<void>;
  remove?: (path: string) => Promise<void>;
  openLock?: (path: string) => Promise<Deno.FsFile>;
  stat?: (path: string) => Promise<Deno.FileInfo>;
  chmod?: (path: string, mode: number) => Promise<void>;
  runReload?: () => Promise<void>;
};

const defaultDeps = (): Required<
  Omit<
    HistfileEditorDeps,
    "histfilePath" | "lockPath" | "runReload" | "normalizeForMatch"
  >
> => ({
  generateId: () => crypto.randomUUID(),
  readTextFile: async (path) => await Deno.readTextFile(path),
  writeTextFile: async (path, data) => await Deno.writeTextFile(path, data),
  rename: async (from, to) => await Deno.rename(from, to),
  remove: async (path) => await Deno.remove(path),
  openLock: async (path) =>
    await Deno.open(path, {
      write: true,
      createNew: true,
    }),
  stat: async (path) => await Deno.stat(path),
  chmod: async (path, mode) => await Deno.chmod(path, mode),
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
  const generateId = deps.generateId ?? defaults.generateId;
  const stat = deps.stat ?? defaults.stat;
  const chmod = deps.chmod ?? defaults.chmod;
  const normalize = deps.normalizeForMatch ??
    ((value: string): string => value);
  const runReload = deps.runReload;

  const extractCommand = (line: string): string | null => {
    const trimmed = line.trim();
    if (!trimmed.length) {
      return null;
    }
    if (trimmed.startsWith(":")) {
      const separator = trimmed.indexOf(";");
      if (separator >= 0) {
        return trimmed.slice(separator + 1);
      }
    }
    return trimmed;
  };

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
      const target = normalize(entry.command);
      let targetIndex = -1;
      for (let index = lines.length - 1; index >= 0; index--) {
        const candidate = extractCommand(lines[index]);
        if (candidate == null) {
          continue;
        }
        if (normalize(candidate) === target) {
          targetIndex = index;
          break;
        }
      }

      if (targetIndex >= 0) {
        lines.splice(targetIndex, 1);
      }

      const updated = lines.join("\n");
      let tempPath: string | null = null;
      try {
        tempPath = `${histfilePath}.tmp-${generateId()}`;
        await writeTextFile(tempPath, updated);
        let desiredMode = 0o600;
        try {
          const info = await stat(histfilePath);
          if (info.mode != null) {
            desiredMode = info.mode;
          }
        } catch (error) {
          if (!(error instanceof Deno.errors.NotFound)) {
            throw error;
          }
        }
        try {
          await chmod(tempPath, desiredMode);
        } catch (_error) {
          // Continue even if chmod is not supported in the runtime environment.
        }
        await rename(tempPath, histfilePath);
        tempPath = null;
      } finally {
        if (tempPath != null) {
          try {
            await remove(tempPath);
          } catch (_error) {
            // Ignore cleanup errors and leave removal to the host environment.
          }
        }
      }

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
