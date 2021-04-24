import {
  DEFAULT_OPTIONS,
  GIT_BRANCH_LOG_TAG_REFLOG_OPTIONS,
} from "../../const/option.ts";
import {
  GIT_ADD_PREVIEW,
  GIT_BRANCH_LOG_TAG_REFLOG_PREVIEW,
  GIT_LOG_PREVIEW,
} from "../../const/preview.ts";
import {
  GIT_ADD_SOURCE,
  GIT_BRANCH_SOURCE,
  GIT_LOG_SOURCE,
} from "../../const/source.ts";
import type { CompletionSource } from "../../type/fzf.ts";

export const gitSources: Array<CompletionSource> = [
  {
    name: "git add",
    patterns: [/^git add( -p| --patch)? $/],
    sourceCommand: GIT_ADD_SOURCE,
    preview: GIT_ADD_PREVIEW,
    options: {
      ...DEFAULT_OPTIONS,
      "--multi": true,
      "--prompt": "'Git Add Files> '",
    },
    callback: "perl -nle '@arr=split(/ /,\$_); print @arr[\$#arr]'",
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
    callback: "awk '{ print \$2 }'",
  },
  {
    name: "git checkout",
    patterns: [/^git checkout(( -t)|( --track))? $/],
    sourceCommand: GIT_BRANCH_SOURCE,
    preview: GIT_BRANCH_LOG_TAG_REFLOG_PREVIEW,
    options: {
      ...GIT_BRANCH_LOG_TAG_REFLOG_OPTIONS,
      "--prompt": "'Git Checkout> '",
      "--no-sort": true,
    },
    callback: "awk '{ print \$2 }'",
  },
  {
    name: "git reset",
    patterns: [/^git reset(--mixed| --soft| --hard)?(?!( --)) $/],
    sourceCommand: GIT_LOG_SOURCE,
    preview: GIT_BRANCH_LOG_TAG_REFLOG_PREVIEW,
    options: {
      ...GIT_BRANCH_LOG_TAG_REFLOG_OPTIONS,
      "--prompt": "'Git Reset> '",
      "--no-sort": true,
    },
    callback: "awk '{ print \$2 }'",
  },
];
