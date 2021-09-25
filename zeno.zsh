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

if [[ ! -z $ZENO_ENABLE_SOCK ]]; then
  if [[ -z $ZENO_SOCK_DIR ]]; then
    export ZENO_SOCK_DIR="/tmp/zeno-${UID}"
  fi

  if [[ ! -d $ZENO_SOCK_DIR ]]; then
    mkdir -p $ZENO_SOCK_DIR
  fi


  export ZENO_SOCK="${ZENO_SOCK_DIR}/zeno-${$}.sock"

  function zeno-client() {
    # setopt localoptions errreturn
    zmodload zsh/net/socket
    zsocket ${ZENO_SOCK}
    isok=$?
    if [[ $isok -ne 0 ]]; then
      clear-zeno-client
      echo "failure"
      return
    fi
    typeset -i fd=$REPLY
    print -nu $fd "${@//-/\\-}"
    cat <&$fd
    exec {fd}>&-
  }

  function zshexit() {
    pkill -P ${$}
  } 

  function clear-zeno-client() {
    if [[ -e ${ZENO_SOCK} ]]; then
      rm ${ZENO_SOCK}
    fi
    nohup ${0:a:h}/bin/zeno > /dev/null 2>&1 &!
  }

  nohup ${0:a:h}/bin/zeno >/dev/null 2>&1 &!
fi

export ZENO_LOADED=1
