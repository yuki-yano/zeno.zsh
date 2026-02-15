.PHONY: ci fmt fmt-check help lint precommit test test-parallel type-check

.DEFAULT_GOAL := help

SRCS := ./src ./test
ALLOW := --allow-env --allow-read --allow-run --allow-write --allow-ffi --allow-net
RUN_FLAG := --node-modules-dir=auto
TEST_FLAG := ${RUN_FLAG}

ci: fmt-check lint type-check test

fmt: ## Format code
	deno fmt -- ${SRCS}

fmt-check: ## Format check
	deno fmt --check -- ${SRCS}

help:
	@cat $(MAKEFILE_LIST) | \
	    perl -ne 'if(/^\w+.*##/){s/(.*):.*##\s*/sprintf("%-20s",$$1)/eg;print}'

lint: ## Lint code
	deno lint -- ${SRCS}

precommit: fmt

test: ## Test
	deno run ${RUN_FLAG} ${ALLOW} -- ./scripts/preload_sqlite.ts
	deno test --no-check ${TEST_FLAG} ${ALLOW}

test-parallel: ## Test (parallel, may be flaky with global env mutations)
	deno run ${RUN_FLAG} ${ALLOW} -- ./scripts/preload_sqlite.ts
	deno test --no-check ${TEST_FLAG} ${ALLOW} --parallel

type-check: ## Type check
	deno check src/**/*.ts test/**/*.ts
