#!/usr/bin/env zsh
emulate -L zsh
setopt errexit no_aliases pipefail

local cmd=${1:-zeno}
local debug_log=${2:-}
local cwd=${3:-$PWD}
local limit=${4:-2000}
local session=${5:-}
local state_file=${6:?state file required}
local global_file=${7:?}
local repository_file=${8:?}
local directory_file=${9:?}
local session_file=${10:?}
shift 10 || true
local id=${1:-}
[[ -z $id ]] && exit 0
[[ $id == __empty__ ]] && exit 0

if [[ ! -x $cmd ]]; then
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
local -a query_args=(history query --format lines --scope all --cwd "$cwd" --limit "$limit")
[[ -n $session ]] && query_args+=(--session "$session")
if ! "$cmd" "${query_args[@]}" >"$tmp" 2>/dev/null; then
  rm -f -- "$tmp"
  return
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

for scope in ${scope_order[@]}; do
  local file=${scope_files[$scope]}
  [[ -z $file ]] && continue
  : >| "$file"
  if [[ -n ${buffers[$scope]-} ]]; then
    print -nr -- "${buffers[$scope]}" >>| "$file"
  else
    local empty_dim=$'\033[2m'
    local empty_reset=$'\033[0m'
    printf '__empty__\t--\t%s(no entries)%s\n' "$empty_dim" "$empty_reset" >>| "$file"
  fi
done

if [[ -n $debug_log ]]; then
  printf '[%d] delete %s\n' $$ "$id" >> "$debug_log" 2>&1 || true
fi
