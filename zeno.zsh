source "${${(%):-%N}:A:h}/zeno-bootstrap.zsh"

if (( $+functions[zeno-init] )); then
  zeno-init
fi
