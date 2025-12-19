# Release Hardening Checklist

Run through this list before every deployment to ensure the hardening controls remain in place.

## Configuration
- [ ] Confirm `.env` values use production secrets (`FRONTEND_ORIGIN`, `ADMIN_EMAIL`, `JWT_SECRET_KEY`, `SESSION_SECRET_KEY`).
- [ ] Confirm `FRONTEND_API_ORIGIN` build argument points to the production API origin (HTTPS only).
- [ ] Verify `docker-compose.yml` still sets `read_only`, `tmpfs`, `cap_drop`, `pids_limit`, and `no-new-privileges` for each service.
- [ ] Review firewall rules so ports 3000/8000 are reachable only via the Tailscale or reverse-proxy interface.

## Build & Deploy
- [ ] Rebuild images: `docker compose build --pull` (or CI pipeline) and ensure multi-stage builds succeed.
- [ ] Push or load the new images; restart with `docker compose up -d --no-deps web api`.
- [ ] If using systemd, confirm `portfolio-api.service` is active and running the fresh images.

## Post-deploy Verification
- [ ] Run `make verify-security FRONTEND_URL=https://YOUR_DOMAIN API_URL=https://YOUR_API_DOMAIN` (optionally set `SECURITY_CHECK_EMAIL/PASSWORD` for cookie checks).
- [ ] Check container health: `docker compose ps` should list both services as `healthy`.
- [ ] Inspect Nginx headers: `curl -I https://YOUR_DOMAIN | grep -E 'Content-Security-Policy|Strict-Transport-Security'`.
- [ ] Exercise rate limiting (expect HTTP 429 after burst):
  ```bash
  for i in $(seq 1 25); do curl -s -o /dev/null -w "%{http_code}\n" https://YOUR_DOMAIN/api/healthz; done
  ```
- [ ] Validate session cookie flags with `curl -i` (HttpOnly, Secure, SameSite=Strict, Path=/).

## Host Defences
- [ ] Confirm fail2ban is running and monitoring sshd and nginx: `sudo fail2ban-client status`.
- [ ] Ensure `/etc/fail2ban/jail.local` contains the Tailscale/local whitelists.
- [ ] Review firewall rules or `nftables`/`iptables` policy to guarantee only expected sources can reach the services.

## Logging & Backups
- [ ] Ensure log rotation is configured (`deploy/logrotate/nginx`).
- [ ] Snapshot configuration and secrets vault entries before rollout.

Document any deviations and sign off before announcing the release.
