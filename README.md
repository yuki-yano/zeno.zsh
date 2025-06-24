# ![logo](https://user-images.githubusercontent.com/5423775/172536289-50471330-59ca-49ad-96e5-cd87eb5c3adb.png)

Zsh/Fish fuzzy completion and utility plugin with [Deno](https://deno.land/).

## Features

- Insert snippet and abbrev snippet
- Completion with fzf
  - Builtin git completion
  - User defined completion
- ZLE utilities

## Demo

### Abbrev snippet

![zeno](https://user-images.githubusercontent.com/5423775/119225771-e0dfda80-bb40-11eb-8001-f5b575e29707.gif "zeno")

### Completion with fzf

![zeno](https://user-images.githubusercontent.com/5423775/119226132-aaa35a80-bb42-11eb-9b90-1071fce1fc7d.gif "zeno")

## Requirements

- [Deno](https://deno.land/) latest
- [fzf](https://github.com/junegunn/fzf)

## Installation

### zinit

```zsh
zinit ice lucid depth"1" blockf
zinit light yuki-yano/zeno.zsh
```

### git clone

```sh
$ git clone https://github.com/yuki-yano/zeno.zsh.git
$ echo "source /path/to/dir/zeno.zsh" >> ~/.zshrc
```

## Fish Shell Support (Experimental)

zeno now has experimental support for [Fish shell](https://fishshell.com/).

### Installation for Fish

#### Using Fisher (Recommended)

```fish
fisher install yuki-yano/zeno.zsh
```

Fisher will automatically clone the full repository to `~/.local/share/zeno.zsh` and set up the necessary paths.

#### Manual installation

```fish
$ git clone https://github.com/yuki-yano/zeno.zsh.git /path/to/zeno.zsh
$ echo "set -gx ZENO_ROOT /path/to/zeno.zsh" >> ~/.config/fish/config.fish
$ ln -s /path/to/zeno.zsh/shells/fish/conf.d/zeno.fish ~/.config/fish/conf.d/
```

Note: Setting `ZENO_ROOT` explicitly is recommended for manual installations to avoid path resolution issues.

### Configuration for Fish

Copy the example key bindings:

```fish
$ cp /path/to/zeno.zsh/shells/fish/conf.d/zeno-keybindings.fish.example ~/.config/fish/conf.d/zeno-keybindings.fish
```

Or manually set up key bindings in your `config.fish`:

```fish
if test "$ZENO_LOADED" = "1"
    bind ' ' zeno-auto-snippet
    bind \r zeno-auto-snippet-and-accept-line
    bind \t zeno-completion
    bind \cx\x20 zeno-insert-space
end
```

### Available features for Fish

- **Abbrev snippet expansion** - Expand abbreviations with Space key
- **Auto snippet and accept line** - Expand and execute with Enter key
- **Fuzzy completion** - Tab completion with fzf
- **Insert literal space** - Insert space without expansion (Ctrl-X Space)
- **Snippet placeholder navigation** - Navigate through snippet placeholders

### Current limitations for Fish

- Socket mode (ZENO_ENABLE_SOCK) is experimental
- Some widgets are not yet ported:
  - `zeno-history-selection` (Ctrl-R history search)
  - `zeno-ghq-cd` (repository navigation)
  - `zeno-insert-snippet` (snippet list selection)
  - `zeno-toggle-auto-snippet` (toggle auto expansion)
- Key binding syntax differs from Zsh

## Usage

### Abbrev snippet

Require [user configuration file](#user-configuration-file-example)

```sh
$ gs<Space>

Insert
$ git status --short --branch
```

```sh
$ gs<Enter>

Execute
$ git status --short --branch
```

### Completion

```sh
$ git add <Tab>
Git Add Files> ...
```

### Insert snippet

Use zeno-insert-snippet zle

### Search history

Use zeno-history-completion zle

### Change ghq managed repository

Use zeno-ghq-cd zle

## Configuration example

### Completion and abbrev snippet

```zsh
# if defined load the configuration file from there
# export ZENO_HOME=~/.config/zeno

# if disable deno cache command when plugin loaded
# export ZENO_DISABLE_EXECUTE_CACHE_COMMAND=1

# if enable fzf-tmux
# export ZENO_ENABLE_FZF_TMUX=1

# if setting fzf-tmux options
# export ZENO_FZF_TMUX_OPTIONS="-p"

# Experimental: Use UNIX Domain Socket
export ZENO_ENABLE_SOCK=1

# if disable builtin completion
# export ZENO_DISABLE_BUILTIN_COMPLETION=1

# default
export ZENO_GIT_CAT="cat"
# git file preview with color
# export ZENO_GIT_CAT="bat --color=always"

# default
export ZENO_GIT_TREE="tree"
# git folder preview with color
# export ZENO_GIT_TREE="eza --tree"

if [[ -n $ZENO_LOADED ]]; then
  bindkey ' '  zeno-auto-snippet

  # fallback if snippet not matched (default: self-insert)
  # export ZENO_AUTO_SNIPPET_FALLBACK=self-insert

  # if you use zsh's incremental search
  # bindkey -M isearch ' ' self-insert

  bindkey '^m' zeno-auto-snippet-and-accept-line

  bindkey '^i' zeno-completion

  bindkey '^x '  zeno-insert-space
  bindkey '^x^m' accept-line
  bindkey '^x^z' zeno-toggle-auto-snippet

  # fallback if completion not matched
  # (default: fzf-completion if exists; otherwise expand-or-complete)
  # export ZENO_COMPLETION_FALLBACK=expand-or-complete
fi
```

### ZLE widget

```zsh
if [[ -n $ZENO_LOADED ]]; then
  bindkey '^r'   zeno-history-selection
  bindkey '^x^s' zeno-insert-snippet
  bindkey '^x^f' zeno-ghq-cd
fi
```

## Builtin completion

- git
  - add
  - diff
  - diff file
  - checkout
  - checkout file
  - switch
  - reset
  - reset file
  - restore
  - fixup and squash commit
  - rebase
  - merge

See: https://github.com/yuki-yano/zeno.zsh/blob/main/src/completion/source/git.ts

## User configuration file

The configuration file is searched from the following.

- `$ZENO_HOME/config.yml`
- `$XDG_CONFIG_HOME/zeno/config.yml` or `~/.config/zeno/config.yml`
- Find `.../zeno/config.yml` from each in `$XDG_CONFIG_DIRS`

### Example

```sh
$ touch ~/.config/zeno/config.yml
```

and

```yaml
snippets:
  # snippet and keyword abbrev
  - name: git status
    keyword: gs
    snippet: git status --short --branch

  # snippet with placeholder
  - name: git commit message
    keyword: gcim
    snippet: git commit -m '{{commit_message}}'

  - name: "null"
    keyword: "null"
    snippet: ">/dev/null 2>&1"
    # auto expand condition
    # If not defined, it is only valid at the beginning of a line.
    context:
      # buffer: ''
      lbuffer: '.+\s'
      # rbuffer: ''

  - name: branch
    keyword: B
    snippet: git symbolic-ref --short HEAD
    context:
      lbuffer: '^git\s+checkout\s+'
    evaluate: true # eval snippet


completions:
  # simple sourceCommand, no callback
  - name: kill signal
    patterns:
      - "^kill -s $"
    sourceCommand: "kill -l | tr ' ' '\\n'"
    options:
      --prompt: "'Kill Signal> '"

  # use excludePatterns and callback
  - name: kill pid
    patterns:
      - "^kill( .*)? $"
    excludePatterns:
      # -l, -n or -s is followed by SIGNAL instead of PID
      - " -[lns] $"
    sourceCommand: "LANG=C ps -ef | sed 1d"
    options:
      --multi: true
      --prompt: "'Kill Process> '"
    callback: "awk '{print $2}'"

  # Use null (\0) termination Input / Output
  - name: chdir
    patterns:
      - "^cd $"
    sourceCommand: "find . -path '*/.git' -prune -o -maxdepth 5 -type d -print0"
    options:
      # Added --read0 if null termination is used in `sourceCommand` output.
      --read0: true
      --prompt: "'Chdir> '"
      --preview: "cd {} && ls -a | sed '/^[.]*$/d'"
    callback: "cut -z -c 3-"
    callbackZero: true  # null termination is used in `callback` I/O
```

## FAQ

Q: [zsh-syntax-highlighting](https://github.com/zsh-users/zsh-syntax-highlighting) does not work well.

A: Use [fast-syntax-highlighting](https://github.com/zdharma-continuum/fast-syntax-highlighting) instead.

## Related project

- [fzf](https://github.com/junegunn/fzf)
- [fzf-tab](https://github.com/Aloxaf/fzf-tab)
- [fzf-zsh-completions](https://github.com/chitoku-k/fzf-zsh-completions)
- [pmy](https://github.com/relastle/pmy/)
- [zabrze](https://github.com/Ryooooooga/zabrze)
