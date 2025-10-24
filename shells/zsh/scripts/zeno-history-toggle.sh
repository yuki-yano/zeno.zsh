#!/bin/sh
set -eu

state_file=${1:?state file required}
debug_log=${2:-}

scope=$(cat "$state_file" 2>/dev/null || true)
[ -z "$scope" ] && scope=global
next=global
case "$scope" in
  global) next=repository ;;
  repository) next=directory ;;
  directory) next=session ;;
  session) next=global ;;
  *) next=global ;;
esac
printf "%s\n" "$next" > "$state_file"
if [ -n "$debug_log" ]; then
  printf "[%d] toggle %s -> %s\n" "$$" "$scope" "$next" >> "$debug_log" 2>&1 || true
fi
