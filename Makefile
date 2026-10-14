.DEFAULT_GOAL := all
.NOTPARALLEL:
BUILD_TARGETS := all build verify install clean manifest package wheel test-cli upstream evals-test cli uninstall-cli
.PHONY: $(BUILD_TARGETS)

# Hold one checkout-wide lock through recursive makes, verification, packaging,
# and installation. Direct build scripts acquire the same lock when needed.
ifneq ($(PSTACK_BUILD_LOCK),$(CURDIR))
$(BUILD_TARGETS):
	+@python3 build/build_lock.py $(MAKE) --no-print-directory $@
else

all: manifest build verify

manifest:
	python3 build/gen-routes.py
	python3 build/gen-manifest.py

build:
	node build/build.mjs

verify:
	node build/verify.mjs
	node build/check-routing.mjs
	python3 build/tests/test-build-lock.py
	python3 build/tests/test-run-record.py
	@if python3 -c "import yaml" 2>/dev/null; then \
		python3 build/check-yaml.py; \
	else \
		echo "pyyaml absent, skipping strict YAML parse"; \
	fi

install:
	./install.sh

# Copy the generated builds into the Python package as package data.
package: build
	python3 build/package.py

wheel: package
	@if command -v uv >/dev/null 2>&1; then \
		cd packaging && uv build --wheel; \
	else \
		cd packaging && python3 -m build --wheel; \
	fi

# Build, verify, test, and install the `pstack` command on your PATH, so it works from any
# directory. Rerun after changing anything here, then `pstack update` in each project.
# Works from anywhere as: make -C /path/to/PSTACK cli
cli:
	$(MAKE) all
	$(MAKE) test-cli
	$(MAKE) wheel
	@whl=$$(ls -t packaging/dist/pstack_cli-*.whl | head -1); \
	if command -v uv >/dev/null 2>&1; then \
		uv tool install --force --reinstall "$$whl"; \
	elif command -v pipx >/dev/null 2>&1; then \
		pipx install --force "$$whl"; \
	else \
		python3 -m pip install --user --force-reinstall "$$whl"; \
	fi
	@command -v pstack >/dev/null 2>&1 || { echo "installed, but pstack is not on PATH: add ~/.local/bin to PATH"; exit 1; }
	@echo "installed: $$(pstack --version) at $$(command -v pstack)"

uninstall-cli:
	@if command -v uv >/dev/null 2>&1 && uv tool list 2>/dev/null | grep -q '^pstack-cli'; then \
		uv tool uninstall pstack-cli; \
	elif command -v pipx >/dev/null 2>&1 && pipx list 2>/dev/null | grep -q pstack-cli; then \
		pipx uninstall pstack-cli; \
	else \
		python3 -m pip uninstall -y pstack-cli; \
	fi

test-cli: package
	@if command -v uv >/dev/null 2>&1; then \
		cd packaging && uv run pytest tests/ -q; \
	elif python3 -c "import pytest" 2>/dev/null; then \
		cd packaging && python3 -m pytest tests/ -q; \
	else \
		echo "no uv and no pytest, skipping CLI tests"; \
	fi

# Compare against an upstream checkout. Fails when upstream has changed a file
# this port rewrites, which a re-derivation would otherwise discard in silence.
upstream:
	@test -n "$(UPSTREAM)" || { echo "usage: make upstream UPSTREAM=/path/to/cursor-plugins"; exit 2; }
	python3 build/port/check-upstream.py "$(UPSTREAM)"

clean:
	rm -rf dist packaging/dist packaging/src/pstack_cli/data

# The behavioral eval harness's own tests. Calls no model. About a minute.
evals-test:
	python3 evals/test_harness.py

endif

# Checks for the upstream-based skills; legacy targets above keep their original scope.
.PHONY: test-upstream test-upstream-install
test-upstream:
	node --test skills/pstack-host/setup/setup.test.mjs skills/pstack-host/benny-tools/test-benny.mjs
	bun test --timeout 120000 skills/poteto-mode/scripts/orch skills/poteto-mode/scripts/watch-pr skills/poteto-mode/scripts/check-plan.test.ts skills/poteto-mode/scripts/bootstrap.test.ts

test-upstream-install:
	node tests/upstream-install.mjs
