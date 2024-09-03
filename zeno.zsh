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
  for f in "${(@)^autoload_dirs}"/*(N-.); autoload -Uz -- "${f:t}"
  for f in "${(@)^widget_dirs}"/*(N-.); zle -N -- "${f:t}"
}

if [[ -z $ZENO_ENABLE_FZF_TMUX ]]; then
  export ZENO_FZF_COMMAND="fzf"
else
  export ZENO_FZF_COMMAND="fzf-tmux"
fi

if [[ -z $ZENO_DISABLE_EXECUTE_CACHE_COMMAND ]]; then
  command deno cache --unstable-byonm --no-lock --no-check -- "${ZENO_ROOT}/src/cli.ts"
fi

if [[ -n $ZENO_ENABLE_SOCK ]]; then
  printf -v DENO_VERSION '%d%02d%02d' ${(s:.:)$(deno -V)[2]}
  if (( DENO_VERSION >= 11600 )); then
    zeno-enable-sock
  else
    unset ZENO_ENABLE_SOCK
  fi
fi

export ZENO_ENABLE=1
export ZENO_LOADED=1
