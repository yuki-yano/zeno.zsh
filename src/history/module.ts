import type { RepoFinder } from "./repo-finder.ts";
import type { Redactor } from "./redactor.ts";
import type { SQLiteStore } from "./sqlite-store.ts";
import {
  createIoHistoryError,
  createUnsupportedHistoryError,
  mapHistfileErrorToHistoryError,
} from "./error-utils.ts";
import { buildHistoryQueryFilter } from "./query-filter.ts";
import type {
  DeleteRequest,
  ExportRequest,
  HistoryError,
  HistoryModule,
  HistoryQueryRequest,
  HistoryRecord,
  ImportRequest,
  ImportSummary,
  LogCommandInput,
  QueryResult,
  Result,
} from "./types.ts";
import type { HistfileEditor, HistfileEntry } from "./histfile-editor.ts";
import type { ExportAllArgs, HistoryIO, ImportOutcome } from "./io.ts";

export type HistoryModuleDeps = {
  store: SQLiteStore;
  repoFinder: RepoFinder;
  redactor: Redactor;
  histfileEditor: HistfileEditor;
  historyIO: HistoryIO;
  now: () => string;
};

const ok = <T>(value: T): Result<T, HistoryError> => ({
  ok: true,
  value,
});

const err = (error: HistoryError): Result<never, HistoryError> => ({
  ok: false,
  error,
});

const sanitizeCommand = (redactor: Redactor, command: string): string =>
  redactor.applyAll(command);

const resolveRepository = async (
  repoFinder: RepoFinder,
  pwd: string | null,
): Promise<string | null> => {
  if (!pwd) {
    return null;
  }
  try {
    return await repoFinder.resolve(pwd);
  } catch (_error) {
    return null;
  }
};

const createHistoryRecord = (
  input: LogCommandInput,
  command: string,
  repoRoot: string | null,
): HistoryRecord => ({
  id: input.id,
  ts: input.ts,
  command,
  exit: Number.isInteger(input.exit) ? input.exit : null,
  pwd: input.pwd ?? null,
  session: input.session ?? null,
  host: input.host ?? null,
  user: input.user ?? null,
  shell: input.shell ?? null,
  repo_root: repoRoot,
  deleted_at: null,
  duration_ms: input.duration_ms ?? null,
  meta: input.meta ?? null,
});

const validateLogInput = (
  input: LogCommandInput,
): HistoryError | undefined => {
  if (!input.command || input.command.length === 0) {
    return {
      type: "validation",
      message: "command must be a non-empty string",
    };
  }

  if (!input.ts || input.ts.length === 0) {
    return {
      type: "validation",
      message: "ts must be provided",
    };
  }

  if (!input.shell || input.shell.length === 0) {
    return {
      type: "validation",
      message: "shell must be provided",
    };
  }

  return undefined;
};

export const createHistoryModule = (
  deps: HistoryModuleDeps,
): HistoryModule => {
  const { repoFinder, redactor, store, histfileEditor, historyIO } = deps;

  const logCommand = async (
    input: LogCommandInput,
  ): Promise<Result<void, HistoryError>> => {
    const validationError = validateLogInput(input);
    if (validationError) {
      return err(validationError);
    }

    const redacted = sanitizeCommand(redactor, input.command);
    const repoRoot = input.repo_root ?? await resolveRepository(
      repoFinder,
      input.pwd ?? null,
    );
    const record = createHistoryRecord(input, redacted, repoRoot);

    try {
      await store.insert(record);
      return ok(undefined);
    } catch (error) {
      return err(
        createIoHistoryError("failed to insert history record", error),
      );
    }
  };

  const setRedactPatterns = (patterns: RegExp[]) => {
    redactor.setPatterns(patterns);
  };

  const queryHistory = async (
    request: HistoryQueryRequest,
  ): Promise<Result<QueryResult, HistoryError>> => {
    if (request.id && request.id.length > 0) {
      try {
        const byId = await store.selectById(request.id);
        return ok({
          items: byId ? [byId] : [],
        });
      } catch (error) {
        return err(createIoHistoryError("failed to load history by id", error));
      }
    }

    const filter = await buildHistoryQueryFilter(request, repoFinder);
    if (filter === "invalid") {
      return ok({ items: [] });
    }

    try {
      const result = await store.select(filter);
      return ok(result);
    } catch (error) {
      return err(createIoHistoryError("failed to query history", error));
    }
  };

  const deleteHistory = async (
    request: DeleteRequest,
  ): Promise<Result<void, HistoryError>> => {
    if (!request.id || request.id.length === 0) {
      return err({
        type: "validation",
        message: "id is required",
      });
    }

    let record: HistoryRecord | null;
    try {
      record = await store.selectById(request.id);
    } catch (error) {
      return err(
        createIoHistoryError("failed to lookup history record", error),
      );
    }

    if (!record) {
      return err({
        type: "validation",
        message: `history record not found: ${request.id}`,
      });
    }

    const deletedAt = deps.now();
    try {
      await store.markDeleted(request.id, deletedAt);
    } catch (error) {
      return err(
        createIoHistoryError("failed to mark history record deleted", error),
      );
    }

    if (request.hard) {
      const entry: HistfileEntry = {
        command: sanitizeCommand(redactor, record.command ?? ""),
      };
      const result = await histfileEditor.prune(entry);
      if (!result.ok) {
        return err(mapHistfileErrorToHistoryError(result.error));
      }
    }

    return ok(undefined);
  };

  const exportHistory = async (
    request: ExportRequest,
  ): Promise<Result<void, HistoryError>> => {
    const filter = await buildHistoryQueryFilter(request, repoFinder);
    if (filter === "invalid") {
      return ok(undefined);
    }

    let result: QueryResult;
    try {
      result = await store.select(filter);
    } catch (error) {
      return err(
        createIoHistoryError("failed to query history for export", error),
      );
    }

    const redactedRecords = result.items.map((record) => ({
      ...record,
      command: sanitizeCommand(redactor, record.command ?? ""),
    }));

    const payload: ExportAllArgs = {
      format: request.format,
      outputPath: request.outputPath,
      records: redactedRecords,
      options: { redacted: true },
    };

    try {
      await historyIO.exportAll(payload);
      return ok(undefined);
    } catch (error) {
      return err(
        createUnsupportedHistoryError("failed to export history", error),
      );
    }
  };

  const importHistory = async (
    request: ImportRequest,
  ): Promise<Result<ImportSummary, HistoryError>> => {
    let outcome: ImportOutcome;
    try {
      outcome = await historyIO.importFile({
        format: request.format,
        inputPath: request.inputPath,
      });
    } catch (error) {
      return err(
        createUnsupportedHistoryError("failed to import history", error),
      );
    }

    if (request.dryRun) {
      return ok({
        added: 0,
        skipped: outcome.summary.total,
        total: outcome.summary.total,
      });
    }

    let added = 0;
    let skipped = 0;

    for (const record of outcome.records) {
      let skipRecord = false;

      if (request.dedupe === "strict" || request.dedupe === "loose") {
        try {
          const existing = await store.selectById(record.id);
          if (existing) {
            skipRecord = true;
            skipped += 1;
          }
        } catch (error) {
          return err(createIoHistoryError("failed to check duplicates", error));
        }
      }

      if (skipRecord) {
        continue;
      }

      const toInsert: HistoryRecord = {
        ...record,
        command: sanitizeCommand(redactor, record.command ?? ""),
      };

      if (!toInsert.command || toInsert.command.length === 0) {
        skipped += 1;
        continue;
      }

      try {
        await store.insert(toInsert);
        added += 1;
      } catch (error) {
        return err(
          createIoHistoryError("failed to insert imported record", error),
        );
      }
    }

    const summary: ImportSummary = {
      added,
      skipped,
      total: outcome.summary.total,
    };

    return ok(summary);
  };

  return {
    logCommand,
    setRedactPatterns,
    queryHistory,
    deleteHistory,
    exportHistory,
    importHistory,
  };
};
