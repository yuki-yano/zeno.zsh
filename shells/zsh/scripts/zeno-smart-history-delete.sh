#!/usr/bin/env zsh

main() {
  emulate -L zsh
  setopt errexit no_aliases pipefail

  local cmd=${1:-zeno}
  shift || true
  local id=${1:-}
  [[ -z $id ]] && return 0
  [[ $id == __empty__ ]] && return 0

  if ! command -v -- "$cmd" >/dev/null 2>&1; then
    cmd=zeno
  fi

  "$cmd" history delete --id "$id" >/dev/null 2>&1 || true
}

main "$@"
exit 0
