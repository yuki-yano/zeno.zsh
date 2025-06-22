# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

zeno.zsh is a multi-shell fuzzy completion and utility plugin built with Deno. Originally developed for Zsh, it now includes experimental support for Fish shell. It provides:
- Snippet management and abbreviation expansion
- Fuzzy completion using fzf
- Git completion support
- Shell line editor utilities (ZLE for Zsh, commandline for Fish)

## Development Commands

### Testing
```bash
# Run all tests
make test

# Run a specific test file
deno test --no-check --unstable-byonm --allow-env --allow-read --allow-run --allow-write test/command_test.ts
```

### Code Quality
```bash
# Format code
make fmt

# Check formatting
make fmt-check

# Lint code
make lint

# Type check
make type-check

# Run all CI checks (format check, lint, type check, and tests)
make ci
```

### Running Before Commits
```bash
make precommit  # Runs formatting
```

## Architecture

### Core Components

1. **Main Entry Points**
   - `src/app.ts`: Core application logic implementing command modes (snippet-list, auto-snippet, insert-snippet, completion, etc.)
   - `src/cli.ts`: CLI entry point
   - `src/server.ts`: Unix socket server implementation (when ZENO_ENABLE_SOCK=1)

2. **Shell Integration**
   - `zeno.zsh`: Main plugin file for Zsh that sets up paths, autoloads functions and widgets
   - `shells/zsh/functions/`: Core Zsh functions (zeno, zeno-server, etc.)
   - `shells/zsh/widgets/`: ZLE widgets for various features
   - `shells/fish/conf.d/zeno.fish`: Main plugin file for Fish shell
   - `shells/fish/functions/`: Fish functions that implement features similar to Zsh widgets
   - `shells/fish/conf.d/zeno-keybindings.fish.example`: Example key bindings for Fish

3. **Feature Modules**
   - `src/snippet/`: Snippet management (auto-snippet, insert-snippet, placeholder navigation)
   - `src/completion/`: Completion system with git source support
   - `src/fzf/`: FZF integration and option conversion

4. **Communication Flow**
   - Shell functions communicate with Deno process via command line arguments or Unix socket
   - Results are written back to stdout for shell consumption
   - Socket mode (ZENO_ENABLE_SOCK=1) provides persistent server for better performance

## Key Implementation Details

- Uses Deno's `--unstable-byonm` flag for "Bring Your Own Node Modules"
- Supports both CLI mode and Unix socket server mode for performance
- Configuration is loaded from YAML files in standard config directories
- All text output uses a custom write function that supports formatting

## Multi-Shell Support

The codebase now supports both Zsh and Fish shells:

### Directory Structure
- `shells/zsh/`: Zsh-specific implementation
  - `functions/`: Core shell functions
  - `widgets/`: ZLE widgets for key bindings
- `shells/fish/`: Fish-specific implementation (experimental)
  - `functions/`: Fish functions that mirror Zsh widgets
  - `conf.d/`: Fish configuration and initialization
  - `completions/`: Fish completion definitions (if any)

### Shell Differences
- **Command line manipulation**: Zsh uses `$LBUFFER/$RBUFFER`, Fish uses `commandline` builtin
- **Key bindings**: Zsh uses `zle -N` and `bindkey`, Fish uses `bind`
- **Function loading**: Zsh uses autoload, Fish loads automatically from function path
- **Array handling**: Different syntax and splitting mechanisms between shells
- **Variable expansion**: Fish requires explicit command substitution and different quoting rules

### Fish Implementation Status
- **Implemented**: auto-snippet, completion, insert-space, snippet-next-placeholder
- **Partial**: Socket mode server management functions (experimental)
- **Not implemented**: history-selection, ghq-cd, insert-snippet widgets
- **Limitations**: Socket mode (ZENO_ENABLE_SOCK) not fully functional in Fish
