export type HistoryScope = "global" | "repository" | "directory" | "session";

export interface HistoryRecord {
  id: string;
  ts: string;
  command: string;
  exit: number | null;
  pwd: string | null;
  session: string | null;
  host: string | null;
  user: string | null;
  shell: string | null;
  repo_root: string | null;
  deleted_at: string | null;
  duration_ms: number | null;
  meta: Record<string, unknown> | null;
}

export interface LogCommandInput {
  id: string;
  ts: string;
  command: string;
  exit: number;
  pwd: string | null;
  session: string | null;
  host: string | null;
  user: string | null;
  shell: string;
  repo_root: string | null;
  duration_ms: number | null;
  meta: Record<string, unknown> | null;
}

export type DeletedFilter = "exclude" | "include" | "only";

export interface DeleteRequest {
  id: string;
  hard: boolean;
}

export type ExportFormat =
  | "ndjson"
  | "zsh"
  | "bash"
  | "fish"
  | "atuin-json";

export interface ExportRequest extends HistoryQueryRequest {
  format: ExportFormat;
  outputPath: string;
}

export type DedupeStrategy = "off" | "strict" | "loose";

export interface ImportRequest {
  format: ExportFormat;
  inputPath: string;
  dedupe: DedupeStrategy;
  dryRun: boolean;
}

export interface ImportSummary {
  added: number;
  skipped: number;
  total: number;
}

export interface QueryFilter {
  scope: HistoryScope;
  limit: number;
  deleted: DeletedFilter;
  repoRoot?: string | null;
  directory?: string | null;
  sessionId?: string | null;
  term?: string | null;
  after?: string | null;
  before?: string | null;
  exitCode?: number | null;
}

export interface QueryResult {
  items: HistoryRecord[];
}

export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export type HistoryErrorType = "validation" | "io" | "histfile" | "unsupported";

export interface HistoryError {
  type: HistoryErrorType;
  message: string;
  cause?: unknown;
}

export interface HistoryQueryRequest {
  scope: HistoryScope;
  limit: number;
  deleted: DeletedFilter;
  cwd?: string | null;
  repoRoot?: string | null;
  directory?: string | null;
  sessionId?: string | null;
  term?: string | null;
  after?: string | null;
  before?: string | null;
  exitCode?: number | null;
  id?: string | null;
}

export interface HistoryModule {
  logCommand(input: LogCommandInput): Promise<Result<void, HistoryError>>;
  setRedactPatterns(patterns: RegExp[]): void;
  queryHistory(
    request: HistoryQueryRequest,
  ): Promise<Result<QueryResult, HistoryError>>;
  deleteHistory(request: DeleteRequest): Promise<Result<void, HistoryError>>;
  exportHistory(request: ExportRequest): Promise<Result<void, HistoryError>>;
  importHistory(
    request: ImportRequest,
  ): Promise<Result<ImportSummary, HistoryError>>;
}
