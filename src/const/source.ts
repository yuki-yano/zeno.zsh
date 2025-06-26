const git_log_format = [
  "%C(magenta)%h",
  "%C(yellow)%cr",
  "%C(blue)[%an]",
  "%C(auto)%s%d",
].join("%x09");
const git_for_each_ref_format = [
  "%(color:magenta)%(refname:short)",
  "%(color:yellow)%(authordate:short)",
  "%(color:blue)[%(authorname)]",
].join("%09");
const git_stash_list_format = ["%C(magenta)%gd", "%C(yellow)%cr", "%C(auto)%s"]
  .join("%x09");

const column_with_tab = "| column -t -s $'\\t'";

// NOTE: The -z option is omitted to enable color output. This means that
// filenames containing newlines will not be handled correctly.
export const GIT_STATUS_SOURCE = "git -c color.status=always status --short";
export const GIT_STATUS_CALLBACK = String
  .raw`perl -ne 'print substr($_, 3)'`;

export const GIT_LS_FILES_SOURCE = "git ls-files -z";

export const GIT_LOG_SOURCE =
  `git log --decorate --color=always --format='%C(green)[commit] ${git_log_format}' ${column_with_tab}`;

export const GIT_BRANCH_SOURCE =
  `git for-each-ref refs/heads refs/remotes --color=always --format='%(color:green)[branch] ${git_for_each_ref_format}' 2> /dev/null ${column_with_tab}`;

export const GIT_TAG_SOURCE =
  `git for-each-ref refs/tags --color=always --format='%(color:green)[tag] ${git_for_each_ref_format}' 2> /dev/null ${column_with_tab}`;

export const GIT_REFLOG_SOURCE =
  `git reflog --decorate --color=always --format='%C(green)[reflog] ${git_log_format}' 2> /dev/null ${column_with_tab}`;

export const GIT_BRANCH_LOG_TAG_REFLOG_CALLBACK = "awk '{print $2}'";

export const GIT_STASH_SOURCE =
  `git stash list --color=always --format='${git_stash_list_format}' ${column_with_tab}`;
export const GIT_STASH_CALLBACK = "awk '{print $1}'";
