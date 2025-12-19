# Operations Runbook

## Build
- **Frontend**: `cd apps/web && yarn install && yarn build`
  - Post-build script injects CSP nonce placeholders. Set `FRONTEND_API_ORIGIN` before building.
- **Backend**: `cd apps/api && python -m pip install --upgrade pip && pip install --require-hashes -r requirements.lock`
- **Docker**: `FRONTEND_API_ORIGIN=https://portfolio.example/api docker compose build --no-cache --pull`
  - Produces multi-stage images with non-root users, read-only roots, PID limits, and health checks.

## Deploy
1. Copy `.env.example` to `.env` and generate strong secrets (`openssl rand -hex 64`).
2. Start stack: `docker compose up -d`
3. Enable systemd wrapper (optional):
   ```bash
   sudo cp deploy/systemd/portfolio-api.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable --now portfolio-api.service
   ```
4. Fail2ban (host nginx logs): copy `deploy/fail2ban` files into `/etc/fail2ban/`, then `sudo systemctl restart fail2ban`.
5. Log rotation: copy `deploy/logrotate/nginx` into `/etc/logrotate.d/`.

- **Containers healthy**: `docker compose ps` (should show `healthy`).
- **Automated header + CORS check**: `make verify-security FRONTEND_URL=https://YOUR_DOMAIN API_URL=https://YOUR_DOMAIN/api`
- **CSP nonce replacement**: `curl -s https://YOUR_DOMAIN | grep -o 'nonce-[-_A-Za-z0-9]\+'`
- **Rate limiting**:
  ```bash
  for i in $(seq 1 25); do curl -s -o /dev/null -w "%{http_code}\n" https://YOUR_DOMAIN/api/healthz; done
  # Expect HTTP 429 once burst exhausted
  ```
- **Ports restricted**: `ss -tlnp | grep -E '3000|8000'` (should bind to 127.0.0.1 only).
- **Fail2ban**: `sudo fail2ban-client status` (ensure `sshd` and `nginx-portfolio` jails are active).
- **Session cookie**: `curl -I -H 'Origin: https://YOUR_DOMAIN' -H 'Content-Type: application/json' \
    --data '{"email":"admin@example.com","password":"test"}' \
    https://YOUR_DOMAIN/api/auth/login`
  - Check for `Set-Cookie: portfolio_session=` and `HttpOnly; Secure; SameSite=Strict; Path=/` flags.

## Rollback
- Revert to previous images: `docker compose down && docker image ls | grep portfolio` then `docker compose up -d` with the prior tags.
- If systemd-managed: `sudo systemctl restart portfolio-api.service` after updating `IMAGE_TAG` back to last known-good version.
- Restore Nginx config and assets from backups if CSP or headers break rendering.
