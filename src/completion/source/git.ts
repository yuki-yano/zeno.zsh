import {
  DEFAULT_OPTIONS,
  GIT_BRANCH_LOG_TAG_REFLOG_OPTIONS,
} from "../../const/option.ts";
import {
  GIT_BRANCH_LOG_TAG_REFLOG_PREVIEW,
  GIT_LOG_PREVIEW,
  GIT_LS_FILES_PREVIEW,
  GIT_STASH_PREVIEW,
  GIT_STATUS_PREVIEW,
} from "../../const/preview.ts";
import {
  GIT_BRANCH_LOG_TAG_REFLOG_CALLBACK,
  GIT_BRANCH_SOURCE,
  GIT_LOG_SOURCE,
  GIT_LS_FILES_SOURCE_0,
  GIT_STASH_CALLBACK_0,
  GIT_STASH_SOURCE_0,
  GIT_STATUS_CALLBACK_0,
  GIT_STATUS_SOURCE_0,
  GIT_TAG_SOURCE,
} from "../../const/source.ts";
import type { CompletionSource } from "../../type/fzf.ts";

export const gitSources: readonly CompletionSource[] = [
  {
    name: "git add",
    patterns: [
      /^git add(?: .*)? $/,
    ],
    sourceCommand: GIT_STATUS_SOURCE_0,
    options: {
      ...DEFAULT_OPTIONS,
      "--multi": true,
      "--no-sort": true,
      "--prompt": "'Git Add Files> '",
      "--preview": GIT_STATUS_PREVIEW,
      "--read0": true,
    },
    callback: GIT_STATUS_CALLBACK_0,
    callbackZero: true,
  },
  {
    name: "git diff files",
    patterns: [
      /^git diff(?=.* -- ) .* $/,
    ],
    excludePatterns: [
      /^git diff.* [^-].* -- /,
      / --no-index /,
    ],
    sourceCommand: GIT_STATUS_SOURCE_0,
    options: {
      ...DEFAULT_OPTIONS,
      "--multi": true,
      "--no-sort": true,
      "--prompt": "'Git Diff Files> '",
      "--preview": GIT_STATUS_PREVIEW,
      "--read0": true,
    },
    callback: GIT_STATUS_CALLBACK_0,
    callbackZero: true,
  },
  {
    name: "git diff branch files",
    patterns: [
      /^git diff(?=.* -- ) .* $/,
      /^git diff(?=.* --no-index ) .* $/,
    ],
    sourceCommand: GIT_LS_FILES_SOURCE_0,
    options: {
      ...DEFAULT_OPTIONS,
      "--multi": true,
      "--prompt": "'Git Diff Branch Files> '",
      "--preview": GIT_LS_FILES_PREVIEW,
      "--read0": true,
    },
  },
  {
    name: "git diff",
    patterns: [
      /^git diff(?: .*)? $/,
    ],
    sourceCommand: GIT_BRANCH_SOURCE,
    options: {
      ...GIT_BRANCH_LOG_TAG_REFLOG_OPTIONS,
      "--multi": true,
      "--prompt": "'Git Diff> '",
      "--preview": GIT_BRANCH_LOG_TAG_REFLOG_PREVIEW,
    },
    callback: GIT_BRANCH_LOG_TAG_REFLOG_CALLBACK,
  },
  {
    name: "git commit",
    patterns: [
      /^git commit(?: .*)? -[cC] $/,
      /^git commit(?: .*)? --fixup[= ](?:amend:|reword:)?$/,
      /^git commit(?: .*)? --(?:(?:reuse|reedit)-message|squash)[= ]$/,
    ],
    excludePatterns: [
      / -- /,
    ],
    sourceCommand: GIT_LOG_SOURCE,
    options: {
      ...DEFAULT_OPTIONS,
      "--prompt": "'Git Commit> '",
      "--no-sort": true,
      "--preview": GIT_LOG_PREVIEW,
    },
    callback: GIT_BRANCH_LOG_TAG_REFLOG_CALLBACK,
  },
  {
    name: "git commit files",
    patterns: [
      /^git commit(?: .*)? $/,
    ],
    excludePatterns: [
      / -[mF] $/,
      / --(?:author|date|template|trailer) $/,
    ],
    sourceCommand: GIT_STATUS_SOURCE_0,
    options: {
      ...DEFAULT_OPTIONS,
      "--multi": true,
      "--no-sort": true,
      "--preview": GIT_STATUS_PREVIEW,
      "--prompt": "'Git Commit Files> '",
      "--read0": true,
    },
    callback: GIT_STATUS_CALLBACK_0,
    callbackZero: true,
  },
  {
    name: "git checkout branch files",
    patterns: [
      /^git checkout(?=.*(?<! (?:-[bBt]|--orphan|--track|--conflict|--pathspec-from-file)) [^-]) .* $/,
    ],
    excludePatterns: [
      / --(?:conflict|pathspec-from-file) $/,
    ],
    sourceCommand: GIT_LS_FILES_SOURCE_0,
    options: {
      ...DEFAULT_OPTIONS,
      "--multi": true,
      "--prompt": "'Git Checkout Branch Files> '",
      "--preview": GIT_LS_FILES_PREVIEW,
      "--read0": true,
    },
  },
  {
    name: "git checkout",
    patterns: [
      /^git checkout(?: .*)? (?:--track=)?$/,
    ],
    excludePatterns: [
      / -- /,
      / --(?:conflict|pathspec-from-file) $/,
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
      /^git checkout(?: .*)? $/,
    ],
    excludePatterns: [
      / --(?:conflict|pathspec-from-file) $/,
    ],
    sourceCommand: GIT_STATUS_SOURCE_0,
    options: {
      ...DEFAULT_OPTIONS,
      "--prompt": "'Git Checkout Files> '",
      "--multi": true,
      "--no-sort": true,
      "--preview": GIT_STATUS_PREVIEW,
      "--read0": true,
    },
    callback: GIT_STATUS_CALLBACK_0,
    callbackZero: true,
  },
  {
    name: "git reset branch files",
    patterns: [
      /^git reset(?=.*(?<! --pathspec-from-file) [^-]) .* $/,
    ],
    excludePatterns: [
      / --pathspec-from-file $/,
    ],
    sourceCommand: GIT_LS_FILES_SOURCE_0,
    options: {
      ...DEFAULT_OPTIONS,
      "--prompt": "'Git Reset Branch Files> '",
      "--multi": true,
      "--preview": GIT_LS_FILES_PREVIEW,
      "--read0": true,
    },
  },
  {
    name: "git reset",
    patterns: [
      /^git reset(?: .*)? $/,
    ],
    excludePatterns: [
      / -- /,
      / --pathspec-from-file $/,
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
      /^git reset(?: .*)? $/,
    ],
    excludePatterns: [
      / --pathspec-from-file $/,
    ],
    sourceCommand: GIT_STATUS_SOURCE_0,
    options: {
      ...DEFAULT_OPTIONS,
      "--prompt": "'Git Reset Files> '",
      "--multi": true,
      "--no-sort": true,
      "--preview": GIT_STATUS_PREVIEW,
      "--read0": true,
    },
    callback: GIT_STATUS_CALLBACK_0,
    callbackZero: true,
  },
  {
    name: "git switch",
    patterns: [
      /^git switch(?: .*)? $/,
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
    name: "git restore source",
    patterns: [
      /^git restore(?: .*)? (?:-s |--source[= ])$/,
    ],
    excludePatterns: [
      / -- /,
    ],
    sourceCommand: GIT_BRANCH_SOURCE,
    options: {
      ...GIT_BRANCH_LOG_TAG_REFLOG_OPTIONS,
      "--prompt": "'Git Restore Source> '",
      "--preview": GIT_BRANCH_LOG_TAG_REFLOG_PREVIEW,
    },
    callback: GIT_BRANCH_LOG_TAG_REFLOG_CALLBACK,
  },
  {
    name: "git restore source files",
    patterns: [
      /^git restore(?=.* (?:-s |--source[= ])) .* $/,
    ],
    sourceCommand: GIT_LS_FILES_SOURCE_0,
    options: {
      ...DEFAULT_OPTIONS,
      "--prompt": "'Git Restore Files> '",
      "--multi": true,
      "--preview": GIT_LS_FILES_PREVIEW,
      "--read0": true,
    },
  },
  {
    name: "git restore files",
    patterns: [
      /^git restore(?: .*)? $/,
    ],
    sourceCommand: GIT_STATUS_SOURCE_0,
    options: {
      ...DEFAULT_OPTIONS,
      "--prompt": "'Git Restore Files> '",
      "--multi": true,
      "--no-sort": true,
      "--preview": GIT_STATUS_PREVIEW,
      "--read0": true,
    },
    callback: GIT_STATUS_CALLBACK_0,
    callbackZero: true,
  },
  {
    name: "git rebase branch",
    patterns: [
      /^git rebase(?=.*(?<! (?:-[xsX]|--exec|--strategy(?:-options)?|--onto)) [^-]) .* $/,
    ],
    sourceCommand: GIT_BRANCH_SOURCE,
    options: {
      ...GIT_BRANCH_LOG_TAG_REFLOG_OPTIONS,
      "--prompt": "'Git Rebase Branch> '",
      "--preview": GIT_BRANCH_LOG_TAG_REFLOG_PREVIEW,
    },
    callback: GIT_BRANCH_LOG_TAG_REFLOG_CALLBACK,
  },
  {
    name: "git rebase",
    patterns: [
      /^git rebase(?: .*)? (?:--onto[= ])?$/,
    ],
    excludePatterns: [
      / -[xsX] $/,
      / --(?:exec|strategy(?:-option)?) $/,
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
    name: "git merge branch",
    patterns: [
      /^git merge(?: .*)? --into-name[= ]$/,
    ],
    sourceCommand: GIT_BRANCH_SOURCE,
    options: {
      ...GIT_BRANCH_LOG_TAG_REFLOG_OPTIONS,
      "--prompt": "'Git Merge Branch> '",
      "--preview": GIT_BRANCH_LOG_TAG_REFLOG_PREVIEW,
    },
    callback: GIT_BRANCH_LOG_TAG_REFLOG_CALLBACK,
  },
  {
    name: "git merge",
    patterns: [
      /git merge(?: .*)? $/,
    ],
    excludePatterns: [
      / -[mFsX] $/,
      / --(?:file|strategy(?:-option)?) $/,
    ],
    sourceCommand: GIT_LOG_SOURCE,
    options: {
      ...GIT_BRANCH_LOG_TAG_REFLOG_OPTIONS,
      "--prompt": "'Git Merge> '",
      "--preview": GIT_BRANCH_LOG_TAG_REFLOG_PREVIEW,
    },
    callback: GIT_BRANCH_LOG_TAG_REFLOG_CALLBACK,
  },
  {
    name: "git stash",
    patterns: [
      /git stash (?:apply|drop|pop|show)(?: .*)? $/,
      /git stash branch(?=.* [^-]) .* $/,
    ],
    sourceCommand: GIT_STASH_SOURCE_0,
    options: {
      ...DEFAULT_OPTIONS,
      "--prompt": "'Git Stash> '",
      "--preview": GIT_STASH_PREVIEW,
      "--read0": true,
    },
    callback: GIT_STASH_CALLBACK_0,
    callbackZero: true,
  },
  {
    name: "git stash branch",
    patterns: [
      /git stash branch(?: .*)? $/,
    ],
    sourceCommand: GIT_BRANCH_SOURCE,
    options: {
      ...GIT_BRANCH_LOG_TAG_REFLOG_OPTIONS,
      "--prompt": "'Git Stash Branch> '",
      "--preview": GIT_BRANCH_LOG_TAG_REFLOG_PREVIEW,
    },
    callback: GIT_BRANCH_LOG_TAG_REFLOG_CALLBACK,
  },
  {
    name: "git stash push files",
    patterns: [
      /git stash push(?: .*)? $/,
    ],
    sourceCommand: GIT_STATUS_SOURCE_0,
    options: {
      ...DEFAULT_OPTIONS,
      "--multi": true,
      "--no-sort": true,
      "--prompt": "'Git Stash Push Files> '",
      "--preview": GIT_STATUS_PREVIEW,
      "--read0": true,
    },
    callback: GIT_STATUS_CALLBACK_0,
    callbackZero: true,
  },
  {
    name: "git log file",
    patterns: [
      /^git log(?=.* -- ) .* $/,
    ],
    sourceCommand: GIT_LS_FILES_SOURCE_0,
    options: {
      ...DEFAULT_OPTIONS,
      "--prompt": "'Git Log File> '",
      "--preview": GIT_LS_FILES_PREVIEW,
      "--read0": true,
    },
  },
  {
    name: "git log",
    patterns: [
      /^git log(?: .*)? $/,
    ],
    excludePatterns: [
      / --(?:skip|since|after|until|before|author|committer|date) $/,
      / --(?:branches|tags|remotes|glob|exclude|pretty|format) $/,
      / --grep(?:-reflog)? $/,
      / --(?:min|max)-parents $/,
    ],
    sourceCommand: GIT_BRANCH_SOURCE,
    options: {
      ...GIT_BRANCH_LOG_TAG_REFLOG_OPTIONS,
      "--prompt": "'Git Log> '",
      "--preview": GIT_BRANCH_LOG_TAG_REFLOG_PREVIEW,
    },
    callback: GIT_BRANCH_LOG_TAG_REFLOG_CALLBACK,
  },
  {
    name: "git tag list commit",
    patterns: [
      /^git tag(?=.* (?:-l|--list) )(?: .*)? --(?:(?:no-)?(?:contains|merged)|points-at) $/,
    ],
    sourceCommand: GIT_LOG_SOURCE,
    options: {
      ...GIT_BRANCH_LOG_TAG_REFLOG_OPTIONS,
      "--prompt": "'Git Tag List Commit> '",
      "--preview": GIT_BRANCH_LOG_TAG_REFLOG_PREVIEW,
    },
    callback: GIT_BRANCH_LOG_TAG_REFLOG_CALLBACK,
  },
  {
    name: "git tag delete",
    patterns: [
      /^git tag(?=.* (?:-d|--delete) )(?: .*)? $/,
    ],
    sourceCommand: GIT_TAG_SOURCE,
    options: {
      ...GIT_BRANCH_LOG_TAG_REFLOG_OPTIONS,
      "--multi": true,
      "--prompt": "'Git Tag Delete> '",
      "--preview": GIT_BRANCH_LOG_TAG_REFLOG_PREVIEW,
    },
    callback: GIT_BRANCH_LOG_TAG_REFLOG_CALLBACK,
  },
  {
    name: "git tag",
    patterns: [
      /^git tag(?: .*)? $/,
    ],
    excludePatterns: [
      / -[umF] $/,
      / --(?:local-user|format) $/,
    ],
    sourceCommand: GIT_TAG_SOURCE,
    options: {
      ...GIT_BRANCH_LOG_TAG_REFLOG_OPTIONS,
      "--prompt": "'Git Tag> '",
      "--preview": GIT_BRANCH_LOG_TAG_REFLOG_PREVIEW,
    },
    callback: GIT_BRANCH_LOG_TAG_REFLOG_CALLBACK,
  },
  {
    name: "git mv files",
    patterns: [
      /^git mv(?: .*)? $/,
    ],
    sourceCommand: GIT_LS_FILES_SOURCE_0,
    options: {
      ...DEFAULT_OPTIONS,
      "--multi": true,
      "--prompt": "'Git Mv Files> '",
      "--preview": GIT_LS_FILES_PREVIEW,
      "--read0": true,
    },
  },
  {
    name: "git rm files",
    patterns: [
      /^git rm(?: .*)? $/,
    ],
    sourceCommand: GIT_LS_FILES_SOURCE_0,
    options: {
      ...DEFAULT_OPTIONS,
      "--multi": true,
      "--prompt": "'Git Rm Files> '",
      "--preview": GIT_LS_FILES_PREVIEW,
      "--read0": true,
    },
  },
  {
    name: "git show",
    patterns: [
      /^git show(?: .*)? $/,
    ],
    excludePatterns: [
      / --(?:pretty|format) $/,
    ],
    sourceCommand: GIT_LOG_SOURCE,
    options: {
      ...GIT_BRANCH_LOG_TAG_REFLOG_OPTIONS,
      "--multi": true,
      "--prompt": "'Git Show> '",
      "--preview": GIT_BRANCH_LOG_TAG_REFLOG_PREVIEW,
    },
    callback: GIT_BRANCH_LOG_TAG_REFLOG_CALLBACK,
  },
];
