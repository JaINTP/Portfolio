# Portfolio Platform

Monorepo that powers a personal portfolio experience. It contains a FastAPI
backend backed by PostgreSQL for storing status checks and a modern React
client for the public site.

## Security Hardening Summary
- Nginx serves the React build with a strict Content Security Policy, runtime CSP nonces, HSTS, COOP/COEP, and rate limiting for both static assets and API proxying.
- The frontend build only accepts an explicit `FRONTEND_API_ORIGIN` and validates environment variables before bundling; production authentication relies on HttpOnly/Secure/SameSite=Strict cookies.
- FastAPI enforces a single `FRONTEND_ORIGIN`, email-based login with input validation, strict CORS, and session-issued cookies without exposing tokens in JSON responses.
- Containers run as non-root with read-only filesystems, tmpfs mounts for writable paths, dropped capabilities, PID limits, and multi-stage images that exclude build tooling.
- Host-level defences include updated fail2ban jails for `sshd` and nginx with Tailscale/local-network allowlists, plus guidance for firewall rules that restrict exposure to loopback or trusted tunnels.
- A repeatable verification script (`scripts/verify-security.sh`) and CI workflow lint Dockerfiles, scan for leaked secrets, and validate security headers on staging.

**Assumptions:** traffic terminates over HTTPS (or behind a trusted reverse proxy), system firewall rules restrict ports 3000/8000 to loopback/tunnel interfaces, and secrets are provisioned via environment variables or an external vault.

**Extending the CSP:** when adding new third-party assets, update `apps/web/nginx.conf` to include the additional source in the relevant directive (e.g. `script-src` or `img-src`) and adjust `scripts/validate-env.js` if the new origin must be whitelisted for build-time checks.

## Project layout
- `apps/api` – FastAPI service with PostgreSQL integration.
- `apps/web` – React single-page application styled with Tailwind CSS.
- `scripts/start.sh` – helper to launch both services in development.

## Prerequisites
- Python 3.11+ with `pip`
- Node.js 18+ with Yarn 1.x (`npm install --global yarn`)
- PostgreSQL 14+ running locally (defaults to `postgresql://postgres:postgres@localhost:5432/portfolio`)

## Install dependencies

### 1. Provision PostgreSQL

Choose the command that matches your platform:

```bash
# macOS (Homebrew)
brew install postgresql@16

# Ubuntu / Debian
sudo apt update && sudo apt install postgresql postgresql-contrib

# Arch Linux
sudo pacman -S postgresql
```

Create the development database and user (skip if already available):

```bash
sudo -u postgres psql -c "CREATE ROLE postgres WITH LOGIN SUPERUSER PASSWORD 'postgres';"
sudo -u postgres createdb --owner=postgres portfolio
```

### 2. Backend (FastAPI)

```bash
cd apps/api
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install --upgrade pip
pip install --require-hashes -r requirements.lock
# Security tooling (optional for CI / pre-commit)
pip install --require-hashes -r requirements-dev.lock
cp .env.example .env
```

If you changed the database credentials, update `DATABASE_URL` inside `.env`.

### 3. Frontend (React)

```bash
cd apps/web
yarn install
cp .env.example .env  # optional; defaults target http://localhost:8000/api
```

## Start both services (local dev)
```bash
./scripts/start.sh
```

The API runs on `http://localhost:8000` and the web client on
`http://localhost:3000`.

## Docker deployment

Build and run the production stack with docker or Docker Compose:

```bash
cp .env.example .env   # set real values before continuing
export FRONTEND_API_ORIGIN="https://portfolio.example/api"
docker compose build
docker compose up -d
```

Services:

| Service | Image            | Port | Notes                                  |
|---------|------------------|------|----------------------------------------|
| api     | apps/api/Dockerfile | 8000 | FastAPI + PostgreSQL client, saves uploads under `/data/uploads` |
| web     | apps/web/Dockerfile | 3000 | Nginx serving the React build, proxies `/api` to the backend |

Uploaded assets are stored in the shared `api_uploads` volume. Mount it to a
host directory if you need to persist assets outside Docker.

### Required environment variables

| Variable                       | Description                                                                 |
|--------------------------------|-----------------------------------------------------------------------------|
| `ENVIRONMENT`                  | `production` in prod; `development` enables local docs                     |
| `DATABASE_URL`                 | Async SQLAlchemy connection string                                         |
| `DATABASE_POOL_SIZE`           | Core connection count (default `5`)                                        |
| `DATABASE_MAX_OVERFLOW`        | Burst connections above the pool (default `5`)                             |
| `DATABASE_POOL_TIMEOUT`        | Seconds to wait for a connection before failing (default `10`)             |
| `FRONTEND_ORIGIN`              | HTTPS origin allowed for browser access                                    |
| `DEVELOPMENT_ORIGINS`          | Optional extra origins in development (CSV or JSON list)                   |
| `TRUSTED_HOSTS`                | Host headers accepted by FastAPI                                           |
| `TRUSTED_PROXIES`              | Proxies permitted to send `X-Forwarded-*` headers                          |
| `ADMIN_EMAIL`                  | Email used to authenticate via `/api/auth/login`                           |
| `ADMIN_PASSWORD_HASH`          | Bcrypt hash of the admin password                                          |
| `JWT_SECRET_KEY`               | 64+ byte secret for signing JWT access tokens                              |
| `SESSION_SECRET_KEY`           | 64+ byte secret for signed session cookies                                 |
| `SESSION_COOKIE_NAME`          | Name of the secure session cookie (default `portfolio_session`)            |
| `SESSION_COOKIE_SECURE`        | `true` to enforce HTTPS-only cookies                                       |
| `SESSION_COOKIE_SAMESITE`      | Must remain `strict` in production                                         |
| `SESSION_COOKIE_MAX_AGE_SECONDS` | Session lifetime in seconds (default `3600`)                             |
| `API_RATE_LIMIT`               | SlowAPI default limit (e.g. `120/minute`)                                  |
| `API_RATE_LIMIT_BURST`         | Burst capacity for API requests (default `240`)                            |
| `LOGIN_RATE_LIMIT`             | Stricter limit for `/auth/login` (e.g. `10/minute`)                        |
| `UPLOADS_DIR`                  | Path where uploaded assets are stored (container)                          |
| `ENABLE_HSTS`                  | `true` to emit Strict-Transport-Security headers                           |
| `FORWARDED_ALLOW_IPS`          | Matches Gunicorn `forwarded_allow_ips`                                     |

The frontend image requires `FRONTEND_API_ORIGIN` as a build argument (HTTPS URL of the API base). Set it via the environment before running `docker compose build` or rely on CI/CD variables.

Generate a bcrypt hash with:

```bash
python - <<'PY'
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
print(pwd_context.hash("your-password"))
PY
```

FastAPI and NGINX emit hardened headers (CSP with nonces, HSTS, COOP/COEP,
Referrer-Policy, Permissions-Policy, etc.). Keep HSTS disabled when testing on
plain HTTP (`ENABLE_HSTS=false`).

### Automation helpers

- `make frontend-lint` / `make frontend-audit` – run the React security linters.
- `make backend-bandit` / `make backend-audit` – run Bandit and pip-audit with hashes.
- `make security-check` – execute all lint/audit stages locally before pushing.
- `make verify-security FRONTEND_URL=https://your.site API_URL=https://your.site/api` – run the curl-based header/CORS verification script.

GitHub Actions (`.github/workflows/security.yml`) mirrors these checks in CI, linting the Dockerfiles with hadolint, scanning for leaked secrets via gitleaks, and invoking the verification script against a staging URL when configured.

Refer to `SECURITY_CHECKLIST.md` before each release to confirm hardening controls remain in place.

### Cross-building images

If your production host (e.g. Raspberry Pi) is slower than your build machine,
build the images locally and then push, load, or transfer them. The repo ships
with `scripts/build-images.sh` which wraps `docker buildx`:

```bash
# Ensure QEMU/binfmt handlers are installed once for cross-architecture builds.
docker run --privileged --rm tonistiigi/binfmt --install all

# Build linux/arm64 images and save tarballs under ./dist
./scripts/build-images.sh --platform linux/arm64 --tag latest --save-tar dist

# Or push to a registry (set IMAGE_REGISTRY or use --registry)
IMAGE_REGISTRY=ghcr.io/jaintp ./scripts/build-images.sh --push
```

Options are documented within the script; run `./scripts/build-images.sh --help`
for details. The generated tarballs can be loaded on the target host with
`docker load < image.tar.gz`.

To build and transfer the tarballs to the deployment host in one step, use:

```bash
./scripts/build-and-transfer.sh \
  --remote user@ip \
  --remote-dir /home/user/portfolio-images \
  --platform linux/arm64 \
  --tag latest \
  --remote-load
```

This wrapper invokes `build-images.sh`, copies the resulting archives via SCP,
and optionally loads them on the remote host (`--remote-load`). SSH target,
directory, and port are configurable via flags or environment variables.

### Development environment files

The repository keeps per-service `.env.example` files (`apps/api/.env.example`
and `apps/web/.env.example`) for local development. Use them when running the
dev servers directly on your workstation:

```bash
cp apps/api/.env.example apps/api/.env   # FastAPI dev server config
cp apps/web/.env.example apps/web/.env   # CRA dev server overrides (optional)
```

These files are ignored in version control and not required for Docker
deployments, which only rely on the root `.env` file.

### Updating containers

```bash
docker compose pull   # or build
docker compose up -d --no-deps api web
```

## Useful commands
- `python -m uvicorn apps.api.main:app --reload` from `apps/api`
- `yarn start` from `apps/web`

## Testing pointers
- Add FastAPI tests with `pytest` inside `apps/api/tests`.
- Extend React testing using `@testing-library/react` under `apps/web/src/__tests__`.
