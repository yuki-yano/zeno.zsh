if ! whence -p deno> /dev/null; then
  return
fi

export ZENO_ROOT=${ZENO_ROOT:-${0:a:h}}

path+=${ZENO_ROOT}/bin

() {
  local widget_dirs=(
    "${ZENO_ROOT}/shell/snippet/widget"
  )
  local autoload_dirs=(
    "${ZENO_ROOT}/shell/function"
    "${(@)widget_dirs}"
  )
  local f

  fpath+=("${(@)autoload_dirs}")
  for f in "${(@)autoload_dirs}"/*(N-.); autoload -Uz -- "${f:t}"
  for f in "${(@)widget_dirs}"/*(N-.); zle -N -- "${f:t}"
}

if [[ -z $ZENO_ENABLE_FZF_TMUX ]]; then
  export ZENO_FZF_COMMAND="fzf"
else
  export ZENO_FZF_COMMAND="fzf-tmux"
fi

if [[ -z $ZENO_DISABLE_EXECUTE_CACHE_COMMAND ]]; then
  command deno cache --no-check "${ZENO_ROOT}/src/cli.ts"
fi

if [[ ! -z $ZENO_ENABLE_SOCK ]]; then
  autoload -Uz add-zsh-hook

  export ZENO_PID=

  : ${ZENO_SOCK_DIR:="${XDG_RUNTIME_DIR:-${TMPDIR:-/tmp}}/zeno-${UID}"}
  export ZENO_SOCK_DIR

  if [[ ! -d $ZENO_SOCK_DIR ]]; then
    mkdir -p "$ZENO_SOCK_DIR"
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
    nohup "${ZENO_SERVER_BIN:-${ZENO_ROOT}/bin/zeno-server}" >/dev/null 2>&1 &!
  }

  function restart-zeno-server() {
    if [[ ! -z $ZENO_PID ]]; then
      kill ${ZENO_PID} >/dev/null 2>&1 || rm "${ZENO_SOCK}"
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
