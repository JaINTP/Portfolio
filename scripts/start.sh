#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_DIR="${ROOT_DIR}/apps/api"
WEB_DIR="${ROOT_DIR}/apps/web"
VENV_DIR="${API_DIR}/.venv"
REQUIREMENTS_FILE="${API_DIR}/requirements.lock"
DEV_REQUIREMENTS_FILE="${API_DIR}/requirements-dev.lock"

export PYTHONPATH="${ROOT_DIR}:${PYTHONPATH:-}"

log() {
  echo "[start.sh] $*"
}

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

ensure_python() {
  local python_candidate="${PYTHON:-python3}"
  if ! command_exists "${python_candidate}"; then
    echo "[start.sh] Unable to find python interpreter '${python_candidate}'. Set PYTHON=/path/to/python." >&2
    exit 1
  fi
  echo "${python_candidate}"
}

create_virtualenv() {
  local python_bin="$1"
  if [[ -x "${VENV_DIR}/bin/python" ]]; then
    echo "${VENV_DIR}/bin/python"
    return
  fi

  log "Creating virtual environment under ${VENV_DIR}"
  "${python_bin}" -m venv "${VENV_DIR}"
  echo "${VENV_DIR}/bin/python"
}

install_backend_deps() {
  local venv_python="$1"
  log "Installing backend dependencies"
  "${venv_python}" -m pip install --upgrade pip >/dev/null

  if [[ -f "${REQUIREMENTS_FILE}" ]]; then
    "${venv_python}" -m pip install --require-hashes -r "${REQUIREMENTS_FILE}"
  else
    log "Warning: ${REQUIREMENTS_FILE} not found; skipping locked install"
  fi

  if [[ -f "${DEV_REQUIREMENTS_FILE}" ]]; then
    "${venv_python}" -m pip install --require-hashes -r "${DEV_REQUIREMENTS_FILE}"
  fi
}

ensure_yarn() {
  if ! command_exists yarn; then
    echo "[start.sh] Missing required command 'yarn'. Install Node.js + Yarn to run the web app." >&2
    exit 1
  fi
}

install_frontend_deps() {
  log "Installing frontend dependencies"
  (
    cd "${WEB_DIR}"
    yarn install --check-files
  )
}

PYTHON_BIN="$(ensure_python)"
VENV_PYTHON="$(create_virtualenv "${PYTHON_BIN}")"
install_backend_deps "${VENV_PYTHON}"
ensure_yarn
install_frontend_deps

UVICORN_CMD=("${VENV_PYTHON}" -m uvicorn apps.api.main:app --host 0.0.0.0 --port 3000 --reload)
FRONTEND_PORT="${FRONTEND_PORT:-8081}"

API_PID=""
WEB_PID=""

cleanup() {
  [[ -n "${API_PID}" ]] && kill "${API_PID}" 2>/dev/null || true
  [[ -n "${WEB_PID}" ]] && kill "${WEB_PID}" 2>/dev/null || true
}

trap cleanup EXIT

(
  cd "${API_DIR}"
  log "Starting API on http://localhost:3000"
  "${UVICORN_CMD[@]}"
) &
API_PID=$!

(
  cd "${WEB_DIR}"
  log "Starting web client on http://localhost:${FRONTEND_PORT}"
  PORT="${FRONTEND_PORT}" yarn start
) &
WEB_PID=$!

wait -n "${API_PID}" "${WEB_PID}"
EXIT_CODE=$?

cleanup
wait "${API_PID}" 2>/dev/null || true
wait "${WEB_PID}" 2>/dev/null || true

exit "${EXIT_CODE}"
