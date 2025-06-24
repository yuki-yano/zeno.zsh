# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

zeno.zsh is a multi-shell fuzzy completion and utility plugin built with Deno. Originally developed for Zsh, it now includes experimental support for Fish shell. It provides:
- Snippet management and abbreviation expansion
- Fuzzy completion using fzf
- Git completion support
- Shell line editor utilities (ZLE for Zsh, commandline for Fish)

## Recent Improvements (as of 2025-06-24)

The following major improvements have been completed:
- **Dependencies**: Migrated from deno.land to JSR (JavaScript Registry) - PR #82
- **Async Operations**: Completely removed `existsSync` in favor of async file operations - PR #86, #87
- **Error Handling**: Improved type safety and error handling across the codebase - PR #83
- **Global State**: Removed global state from text-writer module - PR #84
- **Code Quality**: Refactored duplicate result handling into helper functions - PR #85

## Development Commands

### Testing
```bash
# Run all tests (IMPORTANT: Always run type-check before tests)
make type-check && make test

# Run a specific test file
deno test --no-check --unstable-byonm --allow-env --allow-read --allow-run --allow-write test/command_test.ts
```

**IMPORTANT PROJECT RULE**: Always run `make type-check` before running tests to catch import path errors and type issues that are skipped by the `--no-check` flag in test execution.

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
   - `src/server.ts`: Unix socket server implementation (enabled by default, disable with ZENO_DISABLE_SOCK=1)

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
   - Socket mode provides persistent server for better performance (enabled by default)

## Key Implementation Details

- Uses Deno's `--unstable-byonm` flag for "Bring Your Own Node Modules"
- Supports both CLI mode and Unix socket server mode for performance
- Configuration is loaded from YAML files in standard config directories
- All text output uses a custom write function that supports formatting
- Now uses async file operations throughout (no `existsSync`)
- Error handling follows consistent patterns with proper error types

## Technical Debt and Priorities

### High Priority Issues (Module Coupling)
The codebase has significant module coupling issues that need addressing:

1. **Central Dependencies in app.ts**
   - `app.ts` imports 7+ feature modules directly
   - Switch statement with hardcoded command modes
   - Should use Command Pattern or Strategy Pattern

2. **Lack of Abstraction**
   - Direct dependencies on concrete implementations
   - No dependency injection
   - I/O operations tightly coupled to Deno APIs

3. **Mixed Responsibilities**
   - `app.ts`: Command parsing, execution dispatch, error handling, server/CLI logic
   - `settings.ts`: Environment reading, file loading, caching, defaults
   - `text-writer.ts`: Both class-based and function-based APIs for backward compatibility

### Medium Priority Issues
- Fish shell implementation incomplete (see Fish Implementation Status below)
- Socket mode needs error handling improvements
- Memory leak potential in socket connection management

### Low Priority Issues
- Documentation (JSDoc comments needed)
- Test coverage for Fish shell and socket mode
- Performance monitoring

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

### Fish Implementation Status (Experimental)

#### Fully Implemented
- `zeno-auto-snippet` - Automatic snippet expansion
- `zeno-auto-snippet-and-accept-line` - Snippet expansion with command execution
- `zeno-completion` - Fuzzy completion
- `zeno-insert-space` - Space insertion with snippet handling
- `zeno-snippet-next-placeholder` - Navigate snippet placeholders

#### Partially Implemented
- Socket mode - Server starts but not fully functional (enabled by default, disable with ZENO_DISABLE_SOCK=1)
- Server management commands (start/stop/restart) - Basic implementation exists

#### Not Implemented
- `zeno-history-selection` - Command history fuzzy search
- `zeno-ghq-cd` - Repository navigation with ghq
- `zeno-insert-snippet` - Interactive snippet selection
- `zeno-toggle-auto-snippet` - Toggle automatic snippet expansion

#### Known Limitations
1. Socket mode reliability issues in Fish
2. Function path may be added multiple times to configuration
3. Error handling in server management needs improvement
4. Process management (PID tracking) is rudimentary

## Development Best Practices

1. **Before Making Changes**
   - Run `make ci` to ensure all checks pass
   - Check both Zsh and Fish implementations if modifying shared functionality

2. **Code Style**
   - Use async/await instead of sync operations
   - Handle errors with proper types (avoid `unknown` without type guards)
   - Follow existing patterns for shell-specific implementations

3. **Testing**
   - Add tests for new functionality
   - Test manually in both Zsh and Fish shells
   - Check socket mode behavior when modifying server code

4. **Commits**
   - Run `make precommit` before committing
   - Write clear commit messages following conventional commits

## Important Notes

- Fish support is experimental and may have unexpected behavior
- Socket mode is more stable in Zsh than Fish
- When debugging, check `ZENO_LOG_LEVEL` environment variable
- Configuration files are in `$XDG_CONFIG_HOME/zeno` or `~/.config/zeno`

## Configuration File Editing Rules

**IMPORTANT**: When working on this repository, NEVER directly edit configuration files under `$HOME` or XDG directories. This includes:
- `~/.config/zeno/config.yml`
- `$XDG_CONFIG_HOME/zeno/*`
- Any user-specific configuration files

Instead:
- Create example configuration files in the repository (e.g., `examples/config.yml`)
- Document configuration options in README or documentation files
- Use temporary files in `tmp/claude/` for testing configurations
- Provide instructions for users to modify their own configuration files

## Documentation and Temporary File Rules

**IMPORTANT**: When creating documentation or temporary files during work:
- All markdown files (*.md) created during analysis or planning should be placed in either:
  - `tmp/claude/` - for temporary work files
  - `log/claude/` - for logs and analysis reports
- NEVER create documentation files in the project root or src directories unless explicitly requested
- The only exception is when updating existing documentation files like README.md or CLAUDE.md
