import {
  DEFAULT_OPTIONS,
  GIT_BRANCH_LOG_TAG_REFLOG_OPTIONS,
} from "../../const/option.ts";
import {
  GIT_BRANCH_LOG_TAG_REFLOG_PREVIEW,
  GIT_LOG_PREVIEW,
  GIT_STATUS_PREVIEW,
} from "../../const/preview.ts";
import {
  GIT_BRANCH_LOG_TAG_REFLOG_CALLBACK,
  GIT_BRANCH_SOURCE,
  GIT_LOG_SOURCE,
  GIT_STATUS_CALLBACK,
  GIT_STATUS_SOURCE,
} from "../../const/source.ts";
import type { CompletionSource } from "../../type/fzf.ts";

export const gitSources: Array<CompletionSource> = [
  {
    name: "git add",
    patterns: [
      /^git add $/,
      /^git add( -p| --patch) $/,
    ],
    sourceCommand: GIT_STATUS_SOURCE,
    preview: GIT_STATUS_PREVIEW,
    options: {
      ...DEFAULT_OPTIONS,
      "--multi": true,
      "--prompt": "'Git Add Files> '",
    },
    callback: GIT_STATUS_CALLBACK,
  },
  {
    name: "git commit fixup",
    patterns: [/^git commit (--fixup|--squash)\s$/],
    sourceCommand: GIT_LOG_SOURCE,
    preview: GIT_LOG_PREVIEW,
    options: {
      ...DEFAULT_OPTIONS,
      "--prompt": "'Git Fixup> '",
      "--no-sort": true,
    },
    callback: GIT_BRANCH_LOG_TAG_REFLOG_CALLBACK,
  },
  {
    name: "git checkout",
    patterns: [
      /^git checkout $/,
      /^git checkout(( -t)|( --track)) $/,
    ],
    sourceCommand: GIT_BRANCH_SOURCE,
    preview: GIT_BRANCH_LOG_TAG_REFLOG_PREVIEW,
    options: {
      ...GIT_BRANCH_LOG_TAG_REFLOG_OPTIONS,
      "--prompt": "'Git Checkout> '",
      "--no-sort": true,
    },
    callback: GIT_BRANCH_LOG_TAG_REFLOG_CALLBACK,
  },
  {
    name: "git checkout files",
    patterns: [
      /^git checkout -- $/,
    ],
    sourceCommand: GIT_STATUS_SOURCE,
    preview: GIT_STATUS_PREVIEW,
    options: {
      ...DEFAULT_OPTIONS,
      "--prompt": "'Git Checkout Files> '",
      "--multi": true,
      "--no-sort": true,
    },
    callback: GIT_STATUS_CALLBACK,
  },
  {
    name: "git reset",
    patterns: [
      /^git reset( --mixed| --soft| --hard)? $/,
    ],
    sourceCommand: GIT_LOG_SOURCE,
    preview: GIT_BRANCH_LOG_TAG_REFLOG_PREVIEW,
    options: {
      ...GIT_BRANCH_LOG_TAG_REFLOG_OPTIONS,
      "--prompt": "'Git Reset> '",
      "--no-sort": true,
    },
    callback: GIT_BRANCH_LOG_TAG_REFLOG_CALLBACK,
  },
  {
    name: "git reset files",
    patterns: [
      /^git reset -- $/,
    ],
    sourceCommand: GIT_STATUS_SOURCE,
    preview: GIT_STATUS_PREVIEW,
    options: {
      ...DEFAULT_OPTIONS,
      "--prompt": "'Git Reset Files> '",
      "--multi": true,
      "--no-sort": true,
    },
    callback: GIT_STATUS_CALLBACK,
  },
  {
    name: "git switch",
    patterns: [
      /^git switch $/,
    ],
    sourceCommand: GIT_BRANCH_SOURCE,
    preview: GIT_BRANCH_LOG_TAG_REFLOG_PREVIEW,
    options: {
      ...GIT_BRANCH_LOG_TAG_REFLOG_OPTIONS,
      "--prompt": "'Git Checkout> '",
      "--no-sort": true,
    },
    callback: GIT_BRANCH_LOG_TAG_REFLOG_CALLBACK,
  },
  {
    name: "git restore",
    patterns: [
      /^git restore $/,
    ],
    sourceCommand: GIT_STATUS_SOURCE,
    preview: GIT_STATUS_PREVIEW,
    options: {
      ...DEFAULT_OPTIONS,
      "--prompt": "'Git Restore> '",
      "--multi": true,
      "--no-sort": true,
    },
    callback: GIT_STATUS_CALLBACK,
  },
  {
    name: "git rebase",
    patterns: [
      /git rebase /,
    ],
    sourceCommand: GIT_LOG_SOURCE,
    preview: GIT_LOG_PREVIEW,
    options: {
      ...DEFAULT_OPTIONS,
      "--prompt": "'Git Rebase> '",
      "--multi": true,
      "--no-sort": true,
    },
    callback: GIT_BRANCH_LOG_TAG_REFLOG_CALLBACK,
  },
];
