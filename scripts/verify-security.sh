#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<USAGE
Usage: $0 <frontend_url> [api_base_url]

Checks security headers on the frontend and exercises a CORS preflight against the API.
Set SECURITY_CHECK_EMAIL and SECURITY_CHECK_PASSWORD to additionally verify auth cookie attributes.

Examples:
  FRONTEND_URL=https://portfolio.example API_URL=https://portfolio.example/api \
    $0 "$FRONTEND_URL" "$API_URL"
USAGE
}

if [ $# -lt 1 ]; then
  usage
  exit 1
fi

FRONTEND_URL="$1"
API_BASE_URL="${2:-}" 
if [ -z "$API_BASE_URL" ]; then
  API_BASE_URL="$FRONTEND_URL/api"
fi

frontend_origin="$(printf '%s\n' "$FRONTEND_URL" | awk -F/ 'NF>=3 {print $1"//"$3}')"
if [ -z "$frontend_origin" ]; then
  echo "Unable to derive origin from $FRONTEND_URL" >&2
  exit 1
fi

API_LOGIN_ENDPOINT="${API_BASE_URL%/}/auth/login"

tmp_front_headers="$(mktemp)"
tmp_api_headers="$(mktemp)"
tmp_cookie_headers="$(mktemp)"
trap 'rm -f "$tmp_front_headers" "$tmp_api_headers" "$tmp_cookie_headers"' EXIT

echo "[+] Checking frontend headers at $FRONTEND_URL"
curl -sS --max-time 15 -D "$tmp_front_headers" -o /dev/null "$FRONTEND_URL"

check_header() {
  local header pattern
  header="$1"
  pattern="$2"
  if ! grep -qi "$pattern" "$tmp_front_headers"; then
    echo "[!] Missing or invalid $header" >&2
    exit 1
  fi
  echo "    - $header present"
}

check_header "Content-Security-Policy" '^Content-Security-Policy:'
check_header "Strict-Transport-Security" '^Strict-Transport-Security:'
check_header "Permissions-Policy" '^Permissions-Policy:'
check_header "Cross-Origin-Opener-Policy" '^Cross-Origin-Opener-Policy:'
check_header "Cross-Origin-Resource-Policy" '^Cross-Origin-Resource-Policy:'

if ! grep -qi "^Referrer-Policy: no-referrer" "$tmp_front_headers"; then
  echo "[!] Referrer-Policy is not set to no-referrer" >&2
  exit 1
fi
echo "    - Referrer-Policy set to no-referrer"

echo "[+] Performing CORS preflight against $API_LOGIN_ENDPOINT"
curl -sS --max-time 15 -o /dev/null -D "$tmp_api_headers" -X OPTIONS "$API_LOGIN_ENDPOINT" \
  -H "Origin: $frontend_origin" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type"

allow_origin="$(grep -i '^Access-Control-Allow-Origin:' "$tmp_api_headers" | awk '{print $2}' | tr -d '\r')"
if [ "$allow_origin" != "$frontend_origin" ]; then
  echo "[!] Access-Control-Allow-Origin ($allow_origin) does not match $frontend_origin" >&2
  exit 1
fi
if ! grep -qi '^Access-Control-Allow-Credentials: *true' "$tmp_api_headers"; then
  echo "[!] Access-Control-Allow-Credentials missing or not true" >&2
  exit 1
fi
echo "    - CORS preflight allows origin and credentials"

if [ -n "${SECURITY_CHECK_EMAIL:-}" ] && [ -n "${SECURITY_CHECK_PASSWORD:-}" ]; then
  echo "[+] Verifying auth cookie attributes"
  curl -sS --max-time 15 -o /dev/null -D "$tmp_cookie_headers" \
    -H "Origin: $frontend_origin" \
    -H "Content-Type: application/json" \
    -X POST "$API_LOGIN_ENDPOINT" \
    --data "{\"email\":\"$SECURITY_CHECK_EMAIL\",\"password\":\"$SECURITY_CHECK_PASSWORD\"}"

  set_cookie_line="$(grep -i '^Set-Cookie:' "$tmp_cookie_headers" | head -n1)"
  if [ -z "$set_cookie_line" ]; then
    echo "[!] Login response did not issue a Set-Cookie header" >&2
    exit 1
  fi
  for attribute in 'HttpOnly' 'Secure' 'SameSite=Strict' 'Path=/'; do
    if ! printf '%s' "$set_cookie_line" | grep -q "$attribute"; then
      echo "[!] Missing cookie attribute: $attribute" >&2
      exit 1
    fi
  done
  echo "    - Auth cookie includes HttpOnly, Secure, SameSite=Strict, and Path=/"
else
  echo "[i] Skip cookie verification (set SECURITY_CHECK_EMAIL and SECURITY_CHECK_PASSWORD to enable)"
fi

echo "[+] Security checks passed"
