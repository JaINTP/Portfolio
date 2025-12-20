PYTHON ?= python3

.PHONY: frontend-install backend-install frontend-lint frontend-audit backend-bandit backend-audit docker-build docker-scan security-check verify-security

frontend-install:
	@cd apps/web && yarn install --frozen-lockfile

frontend-lint:
	@cd apps/web && yarn lint

frontend-audit:
	@cd apps/web && yarn audit:prod

backend-install:
	@cd apps/api && $(PYTHON) -m pip install --upgrade pip && $(PYTHON) -m pip install --require-hashes -r requirements.lock

backend-bandit:
	@cd apps/api && $(PYTHON) -m pip install --require-hashes -r requirements-dev.lock && bandit -q -r app

backend-audit:
	@cd apps/api && $(PYTHON) -m pip install --require-hashes -r requirements-dev.lock && pip-audit --require-hashes -r requirements.lock

security-check: frontend-lint frontend-audit backend-bandit backend-audit

verify-security:
	@if [ -z "$(FRONTEND_URL)" ]; then \
		echo "FRONTEND_URL environment variable is required" >&2; \
		exit 1; \
	fi
	@API_URL=$${API_URL:-$${FRONTEND_URL%/}/api} scripts/verify-security.sh "$(FRONTEND_URL)" "$$API_URL"
