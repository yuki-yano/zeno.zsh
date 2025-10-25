import { type BindParameters, Database } from "../deps.ts";
import { path } from "../deps.ts";
import type { HistoryRecord, QueryFilter, QueryResult } from "./types.ts";

export type SQLiteStore = {
  insert(record: HistoryRecord): Promise<void>;
  select(filter: QueryFilter): Promise<QueryResult>;
  selectById(id: string): Promise<HistoryRecord | null>;
  markDeleted(id: string, deletedAt: string): Promise<void>;
  close(): Promise<void>;
};

export type SQLiteStoreConfig = {
  databasePath: string;
};

const ensureDirectory = async (databasePath: string) => {
  const dir = path.dirname(databasePath);
  await Deno.mkdir(dir, { recursive: true });
};

const HISTORY_COLUMNS = [
  "id",
  "ts",
  "command",
  "exit",
  "pwd",
  "session",
  "host",
  "user",
  "shell",
  "repo_root",
  "deleted_at",
  "duration_ms",
  "meta",
] as const;

const buildSelectColumns = () =>
  HISTORY_COLUMNS.map((c) => `h.${c}`).join(", ");

export const createSQLiteStore = async (
  config: SQLiteStoreConfig,
): Promise<SQLiteStore> => {
  await ensureDirectory(config.databasePath);

  const db = new Database(config.databasePath);
  initializeSchema(db);

  const insert = (record: HistoryRecord): Promise<void> => {
    db.exec(
      `
        INSERT INTO history (
          id, ts, command, exit, pwd, session, host, user, shell,
          repo_root, deleted_at, duration_ms, meta
        ) VALUES (
          :id, :ts, :command, :exit, :pwd, :session, :host, :user, :shell,
          :repo_root, :deleted_at, :duration_ms, :meta
        )
      `,
      {
        id: record.id,
        ts: record.ts,
        command: record.command,
        exit: record.exit ?? null,
        pwd: record.pwd ?? null,
        session: record.session ?? null,
        host: record.host ?? null,
        user: record.user ?? null,
        shell: record.shell ?? null,
        repo_root: record.repo_root ?? null,
        deleted_at: record.deleted_at ?? null,
        duration_ms: record.duration_ms ?? null,
        meta: record.meta ? JSON.stringify(record.meta) : null,
      },
    );
    return Promise.resolve();
  };

  const select = (filter: QueryFilter): Promise<QueryResult> => {
    const whereClauses: string[] = [];
    const params: Record<string, unknown> = {
      limit: filter.limit,
    };

    switch (filter.deleted) {
      case "exclude":
        whereClauses.push("h.deleted_at IS NULL");
        break;
      case "only":
        whereClauses.push("h.deleted_at IS NOT NULL");
        break;
      case "include":
      default:
        break;
    }

    switch (filter.scope) {
      case "repository": {
        if (typeof filter.repoRoot === "string" && filter.repoRoot.length > 0) {
          whereClauses.push("h.repo_root = :repo_root");
          params.repo_root = filter.repoRoot;
        } else if (filter.repoRoot === null) {
          whereClauses.push("h.repo_root IS NULL");
        } else {
          whereClauses.push("1 = 0");
        }
        break;
      }
      case "directory": {
        if (
          typeof filter.directory === "string" && filter.directory.length > 0
        ) {
          whereClauses.push("h.pwd = :directory");
          params.directory = filter.directory;
        } else {
          whereClauses.push("1 = 0");
        }
        break;
      }
      case "session": {
        if (
          typeof filter.sessionId === "string" && filter.sessionId.length > 0
        ) {
          whereClauses.push("h.session = :session");
          params.session = filter.sessionId;
        } else {
          whereClauses.push("1 = 0");
        }
        break;
      }
      case "global": {
        // no additional clause
        break;
      }
    }

    if (filter.term) {
      whereClauses.push("h.command LIKE :term");
      params.term = `%${filter.term}%`;
    }

    if (filter.after) {
      whereClauses.push("h.ts >= :after");
      params.after = filter.after;
    }

    if (filter.before) {
      whereClauses.push("h.ts <= :before");
      params.before = filter.before;
    }

    if (typeof filter.exitCode === "number") {
      whereClauses.push("h.exit = :exit");
      params.exit = filter.exitCode;
    }

    const where = whereClauses.length
      ? `WHERE ${whereClauses.join(" AND ")}`
      : "";

    const rows = db.prepare(
      `
        SELECT ${buildSelectColumns()}
        FROM history h
        ${where}
        ORDER BY h.ts DESC
        LIMIT :limit
      `,
    ).all(params as BindParameters) as Record<string, unknown>[];

    return Promise.resolve({
      items: rows.map(mapRowToRecord),
    });
  };

  const selectById = (id: string): Promise<HistoryRecord | null> => {
    const row = db.prepare(
      `
        SELECT ${buildSelectColumns()}
        FROM history h
        WHERE h.id = :id
        LIMIT 1
      `,
    ).all({ id } as BindParameters)[0] as Record<string, unknown> | undefined;

    if (!row) {
      return Promise.resolve(null);
    }

    return Promise.resolve(mapRowToRecord(row));
  };

  const markDeleted = (id: string, deletedAt: string): Promise<void> => {
    db.exec(
      `
        UPDATE history
        SET deleted_at = :deleted_at
        WHERE id = :id
      `,
      { id, deleted_at: deletedAt },
    );
    return Promise.resolve();
  };

  const close = (): Promise<void> => {
    db.close();
    return Promise.resolve();
  };

  return {
    insert,
    select,
    selectById,
    markDeleted,
    close,
  };
};

const initializeSchema = (db: Database) => {
  db.exec("pragma journal_mode = WAL");
  db.exec("pragma synchronous = NORMAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS history (
      id TEXT PRIMARY KEY,
      ts TEXT NOT NULL,
      command TEXT NOT NULL,
      exit INTEGER,
      pwd TEXT,
      session TEXT,
      host TEXT,
      user TEXT,
      shell TEXT NOT NULL,
      repo_root TEXT,
      deleted_at TEXT,
      duration_ms INTEGER,
      meta JSON
    )
  `);
  db.exec("CREATE INDEX IF NOT EXISTS idx_history_ts ON history(ts DESC)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_history_repo ON history(repo_root)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_history_pwd ON history(pwd)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_history_session ON history(session)");
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_history_deleted ON history(deleted_at)",
  );
};

const mapRowToRecord = (row: Record<string, unknown>): HistoryRecord => ({
  id: String(row.id),
  ts: String(row.ts),
  command: String(row.command),
  exit: row.exit == null ? null : Number(row.exit),
  pwd: (row.pwd ?? null) as string | null,
  session: (row.session ?? null) as string | null,
  host: (row.host ?? null) as string | null,
  user: (row.user ?? null) as string | null,
  shell: (row.shell ?? null) as string | null,
  repo_root: (row.repo_root ?? null) as string | null,
  deleted_at: (row.deleted_at ?? null) as string | null,
  duration_ms: row.duration_ms == null ? null : Number(row.duration_ms),
  meta: parseMeta(row.meta),
});

const parseMeta = (
  meta: unknown,
): Record<string, unknown> | null => {
  if (meta == null) {
    return null;
  }

  if (typeof meta === "object" && !Array.isArray(meta)) {
    return meta as Record<string, unknown>;
  }

  if (typeof meta === "string" && meta.length > 0) {
    try {
      return JSON.parse(meta) as Record<string, unknown>;
    } catch (_error) {
      return { raw: meta };
    }
  }

  return null;
};
