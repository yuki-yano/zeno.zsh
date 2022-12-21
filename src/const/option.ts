import type { FzfOptionBind, FzfOptions } from "../type/fzf.ts";
import {
  GIT_BRANCH_SOURCE,
  GIT_LOG_SOURCE,
  GIT_REFLOG_SOURCE,
  GIT_TAG_SOURCE,
} from "./source.ts";

export const CONVERT_IMPLEMENTED_OPTIONS = [
  "--bind",
  "--expect",
  "--preview",
] as const;

export const DEFAULT_BIND: readonly FzfOptionBind[] = [
  {
    key: "ctrl-d",
    action: "preview-half-page-down",
  },
  {
    key: "ctrl-u",
    action: "preview-half-page-up",
  },
  {
    key: "?",
    action: "toggle-preview",
  },
];

const GIT_BRANCH_LOG_TAG_REFLOG_BIND: readonly FzfOptionBind[] = [
  {
    key: "ctrl-b",
    action: `reload(${GIT_BRANCH_SOURCE})`,
  },
  {
    key: "ctrl-c",
    action: `reload(${GIT_LOG_SOURCE})`,
  },
  {
    key: "ctrl-t",
    action: `reload(${GIT_TAG_SOURCE})`,
  },
  {
    key: "ctrl-r",
    action: `reload(${GIT_REFLOG_SOURCE})`,
  },
];

export const COMMON_OPTIONS: FzfOptions = {
  "--ansi": true,
  "--expect": ["alt-enter"],
  "--height": "'80%'",
  "--print0": true,
};

export const DEFAULT_OPTIONS: FzfOptions = {
  ...COMMON_OPTIONS,
  "--bind": DEFAULT_BIND,
  "--no-separator": true,
};

export const GIT_BRANCH_LOG_TAG_REFLOG_OPTIONS: FzfOptions = {
  ...COMMON_OPTIONS,
  "--bind": GIT_BRANCH_LOG_TAG_REFLOG_BIND,
  "--header": "'C-b: branch, C-c: commit, C-t: tag, C-r: reflog'",
  "--preview-window": "'down'",
};
