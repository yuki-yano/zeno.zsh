import { describe, it } from "../deps.ts";
import { assertEquals, assertExists, assertStrictEquals } from "../deps.ts";
import { resolveHistoryPositional } from "../../src/command/history-payload.ts";

describe("history positional payload", () => {
  it("returns null for non-history positional args", () => {
    const resolved = resolveHistoryPositional({
      _: ["snippet", "list"],
    });
    assertStrictEquals(resolved, null);
  });

  it("builds history-log payload with cmd precedence", () => {
    const resolved = resolveHistoryPositional({
      _: ["history", "log"],
      cmd: "echo from-cmd",
      command: "echo from-command",
      exit: "0",
      "duration-ms": "12",
    });
    assertExists(resolved);
    assertEquals(resolved.mode, "history-log");
    assertEquals(resolved.inputKey, "historyLog");
    assertEquals(resolved.payload.command, "echo from-cmd");
    assertEquals(resolved.payload.exit, "0");
    assertEquals(resolved.payload.durationMs, "12");
  });

  it("builds history-query payload with aliases", () => {
    const resolved = resolveHistoryPositional({
      _: ["history", "query"],
      scope: "repository",
      "repo-root": "/repo",
      "toggle-scope": true,
    });
    assertExists(resolved);
    assertEquals(resolved.mode, "history-query");
    assertEquals(resolved.inputKey, "historyQuery");
    assertEquals(resolved.payload.scope, "repository");
    assertEquals(resolved.payload.repoRoot, "/repo");
    assertStrictEquals(resolved.payload.toggleScope, true);
  });

  it("builds history-export payload with out alias and redact array", () => {
    const resolved = resolveHistoryPositional({
      _: ["history", "export"],
      format: "ndjson",
      out: "/tmp/out.ndjson",
      redact: "token",
    });
    assertExists(resolved);
    assertEquals(resolved.mode, "history-export");
    assertEquals(resolved.inputKey, "historyExport");
    assertEquals(resolved.payload.outputPath, "/tmp/out.ndjson");
    assertEquals(resolved.payload.redact, ["token"]);
  });

  it("builds history-import payload with in alias and dry-run", () => {
    const resolved = resolveHistoryPositional({
      _: ["history", "import"],
      format: "ndjson",
      in: "/tmp/in.ndjson",
      "dry-run": true,
    });
    assertExists(resolved);
    assertEquals(resolved.mode, "history-import");
    assertEquals(resolved.inputKey, "historyImport");
    assertEquals(resolved.payload.inputPath, "/tmp/in.ndjson");
    assertStrictEquals(resolved.payload.dryRun, true);
  });

  it("builds history-fzf-config payload", () => {
    const resolved = resolveHistoryPositional({
      _: ["history", "fzf-config"],
    });
    assertExists(resolved);
    assertEquals(resolved.mode, "history-fzf-config");
    assertEquals(resolved.inputKey, "historyFzfConfig");
    assertEquals(resolved.payload, {});
  });
});
