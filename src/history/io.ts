import type { ExportFormat, HistoryRecord, ImportSummary } from "./types.ts";

export type ExportAllArgs = {
  format: ExportFormat;
  outputPath: string;
  records: HistoryRecord[];
  options?: {
    redacted?: boolean;
  };
};

export type ImportFileArgs = {
  format: ExportFormat;
  inputPath: string;
};

export type ImportOutcome = {
  records: HistoryRecord[];
  summary: ImportSummary;
};

export type HistoryIO = {
  exportAll(args: ExportAllArgs): Promise<void>;
  importFile(args: ImportFileArgs): Promise<ImportOutcome>;
};

type HistoryIODependencies = {
  readTextFile?: (path: string) => Promise<string>;
  writeTextFile?: (path: string, data: string) => Promise<void>;
};

const defaults = (): Required<HistoryIODependencies> => ({
  readTextFile: async (path: string) => await Deno.readTextFile(path),
  writeTextFile: async (path: string, data: string) =>
    await Deno.writeTextFile(path, data),
});

const formatEpoch = (iso: string): number => {
  const date = new Date(iso);
  const value = Math.floor(date.getTime() / 1000);
  return Number.isFinite(value) ? value : 0;
};

const serializeZshLine = (record: HistoryRecord): string => {
  const epoch = formatEpoch(record.ts);
  const duration = record.duration_ms != null
    ? Math.max(Math.floor(record.duration_ms / 1000), 0)
    : 0;
  return `: ${epoch}:${duration};${record.command}`;
};

const serializeFishEntry = (record: HistoryRecord): string => {
  const epoch = formatEpoch(record.ts);
  const escaped = record.command.replace(/"/g, '\\"');
  return `- cmd: "${escaped}"\n  when: ${epoch}`;
};

const serializeAtuin = (record: HistoryRecord): string => {
  const payload = {
    id: record.id,
    timestamp: record.ts,
    duration: record.duration_ms ?? 0,
    exit: record.exit ?? 0,
    command: record.command,
    cwd: record.pwd,
  };
  return JSON.stringify(payload);
};

const toHistoryRecord = (
  candidate: Record<string, unknown>,
): HistoryRecord => ({
  id: String(candidate.id ?? crypto.randomUUID()),
  ts: String(candidate.ts ?? new Date().toISOString()),
  command: String(candidate.command ?? ""),
  exit: candidate.exit == null ? null : Number(candidate.exit),
  pwd: (candidate.pwd ?? null) as string | null,
  session: (candidate.session ?? null) as string | null,
  host: (candidate.host ?? null) as string | null,
  user: (candidate.user ?? null) as string | null,
  shell: (candidate.shell ?? "zsh") as string | null,
  repo_root: (candidate.repo_root ?? null) as string | null,
  deleted_at: (candidate.deleted_at ?? null) as string | null,
  duration_ms: candidate.duration_ms == null
    ? null
    : Number(candidate.duration_ms),
  meta: candidate.meta && typeof candidate.meta === "object"
    ? candidate.meta as Record<string, unknown>
    : null,
});

const parseZshLine = (line: string): HistoryRecord | null => {
  const match = line.match(/^:\s*(\d+):(\d+);(.*)$/);
  if (!match) {
    return null;
  }

  const [, epochRaw, durationRaw, command] = match;
  const epoch = Number.parseInt(epochRaw, 10);
  const duration = Number.parseInt(durationRaw, 10);

  if (!Number.isFinite(epoch)) {
    return null;
  }

  const ts = new Date(epoch * 1000).toISOString();

  return {
    id: crypto.randomUUID(),
    ts,
    command,
    exit: null,
    pwd: null,
    session: null,
    host: null,
    user: null,
    shell: "zsh",
    repo_root: null,
    deleted_at: null,
    duration_ms: Number.isFinite(duration)
      ? Math.max(duration, 0) * 1000
      : null,
    meta: null,
  };
};

const parseAtuinJsonLine = (line: string): HistoryRecord => {
  const data = JSON.parse(line) as Record<string, unknown>;
  const timestamp = typeof data.timestamp === "string"
    ? data.timestamp
    : new Date().toISOString();

  return {
    id: typeof data.id === "string" ? data.id : crypto.randomUUID(),
    ts: timestamp,
    command: String(data.command ?? ""),
    exit: data.exit == null ? null : Number(data.exit),
    pwd: typeof data.cwd === "string" ? data.cwd : null,
    session: null,
    host: null,
    user: null,
    shell: typeof data.shell === "string" ? data.shell : "zsh",
    repo_root: null,
    deleted_at: null,
    duration_ms: data.duration == null ? null : Number(data.duration),
    meta: null,
  };
};

export const createHistoryIO = (
  deps: HistoryIODependencies,
): HistoryIO => {
  const { readTextFile, writeTextFile } = { ...defaults(), ...deps };

  const exportAll = async (args: ExportAllArgs) => {
    const { format, outputPath, records } = args;
    let payload = "";

    switch (format) {
      case "ndjson":
        payload = records.map((record) => JSON.stringify(record)).join("\n");
        break;
      case "zsh":
      case "bash":
        payload = records.map(serializeZshLine).join("\n");
        break;
      case "fish":
        payload = records.map(serializeFishEntry).join("\n");
        break;
      case "atuin-json":
        payload = records.map(serializeAtuin).join("\n");
        break;
      default:
        throw new Error(`unsupported export format: ${format}`);
    }

    await writeTextFile(
      outputPath,
      payload + (payload.endsWith("\n") ? "" : "\n"),
    );
  };

  const importFile = async (args: ImportFileArgs): Promise<ImportOutcome> => {
    const { format, inputPath } = args;
    const text = await readTextFile(inputPath);
    const lines = text.split(/\n+/).filter((line) => line.length > 0);

    let records: HistoryRecord[] = [];

    switch (format) {
      case "ndjson": {
        records = lines.map((line) => toHistoryRecord(JSON.parse(line)));
        break;
      }
      case "zsh":
      case "bash": {
        records = lines
          .map(parseZshLine)
          .filter((record): record is HistoryRecord => record != null);
        break;
      }
      case "atuin-json": {
        records = lines.map((line) => parseAtuinJsonLine(line));
        break;
      }
      default:
        throw new Error(`unsupported import format: ${format}`);
    }

    const summary: ImportSummary = {
      added: records.length,
      skipped: 0,
      total: records.length,
    };

    return { records, summary };
  };

  return {
    exportAll,
    importFile,
  };
};
