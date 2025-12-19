#!/usr/bin/env bash
# Build portfolio images for a target architecture on a more powerful machine.
# The resulting images can be pushed to a registry or exported as tarballs
# and loaded on the deployment host (e.g. Raspberry Pi).

set -euo pipefail

usage() {
  cat <<'USAGE'
Build arm64 Docker images for the portfolio API and web frontend on a build machine.

Usage:
  build-images.sh [options]

Options:
  -p, --platform <platform>   Target platform (default: linux/arm64)
  -t, --tag <tag>             Image tag (default: latest)
  -r, --registry <registry>   Registry/repository prefix (e.g. ghcr.io/user)
  --push                      Push images to the registry instead of loading locally
  --save-tar <dir>            After building, save images as tarballs in <dir>
  -h, --help                  Show this help

Env vars:
  IMAGE_PLATFORM, IMAGE_TAG, IMAGE_REGISTRY, IMAGE_PUSH, IMAGE_SAVE_DIR

Examples:
  IMAGE_REGISTRY=ghcr.io/jaintp ./scripts/build-images.sh --push
  ./scripts/build-images.sh --save-tar dist

Before running, ensure QEMU binfmt is installed for cross-building:
  docker run --privileged --rm tonistiigi/binfmt --install all
USAGE
}

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

PLATFORM="${IMAGE_PLATFORM:-linux/arm64}"
TAG="${IMAGE_TAG:-latest}"
REGISTRY="${IMAGE_REGISTRY:-}"
PUSH="${IMAGE_PUSH:-false}"
SAVE_DIR="${IMAGE_SAVE_DIR:-}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    -p|--platform) PLATFORM="$2"; shift 2 ;;
    -t|--tag) TAG="$2"; shift 2 ;;
    -r|--registry) REGISTRY="$2"; shift 2 ;;
    --push) PUSH=true; shift ;;
    --save-tar) SAVE_DIR="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
done

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required but not found in PATH" >&2
  exit 1
fi

if ! docker buildx version >/dev/null 2>&1; then
  echo "docker-buildx plugin is required" >&2
  exit 1
fi

# Ensure buildx has builders and QEMU handlers initialised once.
docker buildx inspect --bootstrap >/dev/null 2>&1 || true
docker run --privileged --rm tonistiigi/binfmt --install all >/dev/null 2>&1 || true

if [[ "$PUSH" == true && -z "$REGISTRY" ]]; then
  echo "A registry (--registry) must be specified when pushing images." >&2
  exit 1
fi

if [[ -n "$SAVE_DIR" ]]; then
  mkdir -p "$SAVE_DIR"
fi

image_name() {
  local name="$1"
  if [[ -n "$REGISTRY" ]]; then
    echo "${REGISTRY}/$name:${TAG}"
  else
    echo "$name:${TAG}"
  fi
}

build_image() {
  local service="$1"
  local context="$2"
  local dockerfile="$ROOT_DIR/$context/Dockerfile"
  local image
  image="$(image_name "portfolio-${service}")"

  echo "==> Building ${image} (${PLATFORM})"

  local output_flag="--load"
  if [[ "$PUSH" == true ]]; then
    output_flag="--push"
  fi

  local build_args=()
  if [[ "$service" == "web" ]]; then
    local frontend_origin="${FRONTEND_API_ORIGIN:-}"
    if [[ -z "$frontend_origin" ]]; then
      echo "FRONTEND_API_ORIGIN must be set to the production API base (e.g. https://example.com/api)." >&2
      exit 1
    fi
    build_args+=(--build-arg "FRONTEND_API_ORIGIN=${frontend_origin}")
  fi

  docker buildx build \
    --platform "$PLATFORM" \
    --pull \
    --no-cache \
    -t "$image" \
    -f "$dockerfile" \
    "${build_args[@]}" \
    "$output_flag" \
    "$ROOT_DIR/$context"

  if [[ -n "$SAVE_DIR" ]]; then
    local tar_path="${SAVE_DIR}/portfolio-${service}-${TAG}.tar"
    echo "==> Saving ${image} to ${tar_path}"
    docker save "$image" | gzip > "${tar_path}.gz"
  fi
}

build_image "api" "apps/api"
build_image "web" "apps/web"

echo "All images built successfully."
