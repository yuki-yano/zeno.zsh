.PHONY: ci fmt fmt-check help lint precommit test type-check

.DEFAULT_GOAL := help

SRCS := ./src ./test
ALLOW := --allow-env --allow-read --allow-run --allow-write
FLAG := --unstable-byonm
TEST_FLAG := ${FLAG}

ci: fmt-check lint type-check test

fmt: ## Format code
	deno fmt ${FLAG} -- ${SRCS}

fmt-check: ## Format check
	deno fmt --check ${FLAG} -- ${SRCS}

help:
	@cat $(MAKEFILE_LIST) | \
	    perl -ne 'if(/^\w+.*##/){s/(.*):.*##\s*/sprintf("%-20s",$$1)/eg;print}'

lint: ## Lint code
	deno lint ${FLAG} -- ${SRCS}

precommit: fmt

test: ## Test
	deno test --no-check ${TEST_FLAG} ${ALLOW} --parallel

type-check: ## Type check
	deno check ${FLAG} src/**/*.ts test/**/*.ts
