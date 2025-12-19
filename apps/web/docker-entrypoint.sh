#!/usr/bin/env sh
set -eu

if [ -z "${CSP_NONCE:-}" ]; then
  CSP_NONCE="$(head -c 24 /dev/urandom | base64 | tr -d '\n' | tr '/+' '_-')"
fi

API_CONNECT_SRC="'self'"
if [ -n "${FRONTEND_API_ORIGIN:-}" ]; then
  parsed_origin="$(printf '%s\n' "${FRONTEND_API_ORIGIN}" | awk -F/ 'NF>=3 {print $1"//"$3}')"
  if [ -z "${parsed_origin}" ]; then
    parsed_origin="${FRONTEND_API_ORIGIN}"
  fi
  parsed_origin="${parsed_origin%/}"
  if [ -n "${parsed_origin}" ] && [ "${parsed_origin}" != "'self'" ]; then
    API_CONNECT_SRC="${API_CONNECT_SRC} ${parsed_origin}"
  fi
fi

export CSP_NONCE
export API_CONNECT_SRC

readonly BUILD_CONF="/etc/nginx/conf.d/default.conf"
readonly BUILD_HTML_DIR="/usr/share/nginx/html"
readonly RUNTIME_BASE="/tmp/nginx"
readonly RUNTIME_CONF_DIR="${RUNTIME_BASE}/conf.d"
readonly RUNTIME_HTML_DIR="${RUNTIME_BASE}/html"
readonly RUNTIME_MAIN_CONF="${RUNTIME_BASE}/nginx.conf"

mkdir -p "${RUNTIME_CONF_DIR}" "${RUNTIME_HTML_DIR}"

if [ -f "${BUILD_CONF}" ]; then
  tmp_conf="$(mktemp "${RUNTIME_CONF_DIR}/confXXXXXX")"
  sed \
    -e "s#__CSP_NONCE__#${CSP_NONCE}#g" \
    -e "s#__API_CONNECT_SRC__#${API_CONNECT_SRC}#g" \
    -e "s#/usr/share/nginx/html#${RUNTIME_HTML_DIR}#g" \
    "${BUILD_CONF}" > "${tmp_conf}"
  mv "${tmp_conf}" "${RUNTIME_CONF_DIR}/default.conf"
fi

if [ -d "${BUILD_HTML_DIR}" ]; then
  find "${RUNTIME_HTML_DIR}" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
  cp -R "${BUILD_HTML_DIR}/." "${RUNTIME_HTML_DIR}/"

  if [ -d "${BUILD_HTML_DIR}/uploads" ]; then
    rm -rf "${RUNTIME_HTML_DIR}/uploads"
    ln -s "${BUILD_HTML_DIR}/uploads" "${RUNTIME_HTML_DIR}/uploads"
  fi

  find "${RUNTIME_HTML_DIR}" -type f -name "index.html" -print0 | while IFS= read -r -d '' file; do
    tmp_file="$(mktemp)"
    sed "s/__CSP_NONCE__/${CSP_NONCE}/g" "${file}" > "${tmp_file}"
    cat "${tmp_file}" > "${file}"
    rm -f "${tmp_file}"
  done
fi

cat > "${RUNTIME_MAIN_CONF}" <<EOF
worker_processes auto;
error_log /dev/stderr warn;
pid ${RUNTIME_BASE}/nginx.pid;

events {
  worker_connections 1024;
}

http {
  include       /etc/nginx/mime.types;
  default_type  application/octet-stream;

  sendfile        on;
  keepalive_timeout  65;

  include ${RUNTIME_CONF_DIR}/*.conf;
}
EOF

if [ "${1:-}" = "nginx" ]; then
  shift
  exec nginx -c "${RUNTIME_MAIN_CONF}" "$@"
fi

exec "$@"
