import type { HistoryScope } from "../history/types.ts";
import type {
  HistoryKeymapSettings,
  HistorySettings,
} from "../type/settings.ts";

const HISTORY_META = Symbol("historyMeta");

export type HistoryMeta = {
  defaultScopeProvided: boolean;
  keymapProvided: Partial<Record<keyof HistoryKeymapSettings, boolean>>;
  redactProvided: boolean;
};

export type HistoryAccumulatorState = {
  settings: HistorySettings;
  meta: HistoryMeta;
};

const HISTORY_SCOPES: readonly HistoryScope[] = [
  "global",
  "repository",
  "directory",
  "session",
] as const;

const isHistoryScope = (value: unknown): value is HistoryScope =>
  typeof value === "string" &&
  HISTORY_SCOPES.includes(value as HistoryScope);

export const createHistoryAccumulatorState = (): HistoryAccumulatorState => ({
  settings: createDefaultHistorySettings(),
  meta: {
    defaultScopeProvided: false,
    keymapProvided: {},
    redactProvided: false,
  },
});

export const createDefaultHistorySettings = (): HistorySettings => ({
  defaultScope: "global",
  redact: [],
  keymap: {
    deleteSoft: "ctrl-d",
    deleteHard: "alt-d",
    toggleScope: "ctrl-r",
  },
  fzfCommand: undefined,
  fzfOptions: undefined,
});

const cloneMeta = (meta: HistoryMeta): HistoryMeta => ({
  defaultScopeProvided: meta.defaultScopeProvided,
  keymapProvided: { ...meta.keymapProvided },
  redactProvided: meta.redactProvided,
});

const attachHistoryMeta = (
  history: HistorySettings,
  meta: HistoryMeta,
): HistorySettings => {
  Object.defineProperty(history, HISTORY_META, {
    value: meta,
    enumerable: false,
    configurable: false,
  });
  return history;
};

export const getHistoryMeta = (
  history: HistorySettings,
): HistoryMeta | undefined =>
  (history as HistorySettings & { [HISTORY_META]?: HistoryMeta })[HISTORY_META];

export const cloneHistorySettings = (
  history: HistorySettings,
): HistorySettings => {
  const meta = getHistoryMeta(history);
  const cloned: HistorySettings = {
    defaultScope: history.defaultScope,
    redact: history.redact.slice(),
    keymap: {
      deleteSoft: history.keymap.deleteSoft,
      deleteHard: history.keymap.deleteHard,
      toggleScope: history.keymap.toggleScope,
    },
    fzfCommand: history.fzfCommand,
    fzfOptions: history.fzfOptions ? [...history.fzfOptions] : undefined,
  };
  return meta ? attachHistoryMeta(cloned, cloneMeta(meta)) : cloned;
};

export const parseHistoryConfig = (raw: unknown): HistorySettings => {
  const defaults = createDefaultHistorySettings();
  const meta: HistoryMeta = {
    defaultScopeProvided: false,
    keymapProvided: {},
    redactProvided: false,
  };

  let defaultScope = defaults.defaultScope;
  const mutableKeymap: Record<keyof HistoryKeymapSettings, string> = {
    deleteSoft: defaults.keymap.deleteSoft,
    deleteHard: defaults.keymap.deleteHard,
    toggleScope: defaults.keymap.toggleScope,
  };
  let redact: (string | RegExp)[] = [];
  let fzfCommand = defaults.fzfCommand;
  let fzfOptions = defaults.fzfOptions ? [...defaults.fzfOptions] : undefined;

  if (raw && typeof raw === "object") {
    const data = raw as Record<string, unknown>;

    if (isHistoryScope(data.defaultScope)) {
      defaultScope = data.defaultScope;
      meta.defaultScopeProvided = true;
    }

    const rawKeymap = data.keymap;
    if (
      rawKeymap && typeof rawKeymap === "object" && !Array.isArray(rawKeymap)
    ) {
      const source = rawKeymap as Record<string, unknown>;
      const keys: (keyof HistoryKeymapSettings)[] = [
        "deleteSoft",
        "deleteHard",
        "toggleScope",
      ];
      for (const key of keys) {
        const value = source[key];
        if (typeof value === "string" && value.length > 0) {
          mutableKeymap[key] = value;
          meta.keymapProvided[key] = true;
        }
      }
    }

    const rawRedact = data.redact;
    if (Array.isArray(rawRedact)) {
      meta.redactProvided = true;
      redact = rawRedact.map((entry) =>
        entry instanceof RegExp ? entry : String(entry)
      );
    }

    if (typeof data.fzfCommand === "string" && data.fzfCommand.length > 0) {
      fzfCommand = data.fzfCommand;
    }
    if (Array.isArray(data.fzfOptions)) {
      fzfOptions = data.fzfOptions
        .map((value) => (typeof value === "string" ? value : String(value)))
        .filter((value) => value.length > 0);
    }
  }

  const history: HistorySettings = {
    defaultScope,
    redact: meta.redactProvided ? redact : [],
    keymap: mutableKeymap as HistoryKeymapSettings,
    fzfCommand,
    fzfOptions,
  };

  return attachHistoryMeta(history, meta);
};

export const accumulateHistorySettings = (
  state: HistoryAccumulatorState,
  incoming: HistorySettings,
): HistoryAccumulatorState => {
  const meta = getHistoryMeta(incoming);
  let defaultScope = state.settings.defaultScope;
  let redactList = state.settings.redact.slice();
  const mutableKeymap: Record<keyof HistoryKeymapSettings, string> = {
    deleteSoft: state.settings.keymap.deleteSoft,
    deleteHard: state.settings.keymap.deleteHard,
    toggleScope: state.settings.keymap.toggleScope,
  };
  const nextMeta: HistoryMeta = {
    defaultScopeProvided: state.meta.defaultScopeProvided,
    keymapProvided: { ...state.meta.keymapProvided },
    redactProvided: state.meta.redactProvided,
  };

  if (meta?.defaultScopeProvided) {
    defaultScope = incoming.defaultScope;
    nextMeta.defaultScopeProvided = true;
  }

  const keymapFlags = meta?.keymapProvided ?? {};
  (["deleteSoft", "deleteHard", "toggleScope"] as const).forEach((key) => {
    if (keymapFlags[key]) {
      mutableKeymap[key] = incoming.keymap[key];
      nextMeta.keymapProvided[key] = true;
    }
  });

  if (meta?.redactProvided) {
    redactList = redactList.concat(incoming.redact);
    nextMeta.redactProvided = true;
  }

  return {
    settings: {
      defaultScope,
      redact: redactList,
      keymap: mutableKeymap as HistoryKeymapSettings,
      fzfCommand: incoming.fzfCommand ?? state.settings.fzfCommand,
      fzfOptions: incoming.fzfOptions ?? state.settings.fzfOptions,
    },
    meta: nextMeta,
  };
};

export const finalizeHistorySettings = (
  state: HistoryAccumulatorState,
): HistorySettings =>
  attachHistoryMeta(
    {
      defaultScope: state.settings.defaultScope,
      redact: state.settings.redact.slice(),
      keymap: {
        deleteSoft: state.settings.keymap.deleteSoft,
        deleteHard: state.settings.keymap.deleteHard,
        toggleScope: state.settings.keymap.toggleScope,
      },
      fzfCommand: state.settings.fzfCommand,
      fzfOptions: state.settings.fzfOptions
        ? [...state.settings.fzfOptions]
        : undefined,
    },
    cloneMeta(state.meta),
  );
