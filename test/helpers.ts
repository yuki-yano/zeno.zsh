import type {
  HistorySettings,
  Settings,
  Snippet,
  UserCompletionSource,
} from "../src/type/settings.ts";

export class Helper {
  _envs: { [index: string]: string } = {};
  _tempDir: string | undefined;

  constructor() {
    this.saveEnvs();
  }

  restoreAll() {
    this.restoreEnvs();
    this.removeTempDir();
  }

  saveEnvs() {
    this._envs = Deno.env.toObject();
  }

  restoreEnvs() {
    for (const [name, value] of Object.entries(this._envs)) {
      Deno.env.set(name, value);
    }
  }

  getTempDir() {
    if (this._tempDir === undefined) {
      this._tempDir = Deno.makeTempDirSync();
    }
    return this._tempDir;
  }

  removeTempDir() {
    if (this._tempDir !== undefined) {
      Deno.removeSync(this._tempDir, { recursive: true });
      this._tempDir = undefined;
    }
  }
}

export const parametrize = <T extends unknown>(
  params: Array<T>,
  test: (param: T, index: number) => void,
) => {
  params.forEach(test);
};

export const createTestHistorySettings = (): HistorySettings => ({
  defaultScope: "global",
  redact: [],
  keymap: {
    deleteSoft: "ctrl-d",
    deleteHard: "alt-d",
    toggleScope: "ctrl-r",
    togglePreview: "?",
  },
  fzfCommand: undefined,
  fzfOptions: undefined,
});

export const withHistoryDefaults = (
  value: {
    snippets: readonly Snippet[];
    completions: readonly UserCompletionSource[];
  },
): Settings => ({
  snippets: value.snippets,
  completions: value.completions,
  history: createTestHistorySettings(),
});
