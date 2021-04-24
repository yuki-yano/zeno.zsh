import { DEFAULT_OPTIONS } from "../../const/option.ts";
import {
  GIT_ADD_PREVIEW,
  GIT_BRANCH_PREVIEW,
  GIT_COMMIT_FIXUP_PREVIEW,
} from "../../const/preview.ts";
import {
  GIT_ADD_SOURCE,
  GIT_BRANCH_SOURCE,
  GIT_COMMIT_FIXUP_SOURCE,
} from "../../const/source.ts";
import type { CompletionSource } from "../../type/fzf.ts";

export const gitSources: Array<CompletionSource> = [
  {
    id: "git add",
    patterns: [/^git add( -p| --patch)? $/],
    sourceCommand: GIT_ADD_SOURCE,
    preview: GIT_ADD_PREVIEW,
    options: {
      ...DEFAULT_OPTIONS,
      "--multi": true,
      "--prompt": "'Git Add Files> '",
    },
    callback: (lines) => (
      lines.map((line) => (line.split(" ").slice(-1)[0]))
    ),
  },
  {
    id: "git commit fixup",
    patterns: [/^git commit (--fixup|--squash)\s$/],
    sourceCommand: GIT_COMMIT_FIXUP_SOURCE,
    preview: GIT_COMMIT_FIXUP_PREVIEW,
    options: {
      ...DEFAULT_OPTIONS,
      "--prompt": "'Git Fixup> '",
      "--no-sort": true,
    },
    callback: (lines) => (
      lines.map((line) => (line.split(/\s+/)[1]))
    ),
  },
  {
    id: "git checkout",
    patterns: [/^git checkout(( -t)|( --track))? $/],
    sourceCommand: GIT_BRANCH_SOURCE,
    preview: GIT_BRANCH_PREVIEW,
    options: {
      ...DEFAULT_OPTIONS,
      "--prompt": "'Git Checkout> '",
      "--no-sort": true,
    },
    callback: (lines) => (
      lines.map((line) => (line.split(/\s+/)[1]))
    ),
  },
  {
    id: "git reset",
    patterns: [/^git reset(--mixed| --soft| --hard)?(?!( --)) $/],
    sourceCommand: GIT_BRANCH_SOURCE,
    preview: GIT_BRANCH_PREVIEW,
    options: {
      ...DEFAULT_OPTIONS,
      "--prompt": "'Git Reset> '",
      "--no-sort": true,
    },
    callback: (lines) => (
      lines.map((line) => (line.split(/\s+/)[1]))
    ),
  },
];
