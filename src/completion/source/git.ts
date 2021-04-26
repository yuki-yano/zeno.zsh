import {
  DEFAULT_OPTIONS,
  GIT_BRANCH_LOG_TAG_REFLOG_OPTIONS,
} from "../../const/option.ts";
import {
  GIT_BRANCH_LOG_TAG_REFLOG_PREVIEW,
  GIT_LOG_PREVIEW,
  GIT_LS_FILES_PREVIEW,
  GIT_STATUS_PREVIEW,
} from "../../const/preview.ts";
import {
  GIT_BRANCH_LOG_TAG_REFLOG_CALLBACK,
  GIT_BRANCH_SOURCE,
  GIT_LOG_SOURCE,
  GIT_LS_FILES_CALLBACK,
  GIT_LS_FILES_SOURCE,
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
    name: "git diff",
    patterns: [
      /^git diff( ((-|--)\S+)*)? $/,
    ],
    sourceCommand: GIT_BRANCH_SOURCE,
    preview: GIT_BRANCH_LOG_TAG_REFLOG_PREVIEW,
    options: {
      ...GIT_BRANCH_LOG_TAG_REFLOG_OPTIONS,
      "--prompt": "'Git Diff> '",
    },
    callback: GIT_BRANCH_LOG_TAG_REFLOG_CALLBACK,
  },
  {
    name: "git diff file",
    patterns: [
      /^git diff( ((-|--)\S+)*)? -- $/,
    ],
    sourceCommand: GIT_STATUS_SOURCE,
    preview: GIT_STATUS_PREVIEW,
    options: {
      ...DEFAULT_OPTIONS,
      "--prompt": "'Git Diff File> '",
    },
    callback: GIT_STATUS_CALLBACK,
  },
  {
    name: "git diff branch file",
    patterns: [
      /^git diff( ((-|--)\S+)*)?( \S+) -- $/,
      /^git diff( ((-|--)\S+)*)?( \S+)( \S+) -- $/,
    ],
    sourceCommand: GIT_LS_FILES_SOURCE,
    preview: GIT_LS_FILES_PREVIEW,
    options: {
      ...DEFAULT_OPTIONS,
      "--prompt": "'Git Diff Branch File> '",
    },
    callback: GIT_LS_FILES_CALLBACK,
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
    name: "git checkout branch files",
    patterns: [
      /^git checkout( \S+) -- $/,
    ],
    sourceCommand: GIT_LS_FILES_SOURCE,
    preview: GIT_LS_FILES_PREVIEW,
    options: {
      ...DEFAULT_OPTIONS,
      "--prompt": "'Git Checkout Branch Files> '",
      "--multi": true,
    },
    callback: GIT_LS_FILES_CALLBACK,
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
    name: "git reset branch files",
    patterns: [
      /^git reset( \S+) -- $/,
    ],
    sourceCommand: GIT_LS_FILES_SOURCE,
    preview: GIT_LS_FILES_PREVIEW,
    options: {
      ...DEFAULT_OPTIONS,
      "--prompt": "'Git Reset Branch Files> '",
      "--multi": true,
    },
    callback: GIT_LS_FILES_CALLBACK,
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
      "--prompt": "'Git Switch> '",
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
    name: "git restore target commit",
    patterns: [
      /^git restore( -s| --source) $/,
    ],
    sourceCommand: GIT_BRANCH_SOURCE,
    preview: GIT_BRANCH_LOG_TAG_REFLOG_PREVIEW,
    options: {
      ...GIT_BRANCH_LOG_TAG_REFLOG_OPTIONS,
      "--prompt": "'Git Restore Target Commit> '",
      "--no-sort": true,
    },
    callback: GIT_BRANCH_LOG_TAG_REFLOG_CALLBACK,
  },
  {
    name: "git restore commit files",
    patterns: [
      /^git restore( -s| --source) \S+ $/,
    ],
    sourceCommand: GIT_LS_FILES_SOURCE,
    preview: GIT_LS_FILES_PREVIEW,
    options: {
      ...DEFAULT_OPTIONS,
      "--prompt": "'Git Restore Files> '",
      "--multi": true,
    },
    callback: GIT_LS_FILES_CALLBACK,
  },
  {
    name: "git rebase",
    patterns: [
      /git rebase( ((-|--)\S+)*)? /,
    ],
    sourceCommand: GIT_LOG_SOURCE,
    preview: GIT_BRANCH_LOG_TAG_REFLOG_PREVIEW,
    options: {
      ...GIT_BRANCH_LOG_TAG_REFLOG_OPTIONS,
      "--prompt": "'Git Rebase> '",
      "--no-sort": true,
    },
    callback: GIT_BRANCH_LOG_TAG_REFLOG_CALLBACK,
  },
  {
    name: "git merge",
    patterns: [
      /git merge( ((-|--)\S+)*)? /,
    ],
    sourceCommand: GIT_LOG_SOURCE,
    preview: GIT_BRANCH_LOG_TAG_REFLOG_PREVIEW,
    options: {
      ...GIT_BRANCH_LOG_TAG_REFLOG_OPTIONS,
      "--prompt": "'Git Merge> '",
      "--no-sort": true,
    },
    callback: GIT_BRANCH_LOG_TAG_REFLOG_CALLBACK,
  },
];
