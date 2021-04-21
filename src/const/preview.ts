export const GIT_ADD_PREVIEW =
  '[[ {-1} == "" ]] && return || [[ $(git diff -- {-1}) ]] && git diff --color=always -- {-1} || [[ $(git diff --cached -- {-1} ) ]] && git diff --cached --color=always -- {-1} || bat --color=always --style=grid --theme=gruvbox-dark {-1} 2>/dev/null || exa --color=always --tree {-1} 2>/dev/null';
