if ! whence deno > /dev/null; then
  return
fi

path+=${0:a:h}/bin
fpath+=${0:a:h}/shell/snippet/widget
for f in ${0:h}/shell/snippet/widget/*(N-.); do
  local function_name="${f:t}"
  autoload -Uz -- "${function_name}"
  zle -N -- "${function_name}"
done
unset f

if [[ -z $ZENO_ENABLE_FZF_TMUX ]]; then
  export ZENO_FZF_COMMAND="fzf"
else
  export ZENO_FZF_COMMAND="fzf-tmux"
fi

if [[ -z $ZENO_DISABLE_EXECUTE_CACHE_COMMAND ]]; then
  deno cache --no-check ${0:a:h}/bin/zeno
fi

export ZENO_SOCK="/tmp/zeno-${UID}.sock"

function zeno-client() {
  setopt localoptions errreturn
  zmodload zsh/net/socket
  zsocket ${ZENO_SOCK}
  typeset -i fd=$REPLY
  print -nu $fd "${@//-/\\-}"
  cat <&$fd
  exec {fd}>&-
}

export ZENO_LOADED=1

${0:a:h}/bin/zeno &!
