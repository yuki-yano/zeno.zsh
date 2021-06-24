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
    options: {
      ...DEFAULT_OPTIONS,
      "--multi": true,
      "--prompt": "'Git Add Files> '",
      "--preview": GIT_STATUS_PREVIEW,
    },
    callback: GIT_STATUS_CALLBACK,
  },
  {
    name: "git diff file",
    patterns: [
      /^git diff( ((-|--)\S+)*)? -- $/,
    ],
    sourceCommand: GIT_STATUS_SOURCE,
    options: {
      ...DEFAULT_OPTIONS,
      "--prompt": "'Git Diff File> '",
      "--preview": GIT_STATUS_PREVIEW,
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
    options: {
      ...DEFAULT_OPTIONS,
      "--prompt": "'Git Diff Branch File> '",
      "--preview": GIT_LS_FILES_PREVIEW,
    },
    callback: GIT_LS_FILES_CALLBACK,
  },
  {
    name: "git diff",
    patterns: [
      /^git diff( ((-|--)\S+)*)? $/,
      /^git diff( ((-|--)\S+)*)?( \S+) $/,
    ],
    sourceCommand: GIT_BRANCH_SOURCE,
    options: {
      ...GIT_BRANCH_LOG_TAG_REFLOG_OPTIONS,
      "--prompt": "'Git Diff> '",
      "--preview": GIT_BRANCH_LOG_TAG_REFLOG_PREVIEW,
    },
    callback: GIT_BRANCH_LOG_TAG_REFLOG_CALLBACK,
  },
  {
    name: "git commit fixup",
    patterns: [/^git commit (--fixup|--squash)\s$/],
    sourceCommand: GIT_LOG_SOURCE,
    options: {
      ...DEFAULT_OPTIONS,
      "--prompt": "'Git Fixup> '",
      "--no-sort": true,
      "--preview": GIT_LOG_PREVIEW,
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
    options: {
      ...GIT_BRANCH_LOG_TAG_REFLOG_OPTIONS,
      "--prompt": "'Git Checkout> '",
      "--preview": GIT_BRANCH_LOG_TAG_REFLOG_PREVIEW,
    },
    callback: GIT_BRANCH_LOG_TAG_REFLOG_CALLBACK,
  },
  {
    name: "git checkout files",
    patterns: [
      /^git checkout -- $/,
    ],
    sourceCommand: GIT_STATUS_SOURCE,
    options: {
      ...DEFAULT_OPTIONS,
      "--prompt": "'Git Checkout Files> '",
      "--multi": true,
      "--no-sort": true,
      "--preview": GIT_STATUS_PREVIEW,
    },
    callback: GIT_STATUS_CALLBACK,
  },
  {
    name: "git checkout branch files",
    patterns: [
      /^git checkout( \S+) -- $/,
    ],
    sourceCommand: GIT_LS_FILES_SOURCE,
    options: {
      ...DEFAULT_OPTIONS,
      "--prompt": "'Git Checkout Branch Files> '",
      "--multi": true,
      "--preview": GIT_LS_FILES_PREVIEW,
    },
    callback: GIT_LS_FILES_CALLBACK,
  },
  {
    name: "git reset",
    patterns: [
      /^git reset( --mixed| --soft| --hard)? $/,
    ],
    sourceCommand: GIT_LOG_SOURCE,
    options: {
      ...GIT_BRANCH_LOG_TAG_REFLOG_OPTIONS,
      "--prompt": "'Git Reset> '",
      "--preview": GIT_BRANCH_LOG_TAG_REFLOG_PREVIEW,
    },
    callback: GIT_BRANCH_LOG_TAG_REFLOG_CALLBACK,
  },
  {
    name: "git reset files",
    patterns: [
      /^git reset -- $/,
    ],
    sourceCommand: GIT_STATUS_SOURCE,
    options: {
      ...DEFAULT_OPTIONS,
      "--prompt": "'Git Reset Files> '",
      "--multi": true,
      "--no-sort": true,
      "--preview": GIT_STATUS_PREVIEW,
    },
    callback: GIT_STATUS_CALLBACK,
  },
  {
    name: "git reset branch files",
    patterns: [
      /^git reset( \S+) -- $/,
    ],
    sourceCommand: GIT_LS_FILES_SOURCE,
    options: {
      ...DEFAULT_OPTIONS,
      "--prompt": "'Git Reset Branch Files> '",
      "--multi": true,
      "--preview": GIT_LS_FILES_PREVIEW,
    },
    callback: GIT_LS_FILES_CALLBACK,
  },
  {
    name: "git switch",
    patterns: [
      /^git switch $/,
      /^git switch(( -t)|( --track)) $/,
    ],
    sourceCommand: GIT_BRANCH_SOURCE,
    options: {
      ...GIT_BRANCH_LOG_TAG_REFLOG_OPTIONS,
      "--prompt": "'Git Switch> '",
      "--preview": GIT_BRANCH_LOG_TAG_REFLOG_PREVIEW,
    },
    callback: GIT_BRANCH_LOG_TAG_REFLOG_CALLBACK,
  },
  {
    name: "git restore",
    patterns: [
      /^git restore $/,
    ],
    sourceCommand: GIT_STATUS_SOURCE,
    options: {
      ...DEFAULT_OPTIONS,
      "--prompt": "'Git Restore> '",
      "--multi": true,
      "--no-sort": true,
      "--preview": GIT_STATUS_PREVIEW,
    },
    callback: GIT_STATUS_CALLBACK,
  },
  {
    name: "git restore target commit",
    patterns: [
      /^git restore( -s| --source) $/,
    ],
    sourceCommand: GIT_BRANCH_SOURCE,
    options: {
      ...GIT_BRANCH_LOG_TAG_REFLOG_OPTIONS,
      "--prompt": "'Git Restore Target Commit> '",
      "--preview": GIT_BRANCH_LOG_TAG_REFLOG_PREVIEW,
    },
    callback: GIT_BRANCH_LOG_TAG_REFLOG_CALLBACK,
  },
  {
    name: "git restore commit files",
    patterns: [
      /^git restore( -s| --source) \S+ $/,
    ],
    sourceCommand: GIT_LS_FILES_SOURCE,
    options: {
      ...DEFAULT_OPTIONS,
      "--prompt": "'Git Restore Files> '",
      "--multi": true,
      "--preview": GIT_LS_FILES_PREVIEW,
    },
    callback: GIT_LS_FILES_CALLBACK,
  },
  {
    name: "git rebase",
    patterns: [
      /git rebase( ((-|--)\S+)*)? /,
    ],
    sourceCommand: GIT_LOG_SOURCE,
    options: {
      ...GIT_BRANCH_LOG_TAG_REFLOG_OPTIONS,
      "--prompt": "'Git Rebase> '",
      "--preview": GIT_BRANCH_LOG_TAG_REFLOG_PREVIEW,
    },
    callback: GIT_BRANCH_LOG_TAG_REFLOG_CALLBACK,
  },
  {
    name: "git merge",
    patterns: [
      /git merge( ((-|--)\S+)*)? /,
    ],
    sourceCommand: GIT_LOG_SOURCE,
    options: {
      ...GIT_BRANCH_LOG_TAG_REFLOG_OPTIONS,
      "--prompt": "'Git Merge> '",
      "--preview": GIT_BRANCH_LOG_TAG_REFLOG_PREVIEW,
    },
    callback: GIT_BRANCH_LOG_TAG_REFLOG_CALLBACK,
  },
];
