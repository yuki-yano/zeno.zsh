#!/usr/bin/env zsh

main() {
  emulate -L zsh
  setopt errexit no_aliases pipefail

  local cmd=${1:-zeno}
  local cwd=${2:-$PWD}
  local limit=${3:-2000}
  local session=${4:-}
  local state_file=${5:?state file required}
  local global_file=${6:?}
  local repository_file=${7:?}
  local directory_file=${8:?}
  local session_file=${9:?}
  shift 9 || true
  local id=${1:-}
  [[ -z $id ]] && return 0
  [[ $id == __empty__ ]] && return 0

  if ! command -v -- "$cmd" >/dev/null 2>&1; then
    cmd=zeno
  fi

  "$cmd" history delete --id "$id" >/dev/null 2>&1 || true

  local -a scope_order=(global repository directory session)
  local -A scope_files
  scope_files[global]=$global_file
  scope_files[repository]=$repository_file
  scope_files[directory]=$directory_file
  scope_files[session]=$session_file

  local tmp
  tmp=$(mktemp -t zeno-history-refresh.XXXXXX)
  trap 'rm -f -- "$tmp"' EXIT INT TERM

  local -a query_args=(history query --format smart-lines --scope all --cwd "$cwd" --limit "$limit")
  [[ -n $session ]] && query_args+=(--session "$session")
  if ! "$cmd" "${query_args[@]}" >"$tmp" 2>/dev/null; then
    rm -f -- "$tmp"
    trap - EXIT INT TERM
    return 0
  fi

  local -A buffers
  for scope in ${scope_order[@]}; do
    buffers[$scope]=''
  done

  while IFS=$'\n' read -r line; do
    [[ -z $line || $line == success ]] && continue
    local scope=${line%%$'\t'*}
    local rest=${line#*$'\t'}
    [[ -z $scope || -z $rest ]] && continue
    local trimmed_rest=${rest##$'\t'}
    case "$trimmed_rest" in
      $'\033[2m'scope:*|scope:*)
        continue
        ;;
    esac
    buffers[$scope]+="$rest"$'\n'
  done <"$tmp"
  rm -f -- "$tmp"
  trap - EXIT INT TERM

  for scope in ${scope_order[@]}; do
    local file=${scope_files[$scope]}
    [[ -z $file ]] && continue
    : >| "$file"
    if [[ -n ${buffers[$scope]-} ]]; then
      print -nr -- "${buffers[$scope]}" >>| "$file"
    else
      local empty_dim=$'\033[2m'
      local empty_reset=$'\033[0m'
      printf '__empty__\t--\t%s(no entries)%s\t\n' "$empty_dim" "$empty_reset" >>| "$file"
    fi
  done
}

main "$@"
exit 0
