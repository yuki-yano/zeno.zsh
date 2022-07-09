.PHONY: ci fmt fmt-check help lint precommit test type-check

.DEFAULT_GOAL := help

SRCS := ./src ./t
ALLOW := --allow-env --allow-read --allow-run --allow-write
FLAG := --unstable
TEST_FLAG := ${FLAG} --import-map=./t/map.json

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
	deno test --no-check ${TEST_FLAG} ${ALLOW} --jobs

type-check: ## Type check
	deno test --no-run ${TEST_FLAG} \
	    -- $$(find ${SRCS} -name '*.ts' -not -name '.deno')
