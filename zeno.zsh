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

if [[ -n $ZENO_ENABLE_SOCK ]]; then
  zeno-enable-sock
fi

export ZENO_LOADED=1
