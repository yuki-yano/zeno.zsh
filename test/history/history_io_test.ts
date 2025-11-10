import { afterEach, beforeEach, describe, it } from "../deps.ts";
import { assertEquals, assertExists } from "../deps.ts";
import { createHistoryIO } from "../../src/history/io.ts";
import type { HistoryRecord } from "../../src/history/types.ts";

let tempDir: string;

beforeEach(async () => {
  tempDir = await Deno.makeTempDir({ prefix: "history-io-" });
});

afterEach(async () => {
  await Deno.remove(tempDir, { recursive: true });
});

describe("HistoryIO", () => {
  const sampleRecord: HistoryRecord = {
    id: "01HISTORYIO0000000000000000",
    ts: "2024-01-02T00:00:00.000Z",
    command: "echo test",
    exit: 0,
    pwd: "/repo",
    session: "sess",
    host: "host",
    user: "user",
    shell: "zsh",
    repo_root: "/repo",
    deleted_at: null,
    duration_ms: null,
    meta: null,
  };

  it("exports records as NDJSON", async () => {
    const io = createHistoryIO({});
    const outputPath = `${tempDir}/out.ndjson`;

    await io.exportAll({
      format: "ndjson",
      outputPath,
      records: [sampleRecord],
      options: { redacted: false },
    });

    const contents = await Deno.readTextFile(outputPath);
    const parsed = contents.trim().split("\n").map((line) => JSON.parse(line));
    assertEquals(parsed.length, 1);
    assertEquals(parsed[0].id, sampleRecord.id);
  });

  it("imports records from NDJSON", async () => {
    const io = createHistoryIO({});
    const inputPath = `${tempDir}/in.ndjson`;
    const payload = JSON.stringify(sampleRecord);
    await Deno.writeTextFile(inputPath, `${payload}\n`);

    const outcome = await io.importFile({
      format: "ndjson",
      inputPath,
    });

    assertExists(outcome);
    assertEquals(outcome.records.length, 1);
    assertEquals(outcome.records[0].command, sampleRecord.command);
  });

  it("imports records from zsh history", async () => {
    const io = createHistoryIO({});
    const inputPath = `${tempDir}/in.zsh`;
    await Deno.writeTextFile(
      inputPath,
      `: 1700000000:12;echo secret\n: 1700000001:0;ls\n`,
    );

    const outcome = await io.importFile({
      format: "zsh",
      inputPath,
    });

    assertEquals(outcome.records.length, 2);
    assertEquals(outcome.records[0].command, "echo secret");
    assertEquals(outcome.records[0].duration_ms, 12_000);
    assertEquals(outcome.records[0].shell, "zsh");
  });

  it("imports records from atuin json", async () => {
    const io = createHistoryIO({});
    const inputPath = `${tempDir}/in.atuin`;
    const atuinLine = JSON.stringify({
      id: "01ATUIN000000000000000000",
      timestamp: "2024-01-03T00:00:00.000Z",
      command: "git status",
      duration: 42_000_000,
      exit: 0,
      cwd: "/repo",
    });
    await Deno.writeTextFile(inputPath, `${atuinLine}\n`);

    const outcome = await io.importFile({
      format: "atuin-json",
      inputPath,
    });

    assertEquals(outcome.records.length, 1);
    assertEquals(outcome.records[0].id, "01ATUIN000000000000000000");
    assertEquals(outcome.records[0].command, "git status");
    assertEquals(outcome.records[0].duration_ms, 42);
  });
});
