# ![logo](https://user-images.githubusercontent.com/5423775/172536289-50471330-59ca-49ad-96e5-cd87eb5c3adb.png)

Zsh/Fish fuzzy completion and utility plugin with [Deno](https://deno.land/).

## Features

- Insert snippet and abbrev snippet
- Completion with fzf
  - Builtin git completion
  - User defined completion
- ZLE utilities
- Persistent preprompt prefix (placeholder jump)
- Smart History Selection (global / repository / directory / session scopes, delete, export/import)

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

Fish support is experimental. A quick overview is included here; full
installation and configuration details are available later in the document.

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

### Preprompt prefix

- Bind a key to `zeno-preprompt` (example: `bindkey '^xp' zeno-preprompt`).
- Invoke it with a non-empty buffer to save that text as the next prompt prefix (a space is auto-appended).
- Start typing on the next line with the prefix already inserted; call the widget again with an empty buffer to reset.
- You can embed `{{placeholder}}` in the prefix; the first one is replaced and the cursor starts there. Use the existing `next-placeholder` widget to jump through the remaining placeholders.
- Use `zeno-preprompt-snippet` to pick a configured snippet (via fzf or by passing a snippet name as an argument) and set it as the next prompt prefix.

### History Selection

- Press `Ctrl-R` to open the classic History widget.
- Fzf searches the command column; press Enter to paste the selected command into the prompt immediately.
- The classic picker operates directly on your shell history (`HISTFILE`) and does not depend on the SQLite subsystem.

### Smart History Selection (Experimental)

- Press `Ctrl-R` to open the Smart History Search widget; press it again to cycle the scope in the order `global → repository → directory → session`.
- Search the command column (fzf ignores the time column), and press Enter to paste the raw command into your prompt.
- Press `Ctrl-D` for a soft delete (logical delete) or `Alt-D` for a hard delete that also edits your `HISTFILE`.
- Use `zeno history query|log|delete|export|import` to work directly with the SQLite-backed history from scripts.
- Configure `history.fzf_command` / `history.fzf_options` in your YAML or TypeScript config to override the fzf (or fzf-tmux) command and its options.

### Change ghq managed repository

Use zeno-ghq-cd zle

**Note:** By default, when running inside a tmux session, `zeno-ghq-cd` automatically renames the tmux session to match the selected repository name. To disable this behavior, set `ZENO_DISABLE_GHQ_CD_TMUX_RENAME=1`.

## Configuration files

zeno loads configuration files from the project and user config directories and
merges them in priority order. If the current workspace has a `.zeno/`
directory, its contents are loaded first, followed by the user config directory
(`$ZENO_HOME` or `~/.config/zeno/`), and finally any XDG config directories.
Within each location, files are merged alphabetically. Both YAML (`*.yml`,
`*.yaml`) and TypeScript (`*.ts`) files are supported, so you can pick the
format that suits your workflow. TypeScript configs can import `defineConfig`
and types from `jsr:@yuki-yano/zeno`, giving you access to the full
`ConfigContext` for dynamic setups.

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

# by default a unix domain socket is used
# if disable it
# export ZENO_DISABLE_SOCK=1

# if disable builtin completion
# export ZENO_DISABLE_BUILTIN_COMPLETION=1

# if disable tmux session renaming in zeno-ghq-cd
# export ZENO_DISABLE_GHQ_CD_TMUX_RENAME=1

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

  bindkey '^xx' zeno-insert-snippet           # open snippet picker (fzf) and insert at cursor

  bindkey '^x '  zeno-insert-space
  bindkey '^x^m' accept-line
  bindkey '^x^z' zeno-toggle-auto-snippet

  # preprompt bindings
  bindkey '^xp' zeno-preprompt
  bindkey '^xs' zeno-preprompt-snippet
  # Outside ZLE you can run `zeno-preprompt git {{cmd}}` or `zeno-preprompt-snippet foo`
  # to set the next prompt prefix; invoking them with an empty argument resets the state.

  bindkey '^r' zeno-history-selection         # classic history widget
  # bindkey '^r' zeno-smart-history-selection # smart history widget

  # fallback if completion not matched
  # (default: fzf-completion if exists; otherwise expand-or-complete)
  # export ZENO_COMPLETION_FALLBACK=expand-or-complete
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

See:
[src/completion/source/git.ts](https://github.com/yuki-yano/zeno.zsh/blob/main/src/completion/source/git.ts)

## User configuration file

The configuration files are discovered and merged in the following order.

- If the detected project root contains a `.zeno/` directory, load all
  `.zeno/*.yml`/`*.yaml`/`*.ts` (A→Z).
- If `$ZENO_HOME` is a directory, merge all `*.yml`/`*.yaml`/`*.ts` directly
  under it.
- For each path in `$XDG_CONFIG_DIRS`, if `zeno/` exists, merge all
  `zeno/*.yml`/`*.yaml`/`*.ts` (directories are processed in the order provided
  by XDG).
- Fallbacks for backward compatibility (used only when no files were found in
  the locations above):
  - `$ZENO_HOME/config.yml`
  - `$XDG_CONFIG_HOME/zeno/config.yml` or `~/.config/zeno/config.yml`
  - Find `.../zeno/config.yml` from each in `$XDG_CONFIG_DIRS`

### Example (YAML)

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
    callbackZero: true # null termination is used in `callback` I/O
```

TypeScript config files can also replace `sourceCommand` with a `sourceFunction`
that returns completion candidates programmatically. The function receives the
same `ConfigContext` as `defineConfig` and may return a `ReadonlyArray<string>`
or a `Promise` of it. Only one of `sourceCommand` or `sourceFunction` can be
specified for a completion.

### Example (TypeScript)

TypeScript configs can be split into multiple files. Each file returns a partial
`Settings` object and zeno merges them in alphabetical order.

```ts
// ~/.config/zeno/10-snippets.ts
import { defineConfig } from "jsr:@yuki-yano/zeno";

export default defineConfig(({ projectRoot, currentDirectory }) => ({
  snippets: [
    {
      name: "git status",
      keyword: "gs",
      snippet: "git status --short --branch",
    },
    {
      name: "branch",
      keyword: "B",
      snippet: "git symbolic-ref --short HEAD",
      context: { lbuffer: "^git\\s+checkout\\s+" },
      evaluate: true,
    },
    {
      name: "null",
      keyword: "null",
      snippet: ">/dev/null 2>&1",
      context: { lbuffer: ".+\\s" },
    },
  ],
}));
```

```ts
// ~/.config/zeno/20-completions.ts
import { defineConfig } from "jsr:@yuki-yano/zeno";
import { join } from "jsr:@std/path@^1.0.0/join";

export default defineConfig(({ projectRoot, currentDirectory }) => ({
  completions: [
    {
      name: "kill signal",
      patterns: ["^kill -s $"],
      sourceCommand: "kill -l | tr ' ' '\\n'",
      options: { "--prompt": "'Kill Signal> '" },
    },
    {
      name: "kill pid",
      patterns: ["^kill( .*)? $"],
      excludePatterns: [" -[lns] $"],
      sourceCommand: "LANG=C ps -ef | sed 1d",
      options: { "--multi": true, "--prompt": "'Kill Process> '" },
      callback: "awk '{print $2}'",
    },
    {
      name: "chdir",
      patterns: ["^cd $"],
      sourceCommand:
        "find . -path '*/.git' -prune -o -maxdepth 5 -type d -print0",
      options: {
        "--read0": true,
        "--prompt": "'Chdir> '",
        "--preview": "cd {} && ls -a | sed '/^[.]*$/d'",
      },
      callback: "cut -z -c 3-",
      callbackZero: true,
    },
    {
      name: "npm scripts",
      patterns: ["^npm run $"],
      sourceFunction: async ({ projectRoot }) => {
        try {
          const pkgPath = join(projectRoot, "package.json");
          const pkg = JSON.parse(
            await Deno.readTextFile(pkgPath),
          ) as { scripts?: Record<string, unknown> };
          return Object.keys(pkg.scripts ?? {});
        } catch {
          return [];
        }
      },
      options: { "--prompt": "'npm scripts> '" },
      callback: "npm run {{}}",
    },
  ],
}));
```

### Smart History Selection settings (Experimental)

Configure the `zeno-smart-history-selection` and the `zeno history …` CLI—via a `history` block in your `zeno.config.yml`:

```yaml
history:
  defaultScope: global        # "global" | "repository" | "directory" | "session"
  fzfCommand: fzf-tmux        # Override the command that spawns the picker
  fzfOptions:
    - "-p 50%,50%"            # Additional arguments passed to the picker command
  redact: []                  # Strings to hide from the History view
  keymap:
    deleteSoft: ctrl-d        # Soft delete (logical delete)
    deleteHard: alt-d         # Hard delete (edits HISTFILE)
    toggleScope: ctrl-r       # Cycle through scopes within the widget
    togglePreview: ?          # Toggle the preview window
```

## Fish usage

### Installation for Fish

#### Using Fisher (Recommended)

```fish
fisher install yuki-yano/zeno.zsh
```

Fisher will automatically clone the full repository to `~/.local/share/zeno.zsh`
and set up the necessary paths.

#### Manual installation

```fish
git clone https://github.com/yuki-yano/zeno.zsh.git /path/to/zeno.zsh
echo "set -gx ZENO_ROOT /path/to/zeno.zsh" >> ~/.config/fish/config.fish
ln -s /path/to/zeno.zsh/shells/fish/conf.d/zeno.fish ~/.config/fish/conf.d/
```

Note: Setting `ZENO_ROOT` explicitly is recommended for manual installations to
avoid path resolution issues.

### Configuration for Fish

Copy the example key bindings:

```fish
cp /path/to/zeno.zsh/shells/fish/conf.d/zeno-keybindings.fish.example ~/.config/fish/conf.d/zeno-keybindings.fish
```

Or manually set up key bindings in your `config.fish`:

```fish
if test "$ZENO_LOADED" = "1"
    bind ' ' zeno-auto-snippet
    bind \r zeno-auto-snippet-and-accept-line
    bind \t zeno-completion
    bind \cx\x20 zeno-insert-space
end

# Optional: Disable tmux session renaming in zeno-ghq-cd
# set -gx ZENO_DISABLE_GHQ_CD_TMUX_RENAME 1
```

### Available features for Fish

- **Abbrev snippet expansion** - Expand abbreviations with Space key
- **Auto snippet and accept line** - Expand and execute with Enter key
- **Fuzzy completion** - Tab completion with fzf
- **Insert literal space** - Insert space without expansion (Ctrl-X Space)
- **Snippet placeholder navigation** - Navigate through snippet placeholders
- **History selection** - Fuzzy search command history (Ctrl-R)
- **GHQ repository navigation** - Navigate to ghq-managed repositories
- **Insert snippet** - Select and insert snippets from list
- **Toggle auto snippet** - Enable/disable automatic snippet expansion

### Current limitations for Fish

- Socket mode is enabled by default (disable with ZENO_DISABLE_SOCK=1)
- Key binding syntax differs from Zsh

## FAQ

Q:
[zsh-syntax-highlighting](https://github.com/zsh-users/zsh-syntax-highlighting)
does not work well.

A: Use
[fast-syntax-highlighting](https://github.com/zdharma-continuum/fast-syntax-highlighting)
instead.

## Related project

- [fzf](https://github.com/junegunn/fzf)
- [fzf-tab](https://github.com/Aloxaf/fzf-tab)
- [fzf-zsh-completions](https://github.com/chitoku-k/fzf-zsh-completions)
- [pmy](https://github.com/relastle/pmy/)
- [zabrze](https://github.com/Ryooooooga/zabrze)

## Inspiration

- Preprompt feature inspired by [by-binds-yourself](https://github.com/atusy/by-binds-yourself)
