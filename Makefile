.PHONY: ci fmt fmt-check help lint precommit test test-parallel type-check

.DEFAULT_GOAL := help

SRCS := ./src ./test
ALLOW := --allow-env --allow-read --allow-run --allow-write --allow-ffi --allow-net
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
	deno run ${FLAG} ${ALLOW} -- ./scripts/preload_sqlite.ts
	@all_tests_file="$$(mktemp "$${TMPDIR:-/tmp}/zeno-test-all.XXXXXX")"; \
	serial_tests_file="$$(mktemp "$${TMPDIR:-/tmp}/zeno-test-serial.XXXXXX")"; \
	parallel_tests_file="$$(mktemp "$${TMPDIR:-/tmp}/zeno-test-parallel.XXXXXX")"; \
	trap 'rm -f "$$all_tests_file" "$$serial_tests_file" "$$parallel_tests_file"' EXIT; \
	rg --files test -g '*_test.ts' | sort > "$$all_tests_file"; \
	rg -l 'Deno\.env\.(set|delete)\(' test -g '*_test.ts' | sort -u > "$$serial_tests_file"; \
	grep -Fvx -f "$$serial_tests_file" "$$all_tests_file" > "$$parallel_tests_file" || true; \
	parallel_tests="$$(tr '\n' ' ' < "$$parallel_tests_file")"; \
	serial_tests="$$(tr '\n' ' ' < "$$serial_tests_file")"; \
	if [ -n "$$parallel_tests" ]; then \
		deno test --no-check ${TEST_FLAG} ${ALLOW} --parallel $$parallel_tests; \
	fi; \
	if [ -n "$$serial_tests" ]; then \
		deno test --no-check ${TEST_FLAG} ${ALLOW} $$serial_tests; \
	fi

test-parallel: ## Test (parallel, may be flaky with global env mutations)
	deno run ${FLAG} ${ALLOW} -- ./scripts/preload_sqlite.ts
	deno test --no-check ${TEST_FLAG} ${ALLOW} --parallel

type-check: ## Type check
	deno check ${FLAG} src/**/*.ts test/**/*.ts
