#!/bin/sh
set -eu

state_file=${1:?state file required}
global_file=${2:?global file required}
repository_file=${3:?repository file required}
directory_file=${4:?directory file required}
session_file=${5:?session file required}

scope=$(cat "$state_file" 2>/dev/null || true)
[ -z "$scope" ] && scope=global
case "$scope" in
  global) target="$global_file" ;;
  repository) target="$repository_file" ;;
  directory) target="$directory_file" ;;
  session) target="$session_file" ;;
  *) target="$global_file" ;;
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

tab=$(printf '\t')
esc=$(printf '\033')

filter_stream() {
  while IFS= read -r line; do
    case "$line" in
      "${tab}scope:"*|"${tab}${esc}[2m"scope:*|"${esc}[2m"scope:*|scope:*)
        continue
        ;;
    esac
    printf '%s\n' "$line"
  done
}

if [ -f "$target" ]; then
  filter_stream <"$target"
fi

tail -n 0 -F "$target" | filter_stream
