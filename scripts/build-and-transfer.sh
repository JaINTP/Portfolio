#!/usr/bin/env bash
# Build portfolio images as tarballs and transfer them to a remote host via SCP.

set -euo pipefail

usage() {
  cat <<'USAGE'
Build portfolio Docker images for a target architecture, save them as tarballs,
and copy them to a remote host via SSH/SCP.

Usage:
  build-and-transfer.sh --remote user@host [options]

Options:
  -p, --platform <platform>    Target platform (default: linux/arm64)
  -t, --tag <tag>              Image tag (default: latest)
  -r, --registry <registry>    Registry prefix passed to build-images.sh
  --remote <user@host>         SSH target (required)
  --remote-dir <dir>           Destination directory on remote host (default: ~/portfolio-images)
  --ssh-port <port>            SSH port (default: 22)
  --remote-load                After transfer, load tarballs with docker on remote host
  --keep-tar                   Keep local tarballs instead of deleting after transfer
  --help                       Show this help message

Environment variables:
  IMAGE_PLATFORM, IMAGE_TAG, IMAGE_REGISTRY correspond to the same options above.
  REMOTE_TARGET, REMOTE_DIR, REMOTE_SSH_PORT can pre-set the remote options.

Prerequisites:
  - docker + buildx on the build machine
  - QEMU/binfmt handlers for cross-building (run once):
      docker run --privileged --rm tonistiigi/binfmt --install all
  - SSH/SCP access to the remote host
USAGE
}

run_build_and_transfer() {
  local ROOT_DIR PLATFORM TAG REGISTRY REMOTE REMOTE_DIR SSH_PORT REMOTE_LOAD

  ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

  PLATFORM="${IMAGE_PLATFORM:-linux/arm64}"
  TAG="${IMAGE_TAG:-latest}"
  REGISTRY="${IMAGE_REGISTRY:-}"
  REMOTE="${REMOTE_TARGET:-}"
  REMOTE_DIR="${REMOTE_DIR:-}"
  SSH_PORT="${REMOTE_SSH_PORT:-22}"
  REMOTE_LOAD=${REMOTE_LOAD:-false}
  KEEP_TAR=false

  while [[ $# -gt 0 ]]; do
    case "$1" in
      -p|--platform) PLATFORM="$2"; shift 2 ;;
      -t|--tag)       TAG="$2"; shift 2 ;;
      -r|--registry)  REGISTRY="$2"; shift 2 ;;
      --remote)       REMOTE="$2"; shift 2 ;;
      --remote-dir)   REMOTE_DIR="$2"; shift 2 ;;
      --ssh-port)     SSH_PORT="$2"; shift 2 ;;
      --remote-load)  REMOTE_LOAD=true; shift ;;
      --keep-tar)     KEEP_TAR=true; shift ;;
      --help|-h)      usage; exit 0 ;;
      *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
    esac
  done

  if [[ -z "$REMOTE" ]]; then
    echo "Error: --remote user@host is required." >&2
    usage
    exit 1
  fi

  if [[ -z "$REMOTE_DIR" ]]; then
    REMOTE_DIR="~/portfolio-images"
  fi

  if ! command -v docker >/dev/null 2>&1; then
    echo "docker is required but not found in PATH" >&2
    exit 1
  fi

  if ! command -v scp >/dev/null 2>&1; then
    echo "scp is required for transferring tarballs" >&2
    exit 1
  fi

  TMP_DIR="$(mktemp -d)"
  cleanup() {
    if [[ "$KEEP_TAR" == false ]]; then
      rm -rf "$TMP_DIR"
    fi
  }
  trap cleanup EXIT

  local -a BUILD_ARGS
  BUILD_ARGS=(--platform "$PLATFORM" --tag "$TAG" --save-tar "$TMP_DIR")
  if [[ -n "$REGISTRY" ]]; then
    BUILD_ARGS+=(--registry "$REGISTRY")
  fi

  echo "==> Building images for ${PLATFORM}, tag=${TAG}"
  IMAGE_PLATFORM="$PLATFORM" IMAGE_TAG="$TAG" IMAGE_REGISTRY="$REGISTRY" \
    "$ROOT_DIR/scripts/build-images.sh" "${BUILD_ARGS[@]}"

  echo "==> Build complete. Checking artifacts in $TMP_DIR:"
  ls -lh "$TMP_DIR"

  if [[ -z "$(ls -A "$TMP_DIR" | grep .tar.gz)" ]]; then
     echo "Error: No tarballs found in $TMP_DIR. Build might have failed or not saved artifacts."
     exit 1
  fi

  echo "==> Ensuring remote directory exists: ${REMOTE}:${REMOTE_DIR}"
  ssh -p "$SSH_PORT" "$REMOTE" "mkdir -p '$REMOTE_DIR'"

  echo "==> Transferring tarballs to remote host"
  scp -P "$SSH_PORT" "$TMP_DIR"/portfolio-*.tar.gz "$REMOTE":"$REMOTE_DIR"/

  if [[ "$REMOTE_LOAD" == true ]]; then
    echo "==> Loading images on remote host"
    ssh -p "$SSH_PORT" "$REMOTE" "set -euo pipefail; for tar in '$REMOTE_DIR'/portfolio-*-${TAG}.tar.gz; do gunzip -c \"\$tar\" | docker load; done"
  fi

  if [[ "$KEEP_TAR" == true ]]; then
    echo "Tarballs kept in $TMP_DIR"
  else
    echo "Local tarballs removed."
  fi

  echo "Done. Images available at ${REMOTE}:${REMOTE_DIR}"

  echo "==> Restarting remote container: ${REMOTE}:${REMOTE_DIR}"
  ssh -p "$SSH_PORT" "$REMOTE" "cd '$REMOTE_DIR';docker compose down;docker compose up -d"

  echo "Done. Remote container restarted!"
}

SCRIPT_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")"

if [[ "${PORTFOLIO_BUILD_CHILD:-0}" == "1" ]]; then
  run_build_and_transfer "$@"
  exit 0
fi

for arg in "$@"; do
  if [[ "$arg" == "--help" || "$arg" == "-h" ]]; then
    usage
    exit 0
  fi
done

if ! command -v tmux >/dev/null 2>&1; then
  echo "tmux is required to orchestrate build/log panes." >&2
  exit 1
fi

SESSION_NAME="${PORTFOLIO_TMUX_SESSION:-portfolio-deploy}"

if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
  tmux kill-session -t "$SESSION_NAME"
fi

escaped_args=()
LOG_REMOTE=""
LOG_PORT="22"
remote_next=false
port_next=false

for arg in "$@"; do
  escaped_args+=("$(printf '%q' "$arg")")
  
  if [[ "$remote_next" == "true" ]]; then
    LOG_REMOTE="$arg"
    remote_next=false
    continue
  fi
  if [[ "$port_next" == "true" ]]; then
    LOG_PORT="$arg"
    port_next=false
    continue
  fi

  if [[ "$arg" == "--remote" ]]; then
    remote_next=true
  elif [[ "$arg" == "--ssh-port" ]]; then
    port_next=true
  fi
done

if [[ -z "$LOG_REMOTE" ]]; then
    # Should be caught by child script usage check, but helpful to know here
    echo "Warning: No --remote specified for logs" >&2
fi

# Wrap child command to keep pane open on failure
# Use bash explicitly and sleep to guarantee time to read error
child_command="bash -c 'PORTFOLIO_BUILD_CHILD=1 $(printf '%q' "$SCRIPT_PATH") ${escaped_args[*]}; ret=\$?; echo \"Command exited with \$ret\"; if [[ \$ret -ne 0 ]]; then echo \"Press Enter to close\"; read; fi'"

# Left pane: build + transfer workflow
tmux new-session -d -s "$SESSION_NAME" "$child_command"

# Right top pane: API logs
tmux split-window -h -t "${SESSION_NAME}:0" "ssh -p \"$LOG_PORT\" \"$LOG_REMOTE\" 'cd ~/docker/Portfolio && docker logs -f portfolio-api' || { echo 'Log connection failed'; sleep 10; }"

# Right bottom pane: Web logs
tmux split-window -v -t "${SESSION_NAME}:0.1" "ssh -p \"$LOG_PORT\" \"$LOG_REMOTE\" 'cd ~/docker/Portfolio && docker logs -f portfolio-web' || { echo 'Log connection failed'; sleep 10; }"

tmux select-pane -t "${SESSION_NAME}:0.0"
tmux attach -t "$SESSION_NAME"
