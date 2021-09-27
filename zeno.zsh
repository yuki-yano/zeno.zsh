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
  autoload -Uz add-zsh-hook

  export ZENO_SERVER_BIN=${0:a:h}/bin/zeno-server
  export ZENO_PID=

  if [[ -z $ZENO_SOCK_DIR ]]; then
    export ZENO_SOCK_DIR="/tmp/zeno-${UID}"
  fi

  if [[ ! -d $ZENO_SOCK_DIR ]]; then
    mkdir -p $ZENO_SOCK_DIR
  fi

  export ZENO_SOCK="${ZENO_SOCK_DIR}/zeno-${$}.sock"

  function zeno-client() {
    zmodload zsh/net/socket
    zsocket ${ZENO_SOCK} >/dev/null 2>&1
    isok=$?
    if [[ "$isok" != 0 ]]; then
      restart-zeno-server
      return
    fi
    typeset -i fd=$REPLY
    print -nu $fd "${@//-/\\-}"
    cat <&$fd
    exec {fd}>&-
  }

  function start-zeno-server() {
    nohup ${ZENO_SERVER_BIN} > /dev/null 2>&1 &!
  }

  function restart-zeno-server() {
    if [[ ! -z $ZENO_PID ]]; then
      kill ${ZENO_PID} >/dev/null 2>&1 || rm ${ZENO_SOCK}
    fi
    export ZENO_PID=
    start-zeno-server
  }

  function zeno-onexit() {
    if [[ ! -z $ZENO_PID ]]; then
      kill ${ZENO_PID}
    fi
  }

  function zeno-onchpwd() {
    zeno-client "--zeno-mode=chdir $(pwd)"
  }

  function set-zeno-pid() {
    if [[ -S $ZENO_SOCK ]] && [[ -z $ZENO_PID ]]; then
      export ZENO_PID=$(zeno-client "--zeno-mode=pid")
    fi
  }

  add-zsh-hook precmd set-zeno-pid
  add-zsh-hook chpwd zeno-onchpwd
  add-zsh-hook zshexit zeno-onexit
fi

function call-deno-client-and-fallback() {
  mode=$1
  input=$2

  if [[ ! -z $ZENO_ENABLE_SOCK ]]; then
    if [[ -S $ZENO_SOCK ]]; then
      local out=$(zeno-client "--zeno-mode=${mode} ${input}")
    else
      start-zeno-server
      local out=$(echo "${input}" | zeno --zeno-mode=${mode})
    fi
  else
    local out=$(echo "${input}" | zeno --zeno-mode=${mode})
  fi

  echo $out
}

export ZENO_LOADED=1
