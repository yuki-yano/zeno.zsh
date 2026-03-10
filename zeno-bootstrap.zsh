if ! whence -p deno >/dev/null; then
  return
fi

() {
  emulate -L zsh

  local zeno_source=${${(%):-%x}:A}
  local -a required_dirs widget_dirs autoload_dirs
  local dir f

  export ZENO_ROOT=${ZENO_ROOT:-${zeno_source:h}}

  required_dirs=(
    "${ZENO_ROOT}/shells/zsh/functions"
    "${ZENO_ROOT}/shells/zsh/widgets"
  )

  for dir in "${(@)required_dirs}"; do
    if [[ ! -d "$dir" ]]; then
      print -u2 -- "zeno-bootstrap.zsh: missing required directory: $dir"
      return 1
    fi
  done

  if (( ${path[(I)${ZENO_ROOT}/bin]} == 0 )); then
    path+=("${ZENO_ROOT}/bin")
  fi

  widget_dirs=(
    "${ZENO_ROOT}/shells/zsh/widgets"
  )
  autoload_dirs=(
    "${ZENO_ROOT}/shells/zsh/functions"
    "${(@)widget_dirs}"
  )

  for dir in "${(@)autoload_dirs}"; do
    if (( ${fpath[(I)$dir]} == 0 )); then
      fpath+=("$dir")
    fi
  done

  for f in "${(@)^autoload_dirs}"/*(N-.); do
    autoload -Uz -- "${f:t}"
  done
  for f in "${(@)^widget_dirs}"/*(N-.); do
    zle -N -- "${f:t}"
  done

  if [[ -z ${ZENO_ENABLE_FZF_TMUX-} ]]; then
    export ZENO_FZF_COMMAND="fzf"
  else
    export ZENO_FZF_COMMAND="fzf-tmux"
  fi

  export ZENO_ENABLE=1
  export ZENO_BOOTSTRAPPED=1
}
