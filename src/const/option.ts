import {
  GIT_BRANCH_SOURCE,
  GIT_LOG_SOURCE,
  GIT_REFLOG_SOURCE,
  GIT_TAG_SOURCE,
} from "./source.ts";

export const CONVERT_IMPLEMENTED_OPTION = ["--bind", "--expect", "--preview"];

export const DEFAULT_BIND = [
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
] as const;

const GIT_BRANCH_LOG_TAG_REFLOG_BIND = [
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

export const DEFAULT_OPTIONS = {
  "--ansi": true,
  "--bind": DEFAULT_BIND,
  "--expect": ["alt-enter"],
  "--height": "'80%'",
} as const;

export const GIT_BRANCH_LOG_TAG_REFLOG_OPTIONS = {
  "--ansi": true,
  "--bind": GIT_BRANCH_LOG_TAG_REFLOG_BIND,
  "--expect": ["alt-enter"],
  "--height": "'80%'",
  "--header": "'C-b: branch, C-c: commit, C-t: tag, C-r: reflog'",
  "--preview-window": "'down'"
} as const;
