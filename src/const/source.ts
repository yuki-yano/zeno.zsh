export const GIT_ADD_SOURCE = "git -c color.status=always status --short";

export const GIT_COMMIT_FIXUP_SOURCE =
  "git log --decorate --color=always --format='%C(green)[commit]  %Creset%C(magenta)%h%Creset %C(yellow)%cr %x09%Creset [%C(blue)%an%Creset] %x09%C(auto)%s %d'";

export const GIT_BRANCH_SOURCE = "git for-each-ref refs/heads refs/remotes --color=always --format='%(color:green)[branch]%09%(color:reset)%(color:magenta)%(refname:short)%(color:reset) %(color:yellow)%(authordate:short) %(color:reset) %(color:blue)[%(authorname)]%(color:reset)%09' 2> /dev/null | column -t"
