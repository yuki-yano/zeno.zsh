0=${(%):-%N}
source "${0:A:h}/zeno-bootstrap.zsh"

if (( $+functions[zeno-init] )); then
  zeno-init
fi
