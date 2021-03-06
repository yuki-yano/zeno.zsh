export const GIT_STATUS_SOURCE_0 =
  "git -c color.status=always status --short -z";
export const GIT_STATUS_CALLBACK_0 = "cut -z -c 4-";

export const GIT_LS_FILES_SOURCE_0 = "git ls-files -z";

export const GIT_LOG_SOURCE =
  "git log --decorate --color=always --format='%C(green)[commit]  %Creset%C(magenta)%h%Creset %C(yellow)%cr %x09%Creset [%C(blue)%an%Creset] %x09%C(auto)%s %d'";

export const GIT_BRANCH_SOURCE =
  "git for-each-ref refs/heads refs/remotes --color=always --format='%(color:green)[branch]%09%(color:reset)%(color:magenta)%(refname:short)%(color:reset) %(color:yellow)%(authordate:short) %(color:reset) %(color:blue)[%(authorname)]%(color:reset)%09' 2> /dev/null | column -t";

export const GIT_TAG_SOURCE =
  "git for-each-ref refs/tags --color=always --format='%(color:green)[tag]%09%(color:reset)%(color:magenta)%(refname:short)%(color:reset) %(color:yellow)%(authordate:short) %(color:reset) %(color:blue)[%(authorname)]%(color:reset)%09' 2> /dev/null | column -t";

export const GIT_REFLOG_SOURCE =
  "git reflog --decorate --color=always --format='%C(green)[reflog]  %Creset%C(magenta)%h%Creset %C(yellow)%cr %x09%Creset [%C(blue)%an%Creset] %x09%C(auto)%s %d' 2> /dev/null";

export const GIT_BRANCH_LOG_TAG_REFLOG_CALLBACK = "awk '{ print $2 }'";

export const GIT_STASH_SOURCE_0 =
  "git stash list --color=always --format='%C(magenta)%gd  %C(yellow)%cr %x09%C(auto)%gs' -z";
export const GIT_STASH_CALLBACK_0 = "cut -z -d ' ' -f 1";
