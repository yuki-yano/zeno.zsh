const git_log_format =
  "%C(magenta)%h  %C(yellow)%cr %x09%C(blue)[%an] %x09%C(auto)%s %d";
const git_for_each_ref_format =
  "%(color:magenta)%(refname:short)  %(color:yellow)%(authordate:short) %09%(color:blue)[%(authorname)]%09";
const git_stash_list_format = "%C(magenta)%gd  %C(yellow)%cr %x09%C(auto)%gs";

export const GIT_STATUS_SOURCE_0 =
  "git -c color.status=always status --short -z";
export const GIT_STATUS_CALLBACK_0 = "cut -z -c 4-";

export const GIT_LS_FILES_SOURCE_0 = "git ls-files -z";

export const GIT_LOG_SOURCE =
  `git log --decorate --color=always --format='%C(green)[commit] ${git_log_format}'`;

export const GIT_BRANCH_SOURCE =
  `git for-each-ref refs/heads refs/remotes --color=always --format='%(color:green)[branch] ${git_for_each_ref_format}' 2> /dev/null | column -t`;

export const GIT_TAG_SOURCE =
  `git for-each-ref refs/tags --color=always --format='%(color:green)[tag] ${git_for_each_ref_format}' 2> /dev/null | column -t`;

export const GIT_REFLOG_SOURCE =
  `git reflog --decorate --color=always --format='%C(green)[reflog] ${git_log_format}' 2> /dev/null`;

export const GIT_BRANCH_LOG_TAG_REFLOG_CALLBACK = "awk '{ print $2 }'";

export const GIT_STASH_SOURCE_0 =
  `git stash list --color=always --format='${git_stash_list_format}' -z`;
export const GIT_STASH_CALLBACK_0 = "cut -z -d ' ' -f 1";
