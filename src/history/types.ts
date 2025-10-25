export type HistoryScope = "global" | "repository" | "directory" | "session";

export type HistoryRecord = {
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
};

export type LogCommandInput = {
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
};

export type DeletedFilter = "exclude" | "include" | "only";

export type DeleteRequest = {
  id: string;
  hard: boolean;
};

export type ExportFormat =
  | "ndjson"
  | "zsh"
  | "bash"
  | "fish"
  | "atuin-json";

export type ExportRequest = HistoryQueryRequest & {
  format: ExportFormat;
  outputPath: string;
};

export type DedupeStrategy = "off" | "strict" | "loose";

export type ImportRequest = {
  format: ExportFormat;
  inputPath: string;
  dedupe: DedupeStrategy;
  dryRun: boolean;
};

export type ImportSummary = {
  added: number;
  skipped: number;
  total: number;
};

export type QueryFilter = {
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
};

export type QueryResult = {
  items: HistoryRecord[];
};

export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export type HistoryErrorType = "validation" | "io" | "histfile" | "unsupported";

export type HistoryError = {
  type: HistoryErrorType;
  message: string;
  cause?: unknown;
};

export type HistoryQueryRequest = {
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
};

export type HistoryModule = {
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
};
