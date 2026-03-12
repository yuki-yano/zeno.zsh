# ![logo](https://user-images.githubusercontent.com/5423775/172536289-50471330-59ca-49ad-96e5-cd87eb5c3adb.png)

[English](README.md) | [日本語](README.ja.md)

[Deno](https://deno.land/) で動作する、Zsh/Fish 向けのファジー補完・ユーティリティプラグインです。

## 特徴

- snippet と abbrev snippet の挿入
- `fzf` を使った補完
  - 組み込みの git 補完
  - ユーザー定義の補完
- ZLE ユーティリティ
- 永続的な preprompt prefix（プレースホルダージャンプ対応）
- Smart History Selection（global / repository / directory / session スコープ、削除、export/import 対応）

## デモ

### Abbrev snippet

![zeno](https://user-images.githubusercontent.com/5423775/119225771-e0dfda80-bb40-11eb-8001-f5b575e29707.gif "zeno")

### `fzf` による補完

![zeno](https://user-images.githubusercontent.com/5423775/119226132-aaa35a80-bb42-11eb-9b90-1071fce1fc7d.gif "zeno")

## 必要条件

- 最新の [Deno](https://deno.land/)
- [fzf](https://github.com/junegunn/fzf)

## インストール

### zinit

```zsh
zinit ice lucid depth"1" blockf
zinit light yuki-yano/zeno.zsh
```

### `git clone`

```sh
$ git clone https://github.com/yuki-yano/zeno.zsh.git
$ echo "source /path/to/dir/zeno.zsh" >> ~/.zshrc
```

`source /path/to/dir/zeno.zsh` はデフォルトのインストール方法のままで、
初期化は従来どおり eager にすべて実行されます。既存ユーザーも設定を変えずに更新できます。

### Zsh で lazy-load する

lazy-load したい場合は `zeno-bootstrap.zsh` を source し、upstream の lazy key API を使ってください。

```zsh
source /path/to/dir/zeno-bootstrap.zsh
zeno-bind-default-keys --lazy
zsh-defer zeno-preload
```

独自に bind する場合:

```zsh
source /path/to/dir/zeno-bootstrap.zsh
zeno-register-lazy-widget zeno-completion
bindkey '^i' zeno-completion
```

state 変数、公開 API、fallback 動作の詳細は
[Zsh 向け lazy-load API](#lazy-load-apis-for-zsh) を参照してください。

## Fish Shell 対応（実験的）

Fish 対応は実験的です。ここでは概要だけを示し、完全なインストール方法と設定方法は後半で説明します。

## 使い方

### Abbrev snippet

[ユーザー設定ファイル](#user-configuration-file) が必要です。

```sh
$ gs<Space>

挿入
$ git status --short --branch
```

```sh
$ gs<Enter>

実行
$ git status --short --branch
```

### 補完

```sh
$ git add <Tab>
Git Add Files> ...
```

### snippet の挿入

`zeno-insert-snippet` ZLE を使います。

### Preprompt prefix

- `zeno-preprompt` にキーを割り当てます（例: `bindkey '^xp' zeno-preprompt`）。
- 空でないバッファで実行すると、そのテキストが次のプロンプトの prefix として保存されます（末尾のスペースは自動追加）。
- 次の行では prefix が挿入済みの状態で入力を始められ、空のバッファで再度ウィジェットを呼ぶとリセットされます。
- prefix に `{{placeholder}}` を埋め込むと、最初のプレースホルダーが置き換えられ、その位置からカーソルが始まります。残りは既存の `next-placeholder` ウィジェットで移動できます。
- `zeno-preprompt-snippet` を使うと、設定済み snippet を選択（`fzf` または引数の snippet 名）して次の prompt prefix に設定できます。

### History Selection

- `Ctrl-R` で従来の History ウィジェットを開きます。
- `fzf` は command カラムを検索し、Enter で選択したコマンドをそのままプロンプトに貼り付けます。
- 従来の picker は shell の履歴ファイル（`HISTFILE`）を直接使い、SQLite サブシステムには依存しません。

### Smart History Selection（実験的）

- `Ctrl-R` で Smart History Search ウィジェットを開き、もう一度押すと `global → repository → directory → session` の順でスコープが切り替わります。
- command カラムを検索します（`fzf` は time カラムを無視します）。Enter を押すと生のコマンドがプロンプトに貼り付けられます。
- `Ctrl-D` で soft delete（論理削除）、`Alt-D` で `HISTFILE` も編集する hard delete を実行できます。
- `zeno history query|log|delete|export|import` を使うと、SQLite ベースの履歴をスクリプトから直接操作できます。
- YAML / TypeScript 設定の `history.fzf_command` / `history.fzf_options` で、`fzf`（または `fzf-tmux`）コマンドとオプションを上書きできます。

### ghq 管理リポジトリへ移動

`zeno-ghq-cd` ZLE を使います。

#### `ghq-cd` の post-hook

ディレクトリ移動後に独自処理を実行したい場合は、post-hook を登録できます。

**Zsh の場合:**

`zeno-ghq-cd-post-hook` という名前の ZLE ウィジェットを登録します。

```zsh
# 例: tmux セッション名をリポジトリ名に変更する
function zeno-ghq-cd-post-hook-impl() {
  local dir="$ZENO_GHQ_CD_DIR"
  if [[ -n $TMUX ]]; then
    local repository=${dir:t}
    local session=${repository//./-}
    tmux rename-session "${session}"
  fi
}

zle -N zeno-ghq-cd-post-hook zeno-ghq-cd-post-hook-impl
```

**Fish の場合:**

`zeno-ghq-cd-post-hook` という名前の function を定義します。

```fish
# 例: tmux セッション名をリポジトリ名に変更する
function zeno-ghq-cd-post-hook
    set -l dir "$ZENO_GHQ_CD_DIR"
    if set -q TMUX
        set -l repository (basename "$dir")
        set -l session (string replace -a '.' '-' $repository)
        tmux rename-session "$session" 2>/dev/null
    end
end
```

hook からは `ZENO_GHQ_CD_DIR` 環境変数を通じて、選択したディレクトリパスを参照できます。

## 設定ファイル

zeno はプロジェクト設定ディレクトリとユーザー設定ディレクトリから設定ファイルを読み込み、優先順位順にマージします。
ワークスペース設定ディレクトリは `ZENO_LOCAL_CONFIG_PATH` で明示指定できます。未指定の場合は、検出したプロジェクトルート配下の `.zeno/` を読み込みます（`ZENO_DISABLE_AUTOMATIC_WORKSPACE_LOOKUP='1'` で無効化可能）。
ワークスペース設定の読み込み後に、ユーザー設定ディレクトリ（`$ZENO_HOME` または `~/.config/zeno/`）、最後に XDG の設定ディレクトリ群を読み込みます。
各場所の中ではファイルはアルファベット順でマージされます。YAML（`*.yml`, `*.yaml`）と TypeScript（`*.ts`）の両方に対応しているため、ワークフローに合わせて形式を選べます。
TypeScript 設定では `jsr:@yuki-yano/zeno` から `defineConfig` と型を import でき、動的な設定のために完全な `ConfigContext` を利用できます。

## 設定例

### 補完と abbrev snippet

```zsh
# 定義されていれば、その場所から設定ファイル群を読み込む
# export ZENO_HOME=~/.config/zeno

# プラグイン読み込み時の deno cache 実行を無効化する場合
# export ZENO_DISABLE_EXECUTE_CACHE_COMMAND=1

# fzf-tmux を有効化する場合
# export ZENO_ENABLE_FZF_TMUX=1

# fzf-tmux のオプションを設定する場合
# export ZENO_FZF_TMUX_OPTIONS="-p"

# デフォルトでは Unix Domain Socket を使う
# 無効化する場合
# export ZENO_DISABLE_SOCK=1

# socket client read のタイムアウト秒数（小数可）
# デフォルト: 0.3
# export ZENO_CLIENT_TIMEOUT_SECONDS=0.3

# 組み込み補完を無効化する場合
# export ZENO_DISABLE_BUILTIN_COMPLETION=1

# projectRoot/.zeno の自動探索を無効化する場合
# export ZENO_DISABLE_AUTOMATIC_WORKSPACE_LOOKUP=1

# ワークスペースローカル設定を明示的なディレクトリから読み込む
# 絶対パス、または project root からの相対パス
# export ZENO_LOCAL_CONFIG_PATH=.zeno

# デフォルト
export ZENO_GIT_CAT="cat"
# 色付きで git ファイルプレビュー
# export ZENO_GIT_CAT="bat --color=always"

# デフォルト
export ZENO_GIT_TREE="tree"
# 色付きで git ディレクトリプレビュー
# export ZENO_GIT_TREE="eza --tree"

# upstream デフォルトのキーセット
# zeno-bind-default-keys

# upstream lazy キーセット
# source /path/to/dir/zeno-bootstrap.zsh
# zeno-bind-default-keys --lazy
# zsh-defer zeno-preload

if [[ -n $ZENO_LOADED ]]; then
  bindkey ' '  zeno-auto-snippet

  # snippet が一致しなかった場合の fallback（デフォルト: self-insert）
  # export ZENO_AUTO_SNIPPET_FALLBACK=self-insert

  # zsh の incremental search を使っている場合
  # bindkey -M isearch ' ' self-insert

  bindkey '^m' zeno-auto-snippet-and-accept-line

  bindkey '^i' zeno-completion

  bindkey '^xx' zeno-insert-snippet           # snippet picker（fzf）を開いてカーソル位置へ挿入

  bindkey '^x '  zeno-insert-space
  bindkey '^x^m' accept-line
  bindkey '^x^z' zeno-toggle-auto-snippet

  # preprompt の bind
  bindkey '^xp' zeno-preprompt
  bindkey '^xs' zeno-preprompt-snippet
  # ZLE 外では `zeno-preprompt git {{cmd}}` や `zeno-preprompt-snippet foo`
  # を実行して次の prompt prefix を設定できます。空引数で呼ぶと状態をリセットします。

  bindkey '^r' zeno-history-selection         # 従来の history widget
  # bindkey '^r' zeno-smart-history-selection # smart history widget

  # completion が一致しなかった場合の fallback
  # （デフォルト: あれば fzf-completion、なければ expand-or-complete）
  # export ZENO_COMPLETION_FALLBACK=expand-or-complete
fi
```

## 組み込み補完

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

参照:
[src/completion/source/git.ts](https://github.com/yuki-yano/zeno.zsh/blob/main/src/completion/source/git.ts)

<a id="user-configuration-file"></a>

## ユーザー設定ファイル

設定ファイルは次の順序で検出・マージされます。

- `$ZENO_LOCAL_CONFIG_PATH` が設定されている場合は、
  `<resolved-path>/*.yml` / `*.yaml` / `*.ts` をすべて読み込みます（A→Z）。
  - 絶対パスはそのまま使われます。
  - 相対パスは検出したプロジェクトルート基準で解決されます。
- `$ZENO_LOCAL_CONFIG_PATH` が未設定で、かつ
  `$ZENO_DISABLE_AUTOMATIC_WORKSPACE_LOOKUP` が `'1'` ではなく、
  検出したプロジェクトルートに `.zeno/` がある場合は、
  `.zeno/*.yml` / `*.yaml` / `*.ts` を読み込みます（A→Z）。
- `$ZENO_HOME` がディレクトリであれば、その直下の `*.yml` / `*.yaml` / `*.ts` をすべてマージします。
- `$XDG_CONFIG_DIRS` の各パスについて `zeno/` が存在すれば、
  `zeno/*.yml` / `*.yaml` / `*.ts` をすべてマージします
  （ディレクトリの処理順は XDG が与える順序に従います）。
- 後方互換のための fallback（上記の場所で 1 件もファイルが見つからなかった場合のみ使用）:
  - `$ZENO_HOME/config.yml`
  - `$XDG_CONFIG_HOME/zeno/config.yml` または `~/.config/zeno/config.yml`
  - `$XDG_CONFIG_DIRS` の各パスから `.../zeno/config.yml` を探索

### 例（YAML）

1 ファイルにまとめてもよいですし、`10-snippets.yml` と
`20-completions.yml` のように複数 YAML に分割しても構いません。
YAML は各設定ディレクトリ直下だけを対象に、ファイル名のアルファベット順でマージされます。

```sh
$ touch ~/.config/zeno/10-snippets.yml
$ touch ~/.config/zeno/20-completions.yml
```

例えば次のように分けられます。

```yaml
# ~/.config/zeno/10-snippets.yml
snippets:
  # snippet と keyword abbrev
  - name: git status
    keyword: gs
    snippet: git status --short --branch

  # プレースホルダー付き snippet
  - name: git commit message
    keyword: gcim
    snippet: git commit -m '{{commit_message}}'

  - name: "null"
    keyword: "null"
    snippet: ">/dev/null 2>&1"
    # auto expand 条件
    # 未定義なら行頭でのみ有効
    context:
      # buffer: ''
      lbuffer: '.+\s'
      # rbuffer: ''

  - name: branch
    keyword: B
    snippet: git symbolic-ref --short HEAD
    context:
      lbuffer: '^git\s+checkout\s+'
    evaluate: true # snippet を eval する
```

```yaml
# ~/.config/zeno/20-completions.yml
completions:
  # callback なしの単純な sourceCommand
  - name: kill signal
    patterns:
      - "^kill -s $"
    sourceCommand: "kill -l | tr ' ' '\\n'"
    options:
      --prompt: "'Kill Signal> '"

  # excludePatterns と callback を使う
  - name: kill pid
    patterns:
      - "^kill( .*)? $"
    excludePatterns:
      # -l, -n, -s の後ろは PID ではなく SIGNAL
      - " -[lns] $"
    sourceCommand: "LANG=C ps -ef | sed 1d"
    options:
      --multi: true
      --prompt: "'Kill Process> '"
    callback: "awk '{print $2}'"

  # Input / Output に null (\0) 終端を使う
  - name: chdir
    patterns:
      - "^cd $"
    sourceCommand: "find . -path '*/.git' -prune -o -maxdepth 5 -type d -print0"
    options:
      # `sourceCommand` の出力が null 終端なら `--read0` を追加
      --read0: true
      --prompt: "'Chdir> '"
      --preview: "cd {} && ls -a | sed '/^[.]*$/d'"
    callback: "cut -z -c 3-"
    callbackZero: true # `callback` の I/O でも null 終端を使う
```

TypeScript 設定では `sourceCommand` の代わりに `sourceFunction` を使い、
補完候補をプログラムで返すこともできます。関数には `defineConfig` と同じ `ConfigContext` が渡され、
`ReadonlyArray<string>` またはその `Promise` を返せます。
1 つの completion では `sourceCommand` と `sourceFunction` のどちらか一方だけを指定できます。

選択値の後処理には、TypeScript 設定で shell の `callback` の代わりに `callbackFunction` を使えます。

- `callback` / `callbackZero` と `callbackFunction` は排他的です
- `callbackFunction` には `{ selected, context, lbuffer, rbuffer, expectKey }` が渡されます
- `callbackFunction` は `ReadonlyArray<string>`（またはその `Promise`）を返す必要があります
- `previewFunction` には `{ item, context, lbuffer, rbuffer }` が渡されます
- `previewFunction` はプレビューテキストを `string`（またはその `Promise`）で返す必要があります
- `previewFunction` と静的プレビューオプション（`preview` / `options["--preview"]`）は排他的です

### 例（TypeScript）

TypeScript 設定は複数ファイルに分割できます。各ファイルは部分的な `Settings` オブジェクトを返し、
zeno がファイル名のアルファベット順にマージします。

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
      callbackFunction: ({ selected, expectKey }) => {
        if (expectKey === "alt-enter") {
          return selected.map((script) => `${script} -- --watch`);
        }
        return selected;
      },
      previewFunction: async ({ item, context }) => {
        try {
          const pkgPath = join(context.projectRoot, "package.json");
          const pkg = JSON.parse(
            await Deno.readTextFile(pkgPath),
          ) as { scripts?: Record<string, string> };
          const script = pkg.scripts?.[item];
          return script ? `${item}\n${script}` : item;
        } catch {
          return item;
        }
      },
    },
  ],
}));
```

### Smart History Selection の設定（実験的）

`zeno-smart-history-selection` ウィジェットと `zeno history …` CLI は、
読み込まれる任意の YAML / TypeScript 設定ファイル内の `history` ブロックで設定します。

```yaml
history:
  defaultScope: global        # "global" | "repository" | "directory" | "session"
  fzfCommand: fzf-tmux        # picker を起動するコマンドを上書き
  fzfOptions:
    - "-p 50%,50%"            # picker コマンドに渡す追加引数
  redact: []                  # History 表示で隠す文字列
  keymap:
    deleteSoft: ctrl-d        # soft delete（論理削除）
    deleteHard: alt-d         # hard delete（HISTFILE も編集）
    toggleScope: ctrl-r       # widget 内でスコープを切り替え
    togglePreview: ?          # プレビューウィンドウの表示切替
```

<a id="lazy-load-apis-for-zsh"></a>

## Zsh 向け lazy-load API

公開 state:

- `ZENO_BOOTSTRAPPED=1`: bootstrap が完了し、zeno の function / widget が利用可能
- `ZENO_LOADED=1`: heavy init が完了し、socket / history / preprompt が利用可能

Bootstrap（`source zeno-bootstrap.zsh`）:

- `ZENO_ROOT` を設定
- `bin` / `fpath` を追加
- function と widget を autoload
- 元の名前のまま ZLE widget を登録
- `ZENO_BOOTSTRAPPED=1` を設定

Heavy init（`zeno-init` / `zeno-ensure-loaded`）:

- 任意の `deno cache`
- socket のセットアップ（`zeno-enable-sock`）
- history hook（`zeno-history-hooks`）
- preprompt hook（`zeno-preprompt-hooks`）
- `ZENO_LOADED=1` を設定

公開 API:

- `zeno-init`
- `zeno-ensure-loaded`
- `zeno-preload`
- `zeno-register-lazy-widget <widget>`
- `zeno-register-lazy-widgets <widget>...`
- `zeno-bind-default-keys`
- `zeno-bind-default-keys --lazy`

組み込みの lazy fallback 動作:

- `zeno-completion` -> `ZENO_COMPLETION_FALLBACK`、未設定なら `fzf-completion` または `expand-or-complete`
- `zeno-auto-snippet` -> `ZENO_AUTO_SNIPPET_FALLBACK`、未設定なら `self-insert`
- `zeno-auto-snippet-and-accept-line` -> `accept-line`
- `zeno-history-selection` -> `history-incremental-search-backward`
- `zeno-smart-history-selection` -> `zeno-history-selection`、なければ `history-incremental-search-backward`
- `zeno-insert-space` -> リテラルのスペース挿入

これにより widget 名は変わらないため、eager / lazy のどちらの構成でも
`bindkey '^i' zeno-completion` のような bind をそのまま使えます。

## Fish の使い方

### Fish 向けインストール

#### Fisher を使う（推奨）

```fish
fisher install yuki-yano/zeno.zsh
```

Fisher はリポジトリ全体を `~/.local/share/zeno.zsh` に自動で clone し、
必要なパス設定も行います。

#### 手動インストール

```fish
git clone https://github.com/yuki-yano/zeno.zsh.git /path/to/zeno.zsh
echo "set -gx ZENO_ROOT /path/to/zeno.zsh" >> ~/.config/fish/config.fish
ln -s /path/to/zeno.zsh/shells/fish/conf.d/zeno.fish ~/.config/fish/conf.d/
```

注: 手動インストールでは、パス解決の問題を避けるために `ZENO_ROOT` を明示的に設定することを推奨します。

### Fish 向け設定

サンプルのキーバインドをコピーします。

```fish
cp /path/to/zeno.zsh/shells/fish/conf.d/zeno-keybindings.fish.example ~/.config/fish/conf.d/zeno-keybindings.fish
```

あるいは `config.fish` に手動でキーバインドを設定します。

```fish
if test "$ZENO_LOADED" = "1"
    bind ' ' zeno-auto-snippet
    bind \r zeno-auto-snippet-and-accept-line
    bind \t zeno-completion
    bind \cx\x20 zeno-insert-space
end
```

### Fish で利用できる機能

- **Abbrev snippet expansion**: Space キーで省略展開
- **Auto snippet and accept line**: Enter キーで展開して実行
- **Fuzzy completion**: `fzf` を使った Tab 補完
- **Insert literal space**: 展開せずにスペースを挿入（Ctrl-X Space）
- **Snippet placeholder navigation**: snippet のプレースホルダーを移動
- **History selection**: コマンド履歴をファジー検索（Ctrl-R）
- **GHQ repository navigation**: ghq 管理リポジトリへ移動
- **Insert snippet**: 一覧から snippet を選んで挿入
- **Toggle auto snippet**: 自動 snippet 展開の有効/無効切替

### Fish の現状の制限

- socket モードはデフォルトで有効です（`ZENO_DISABLE_SOCK=1` で無効化）
- キーバインド構文は Zsh と異なります

## FAQ

Q:
[zsh-syntax-highlighting](https://github.com/zsh-users/zsh-syntax-highlighting)
との相性がよくありません。

A:
[fast-syntax-highlighting](https://github.com/zdharma-continuum/fast-syntax-highlighting)
の利用を推奨します。

## 関連プロジェクト

- [fzf](https://github.com/junegunn/fzf)
- [fzf-tab](https://github.com/Aloxaf/fzf-tab)
- [fzf-zsh-completions](https://github.com/chitoku-k/fzf-zsh-completions)
- [pmy](https://github.com/relastle/pmy/)
- [zabrze](https://github.com/Ryooooooga/zabrze)

## Inspiration

- Preprompt 機能は [by-binds-yourself](https://github.com/atusy/by-binds-yourself) に着想を得ています
