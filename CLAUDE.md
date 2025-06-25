# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

zeno.zsh is a multi-shell fuzzy completion and utility plugin built with Deno. Originally developed for Zsh, it now includes support for Fish shell. It provides:
- Snippet management and abbreviation expansion
- Fuzzy completion using fzf
- Git completion support
- Shell line editor utilities (ZLE for Zsh, commandline for Fish)

## Recent Improvements (as of 2025-06-25)

The following major improvements have been completed:
- **Dependencies**: Migrated from deno.land to JSR (JavaScript Registry) - PR #82
- **Async Operations**: Completely removed `existsSync` in favor of async file operations - PR #86, #87
- **Error Handling**: Improved type safety and error handling across the codebase - PR #83
- **Global State**: Removed global state from text-writer module - PR #84
- **Code Quality**: Refactored duplicate result handling into helper functions - PR #85
- **Fish Shell Support**: Completed implementation of all Fish shell widgets, achieving feature parity with Zsh
- **Fish Socket Mode**: Fixed reliability issues with PID tracking, socket cleanup, and error handling - PR #98
- **Socket Server Extraction**: Extracted socket server logic from app.ts into dedicated modules - PR #99

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
   - `src/app-factory.ts`: Factory for creating app instances with dependency injection

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
   - `src/socket/`: Socket server implementation with connection management
   - `src/command/`: Command registry and executor pattern

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

### High Priority Issues

1. **✅ Fish Socket Mode Reliability** (PR #98 - Completed)
   - Fixed PID tracking race conditions
   - Improved socket cleanup and timeout handling
   - Added error handling for socket operations

2. **✅ Socket Server Module Extraction** (PR #99 - Completed)
   - Extracted socket server logic from app.ts
   - Implemented proper connection management with timeouts
   - Fixed memory leaks in TextWriter and connection handling
   - Added comprehensive test coverage

3. **Module Coupling Issues** (Partially addressed)
   - ✅ Command Pattern implemented with registry
   - ✅ Socket server logic extracted to separate module
   - ⏳ Still need full dependency injection implementation
   - ⏳ I/O operations still coupled to Deno APIs

### Medium Priority Issues
- Fish shell implementation incomplete (see Fish Implementation Status below)
- ⏳ Missing Fish widgets: ghq-cd, history-selection, insert-snippet, toggle-auto-snippet

### Low Priority Issues
- Documentation (JSDoc comments needed)
- Test coverage for Fish shell integration tests
- Performance monitoring
- Integration tests for socket communication

## Multi-Shell Support

The codebase now supports both Zsh and Fish shells:

### Directory Structure
- `shells/zsh/`: Zsh-specific implementation
  - `functions/`: Core shell functions
  - `widgets/`: ZLE widgets for key bindings
- `shells/fish/`: Fish-specific implementation
  - `functions/`: Fish functions that mirror Zsh widgets
  - `conf.d/`: Fish configuration and initialization
  - `completions/`: Fish completion definitions (if any)

### Shell Differences
- **Command line manipulation**: Zsh uses `$LBUFFER/$RBUFFER`, Fish uses `commandline` builtin
- **Key bindings**: Zsh uses `zle -N` and `bindkey`, Fish uses `bind`
- **Function loading**: Zsh uses autoload, Fish loads automatically from function path
- **Array handling**: Different syntax and splitting mechanisms between shells
- **Variable expansion**: Fish requires explicit command substitution and different quoting rules

### Fish Shell Support

#### Fully Implemented
- `zeno-auto-snippet` - Automatic snippet expansion
- `zeno-auto-snippet-and-accept-line` - Snippet expansion with command execution
- `zeno-completion` - Fuzzy completion
- `zeno-insert-space` - Space insertion with snippet handling
- `zeno-snippet-next-placeholder` - Navigate snippet placeholders
- `zeno-history-selection` - Command history fuzzy search
- `zeno-ghq-cd` - Repository navigation with ghq
- `zeno-insert-snippet` - Interactive snippet selection
- `zeno-toggle-auto-snippet` - Toggle automatic snippet expansion

#### Known Limitations (Mostly Resolved)
1. ✅ Socket mode reliability issues in Fish (PR #98 - Fixed)
2. Function path may be added multiple times to configuration
3. ✅ Error handling in server management (PR #98 - Improved)
4. ✅ Process management (PID tracking) (PR #98 - Fixed)

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

## Functional Programming Guidelines

**IMPORTANT**: This project follows functional programming principles. When implementing new features or refactoring existing code:

### Core Principles
1. **Immutability**: Prefer `const` over `let`, avoid mutations
2. **Pure Functions**: Functions should not have side effects where possible
3. **Function Composition**: Build complex operations from simple, composable functions
4. **Higher-Order Functions**: Use map, filter, reduce instead of imperative loops

### Implementation Guidelines
1. **No Classes for Business Logic**: Use functions and closures (factory pattern)
2. **Pass Dependencies as Function Parameters**: Avoid global state
3. **Type Definitions**: Use `type` instead of `interface`
4. **Async Patterns**: Use `Promise.all` for parallel operations

## Important Notes

- Socket mode is more stable in Zsh than Fish (though Fish stability greatly improved in PR #98)
- When debugging, check `ZENO_LOG_LEVEL` environment variable
- Configuration files are in `$XDG_CONFIG_HOME/zeno` or `~/.config/zeno`

## Working Rules

1. **Configuration Files**: Never edit user config files (`~/.config/zeno/*`). Use `examples/` for samples.
2. **Temporary Files**: Use `tmp/claude/` for temporary work, `log/claude/` for analysis/logs
3. **Documentation**: Only update existing docs (README.md, CLAUDE.md) when explicitly requested

## Dependency Management

**Import Guidelines**:
- All imports in implementation files should be centralized through `src/deps.ts`
- All imports in test files should be centralized through `test/deps.ts`
- Inside `deps.ts` files, prefer JSR (JavaScript Registry) imports whenever possible
- This approach ensures consistent dependency management and easier migration