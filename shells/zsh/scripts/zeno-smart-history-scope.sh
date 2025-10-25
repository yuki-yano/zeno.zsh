#!/bin/sh
set -eu

state_file=${1:?state file required}
client=${2:-}
cwd=${3:-}
limit=${4:-}
session=${5:-}

[ -n "$client" ] || client=zeno
if ! command -v -- "$client" >/dev/null 2>&1; then
  client=zeno
fi

[ -n "$cwd" ] || cwd=$PWD
[ -n "$limit" ] || limit=2000

scope=$(cat "$state_file" 2>/dev/null || true)
[ -z "$scope" ] && scope=global
case "$scope" in
  global|repository|directory|session) ;;
  *) scope=global ;;
esac

header_dim=$(printf '\033[2m')
header_reset=$(printf '\033[0m')
header_active=$(printf '\033[1;36m')

header=""
for name in global repository directory session; do
  if [ "$name" = "$scope" ]; then
    header="$header ${header_active}[${name}]${header_reset}"
  else
    header="$header ${header_dim}${name}${header_reset}"
  fi
done
header=${header# }

printf '\t%s\n' "$header"

status_seen=0
printed=0

cmd_output_tmp=$(mktemp -t zeno-history-scope.XXXXXX)
trap 'rm -f -- "$cmd_output_tmp"' EXIT INT TERM

if [ -n "$session" ]; then
  "$client" history query --format smart-lines --scope "$scope" --cwd "$cwd" --limit "$limit" --session "$session" >"$cmd_output_tmp" 2>/dev/null || true
else
  "$client" history query --format smart-lines --scope "$scope" --cwd "$cwd" --limit "$limit" >"$cmd_output_tmp" 2>/dev/null || true
fi

while IFS= read -r line; do
  [ -z "$line" ] && continue
  if [ "$line" = "success" ]; then
    status_seen=1
    continue
  fi
  if [ "$status_seen" -eq 0 ]; then
    continue
  fi
  printed=1
  printf '%s\n' "$line"
done <"$cmd_output_tmp"

rm -f -- "$cmd_output_tmp"
trap - EXIT INT TERM

if [ "$printed" -eq 0 ]; then
  empty_dim=$(printf '\033[2m')
  empty_reset=$(printf '\033[0m')
  printf '__empty__\t--\t%s(no entries)%s\t\n' "$empty_dim" "$empty_reset"
fi
