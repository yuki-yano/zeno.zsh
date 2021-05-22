export ZENO_DEFAULT_FZF_OPTIONS=""

if ! whence deno > /dev/null; then
  return
fi

path+=${0:a:h}/bin
fpath+=${0:a:h}/shell/snippet/widget
for f in ${0:h}/shell/snippet/widget/*(N-.); do
  local function_name="${f:t}"
  autoload -Uz -- "${function_name}"
  zle -N -- "${function_name}"
done
unset f
