# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

zeno.zsh is a multi-shell fuzzy completion and utility plugin built with Deno. Originally developed for Zsh, it now includes support for Fish shell. It provides:
- Snippet management and abbreviation expansion
- Fuzzy completion using fzf
- Git completion support
- Shell line editor utilities (ZLE for Zsh, commandline for Fish)

## Key Features

- Full support for both Zsh and Fish shells
- Async operations throughout the codebase
- Command registry pattern for extensibility
- Socket mode for improved performance

## Development Commands

### Testing
```bash
# Run all tests (IMPORTANT: Always run type-check before tests)
make type-check && make test

# Run a specific test file
deno test --no-check --unstable-byonm --allow-env --allow-read --allow-run --allow-write test/command_test.ts
```

**IMPORTANT PROJECT RULE**: Always run `make type-check` before running tests to catch import path errors and type issues that are skipped by the `--no-check` flag in test execution.

### Essential Commands
```bash
make ci         # Run all checks (format, lint, type-check, tests)
make precommit  # Format code before committing
```

## Architecture

- **Entry Points**: `src/app.ts` (core logic), `src/cli.ts` (CLI), `src/server.ts` (socket server)
- **Shell Integration**: Separate implementations in `shells/zsh/` and `shells/fish/`
- **Feature Modules**: `src/snippet/`, `src/completion/`, `src/fzf/`
- **Communication**: Unix socket (default) or CLI mode

## Key Implementation Details

- Uses Deno with `--unstable-byonm` flag
- Socket mode enabled by default (disable with `ZENO_DISABLE_SOCK=1`)
- Configuration: YAML files in `$XDG_CONFIG_HOME/zeno` or `~/.config/zeno`
- Async operations throughout

## Technical Debt and Priorities

### High Priority Issues
1. **Socket Server Logic in app.ts**
   - Socket server implementation is directly in app.ts
   - Should be extracted to separate module for better separation of concerns
   - Memory leak potential in socket connection management (TextWriter cleanup missing)

2. **Fish Socket Mode Reliability**
   - Process management issues (PID tracking)
   - Error handling needs improvement
   - Race conditions during server startup

### Medium Priority Issues
- Test coverage for Fish shell and socket mode
- Error handling improvements in socket mode
- Connection timeout and pooling needed

### Low Priority Issues
- Documentation (JSDoc comments needed)
- Performance monitoring

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


### Fish Shell Support

- **Status**: All Zsh widgets have been successfully ported to Fish
- **Known Limitations**: Socket mode has reliability issues in Fish (process management, error handling)

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

- Socket mode is more stable in Zsh than Fish
- When debugging, check `ZENO_LOG_LEVEL` environment variable
- Configuration files are in `$XDG_CONFIG_HOME/zeno` or `~/.config/zeno`

## Working Rules

1. **Configuration Files**: Never edit user config files (`~/.config/zeno/*`). Use `examples/` for samples.
2. **Temporary Files**: Use `tmp/claude/` for temporary work, `log/claude/` for analysis/logs
3. **Documentation**: Only update existing docs (README.md, CLAUDE.md) when explicitly requested
