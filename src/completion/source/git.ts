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
  GIT_LS_FILES_SOURCE,
  GIT_STASH_CALLBACK,
  GIT_STASH_SOURCE,
  GIT_STATUS_CALLBACK,
  GIT_STATUS_SOURCE,
  GIT_TAG_SOURCE,
} from "../../const/source.ts";
import type { CompletionSource, FzfOptions } from "../../type/fzf.ts";

type OptionDefaults = {
  preview?: string;
  multi?: boolean;
  noSort?: boolean;
  read0?: boolean;
};

type OptionOverrides = OptionDefaults & {
  base?: FzfOptions;
  extra?: Partial<FzfOptions>;
};

type SourceConfig = Readonly<{
  name: string;
  patterns: readonly RegExp[];
  excludePatterns?: readonly RegExp[];
  prompt: string;
  options?: OptionOverrides;
  sourceCommand?: string;
}>;

const formatPrompt = (label: string): string => "'" + label + "> '";

const createOptionsBuilder = (
  base: FzfOptions,
  defaults: OptionDefaults,
) => (label: string, overrides: OptionOverrides = {}): FzfOptions => {
  const targetBase = overrides.base ?? base;
  const options: Record<string, unknown> = {
    ...targetBase,
    "--prompt": formatPrompt(label),
  };

  const preview = overrides.preview ?? defaults.preview;
  if (preview) {
    options["--preview"] = preview;
  }

  const multi = overrides.multi ?? defaults.multi;
  if (multi) {
    options["--multi"] = true;
  }

  const noSort = overrides.noSort ?? defaults.noSort;
  if (noSort) {
    options["--no-sort"] = true;
  }

  const read0 = overrides.read0 ?? defaults.read0;
  if (read0) {
    options["--read0"] = true;
  }

  if (overrides.extra) {
    Object.assign(options, overrides.extra);
  }

  return options as FzfOptions;
};

const statusOptions = createOptionsBuilder(DEFAULT_OPTIONS, {
  preview: GIT_STATUS_PREVIEW,
  multi: true,
  noSort: true,
});

const branchOptions = createOptionsBuilder(GIT_BRANCH_LOG_TAG_REFLOG_OPTIONS, {
  preview: GIT_BRANCH_LOG_TAG_REFLOG_PREVIEW,
});

const logOptions = createOptionsBuilder(DEFAULT_OPTIONS, {
  preview: GIT_LOG_PREVIEW,
  noSort: true,
});

const stashOptions = createOptionsBuilder(DEFAULT_OPTIONS, {
  preview: GIT_STASH_PREVIEW,
});

const lsFilesOptions = createOptionsBuilder(DEFAULT_OPTIONS, {
  preview: GIT_LS_FILES_PREVIEW,
  multi: true,
  read0: true,
});

const statusSource = (config: SourceConfig): CompletionSource => ({
  name: config.name,
  patterns: config.patterns,
  excludePatterns: config.excludePatterns,
  sourceCommand: GIT_STATUS_SOURCE,
  options: statusOptions(config.prompt, config.options),
  callback: GIT_STATUS_CALLBACK,
});

const branchSource = (config: SourceConfig): CompletionSource => ({
  name: config.name,
  patterns: config.patterns,
  excludePatterns: config.excludePatterns,
  sourceCommand: config.sourceCommand ?? GIT_BRANCH_SOURCE,
  options: branchOptions(config.prompt, config.options),
  callback: GIT_BRANCH_LOG_TAG_REFLOG_CALLBACK,
});

const lsFilesSource = (config: SourceConfig): CompletionSource => ({
  name: config.name,
  patterns: config.patterns,
  excludePatterns: config.excludePatterns,
  sourceCommand: config.sourceCommand ?? GIT_LS_FILES_SOURCE,
  options: lsFilesOptions(config.prompt, config.options),
});

const stashSource = (config: SourceConfig): CompletionSource => ({
  name: config.name,
  patterns: config.patterns,
  excludePatterns: config.excludePatterns,
  sourceCommand: config.sourceCommand ?? GIT_STASH_SOURCE,
  options: stashOptions(config.prompt, config.options),
  callback: GIT_STASH_CALLBACK,
});

const logSource = (config: SourceConfig): CompletionSource => ({
  name: config.name,
  patterns: config.patterns,
  excludePatterns: config.excludePatterns,
  sourceCommand: config.sourceCommand ?? GIT_LOG_SOURCE,
  options: logOptions(config.prompt, config.options),
  callback: GIT_BRANCH_LOG_TAG_REFLOG_CALLBACK,
});

type SourceKind = "status" | "branch" | "ls" | "stash" | "log";

const builders: Record<SourceKind, (config: SourceConfig) => CompletionSource> = {
  status: statusSource,
  branch: branchSource,
  ls: lsFilesSource,
  stash: stashSource,
  log: logSource,
};

const descriptors: ReadonlyArray<SourceConfig & { kind: SourceKind }> = [
  {
    kind: "status",
    name: "git add",
    patterns: [/^git add(?: .*)? $/],
    prompt: "Git Add Files",
  },
  {
    kind: "status",
    name: "git diff files",
    patterns: [/^git diff(?=.* -- ) .* $/],
    excludePatterns: [
      /^git diff.* [^-].* -- /,
      / --no-index /,
    ],
    prompt: "Git Diff Files",
  },
  {
    kind: "ls",
    name: "git diff branch files",
    patterns: [
      /^git diff(?=.* -- ) .* $/,
      /^git diff(?=.* --no-index ) .* $/,
    ],
    prompt: "Git Diff Branch Files",
  },
  {
    kind: "branch",
    name: "git diff",
    patterns: [/^git diff(?: .*)? $/],
    prompt: "Git Diff",
    options: { multi: true },
  },
  {
    kind: "log",
    name: "git commit",
    patterns: [
      /^git commit(?: .*)? -[cC] $/,
      /^git commit(?: .*)? --fixup[= ](?:amend:|reword:)?$/,
      /^git commit(?: .*)? --(?:(?:reuse|reedit)-message|squash)[= ]$/,
    ],
    excludePatterns: [/ -- /],
    prompt: "Git Commit",
  },
  {
    kind: "status",
    name: "git commit files",
    patterns: [/^git commit(?: .*)? $/],
    excludePatterns: [
      / -[mF] $/,
      / --(?:author|date|template|trailer) $/,
    ],
    prompt: "Git Commit Files",
  },
  {
    kind: "ls",
    name: "git checkout branch files",
    patterns: [
      /^git checkout(?=.*(?<! (?:-[bBt]|--orphan|--track|--conflict|--pathspec-from-file)) [^-]) .* $/,
    ],
    excludePatterns: [/ --(?:conflict|pathspec-from-file) $/],
    prompt: "Git Checkout Branch Files",
  },
  {
    kind: "branch",
    name: "git checkout",
    patterns: [/^git checkout(?: .*)? (?:--track=)?$/],
    excludePatterns: [
      / -- /,
      / --(?:conflict|pathspec-from-file) $/,
    ],
    prompt: "Git Checkout",
  },
  {
    kind: "status",
    name: "git checkout files",
    patterns: [/^git checkout(?: .*)? $/],
    excludePatterns: [/ --(?:conflict|pathspec-from-file) $/],
    prompt: "Git Checkout Files",
  },
  {
    kind: "branch",
    name: "git delete branch",
    patterns: [/^git branch (?:-d|-D)(?: .*)? $/],
    prompt: "Git Delete Branch",
    options: { base: DEFAULT_OPTIONS, multi: true },
  },
  {
    kind: "ls",
    name: "git reset branch files",
    patterns: [
      /^git reset(?=.*(?<! --pathspec-from-file) [^-]) .* $/,
    ],
    excludePatterns: [/ --pathspec-from-file $/],
    prompt: "Git Reset Branch Files",
  },
  {
    kind: "branch",
    name: "git reset",
    patterns: [/^git reset(?: .*)? $/],
    excludePatterns: [
      / -- /,
      / --pathspec-from-file $/,
    ],
    prompt: "Git Reset",
    sourceCommand: GIT_LOG_SOURCE,
  },
  {
    kind: "status",
    name: "git reset files",
    patterns: [/^git reset(?: .*)? $/],
    excludePatterns: [/ --pathspec-from-file $/],
    prompt: "Git Reset Files",
  },
  {
    kind: "branch",
    name: "git switch",
    patterns: [/^git switch(?: .*)? $/],
    prompt: "Git Switch",
  },
  {
    kind: "branch",
    name: "git restore source",
    patterns: [/^git restore(?: .*)? (?:-s |--source[= ])$/],
    excludePatterns: [/ -- /],
    prompt: "Git Restore Source",
  },
  {
    kind: "ls",
    name: "git restore source files",
    patterns: [/^git restore(?=.* (?:-s |--source[= ])) .* $/],
    prompt: "Git Restore Files",
  },
  {
    kind: "status",
    name: "git restore files",
    patterns: [/^git restore(?: .*)? $/],
    prompt: "Git Restore Files",
  },
  {
    kind: "branch",
    name: "git rebase branch",
    patterns: [
      /^git rebase(?=.*(?<! (?:-[xsX]|--exec|--strategy(?:-options)?|--onto)) [^-]) .* $/,
    ],
    prompt: "Git Rebase Branch",
  },
  {
    kind: "branch",
    name: "git rebase",
    patterns: [/^git rebase(?: .*)? (?:--onto[= ])?$/],
    excludePatterns: [
      / -[xsX] $/,
      / --(?:exec|strategy(?:-option)?) $/,
    ],
    prompt: "Git Rebase",
    sourceCommand: GIT_LOG_SOURCE,
  },
  {
    kind: "branch",
    name: "git merge branch",
    patterns: [/^git merge(?: .*)? --into-name[= ]$/],
    prompt: "Git Merge Branch",
  },
  {
    kind: "branch",
    name: "git merge",
    patterns: [/git merge(?: .*)? $/],
    excludePatterns: [
      / -[mFsX] $/,
      / --(?:file|strategy(?:-option)?) $/,
    ],
    prompt: "Git Merge",
    sourceCommand: GIT_LOG_SOURCE,
  },
  {
    kind: "stash",
    name: "git stash",
    patterns: [
      /git stash (?:apply|drop|pop|show)(?: .*)? $/,
      /git stash branch(?=.* [^-]) .* $/,
    ],
    prompt: "Git Stash",
  },
  {
    kind: "branch",
    name: "git stash branch",
    patterns: [/git stash branch(?: .*)? $/],
    prompt: "Git Stash Branch",
  },
  {
    kind: "status",
    name: "git stash push files",
    patterns: [/git stash push(?: .*)? $/],
    prompt: "Git Stash Push Files",
  },
  {
    kind: "ls",
    name: "git log file",
    patterns: [/^git log(?=.* -- ) .* $/],
    prompt: "Git Log File",
    options: { multi: false },
  },
  {
    kind: "branch",
    name: "git log",
    patterns: [/^git log(?: .*)? $/],
    excludePatterns: [
      / --(?:skip|since|after|until|before|author|committer|date) $/,
      / --(?:branches|tags|remotes|glob|exclude|pretty|format) $/,
      / --grep(?:-reflog)? $/,
      / --(?:min|max)-parents $/,
    ],
    prompt: "Git Log",
  },
  {
    kind: "branch",
    name: "git tag list commit",
    patterns: [
      /^git tag(?=.* (?:-l|--list) )(?: .*)? --(?:(?:no-)?(?:contains|merged)|points-at) $/,
    ],
    prompt: "Git Tag List Commit",
    sourceCommand: GIT_LOG_SOURCE,
  },
  {
    kind: "branch",
    name: "git tag delete",
    patterns: [/^git tag(?=.* (?:-d|--delete) )(?: .*)? $/],
    prompt: "Git Tag Delete",
    sourceCommand: GIT_TAG_SOURCE,
    options: { multi: true },
  },
  {
    kind: "branch",
    name: "git tag",
    patterns: [/^git tag(?: .*)? $/],
    excludePatterns: [
      / -[umF] $/,
      / --(?:local-user|format) $/,
    ],
    prompt: "Git Tag",
    sourceCommand: GIT_TAG_SOURCE,
  },
  {
    kind: "ls",
    name: "git mv files",
    patterns: [/^git mv(?: .*)? $/],
    prompt: "Git Mv Files",
  },
  {
    kind: "ls",
    name: "git rm files",
    patterns: [/^git rm(?: .*)? $/],
    prompt: "Git Rm Files",
  },
  {
    kind: "branch",
    name: "git show",
    patterns: [/^git show(?: .*)? $/],
    excludePatterns: [/ --(?:pretty|format) $/],
    prompt: "Git Show",
    sourceCommand: GIT_LOG_SOURCE,
    options: { multi: true },
  },
  {
    kind: "log",
    name: "git revert",
    patterns: [/^git revert(?: .*)? $/],
    prompt: "Git Revert",
  },
];

export const gitSources: readonly CompletionSource[] = descriptors.map((config) =>
  builders[config.kind](config)
);
