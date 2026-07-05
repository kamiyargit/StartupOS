#!/bin/sh
# Pre-pull production infra images via Iranian Docker mirrors when Docker Hub is blocked.
# Tags results as postgres:16-alpine and nginx:alpine for cuty-expenses prod stack.
# Run on the VPS from /opt/cuty-expenses: sh ensure-prod-base-images.sh

set -e

try_pull() {
  target="$1"
  src="$2"
  echo "  trying $src ..."
  if docker pull "$src"; then
    if [ "$src" != "$target" ]; then
      docker tag "$src" "$target"
    fi
    echo "[OK] $target ready (from $src)"
    return 0
  fi
  return 1
}

ensure_image() {
  target="$1"
  shift

  if docker image inspect "$target" >/dev/null 2>&1; then
    echo "[OK] $target already local"
    return 0
  fi

  echo "Pulling $target (Docker Hub often blocked in Iran)..."

  for src in "$@"; do
    try_pull "$target" "$src" && return 0
  done

  echo "[FAIL] Could not pull $target from any mirror"
  return 1
}

MIRROR_SUFFIXES="
docker.iranserver.com/library
docker.arvancloud.ir/library
docker.haiocloud.com/library
registry.docker.ir/library
"

mirror_candidates() {
  repo_tag="$1"
  for host in $MIRROR_SUFFIXES; do
    echo "${host}/${repo_tag}"
  done
  echo "$repo_tag"
}

pull_with_mirrors() {
  target="$1"
  repo_tag="$2"
  candidates=""
  for c in $(mirror_candidates "$repo_tag"); do
    candidates="$candidates $c"
  done
  # shellcheck disable=SC2086
  ensure_image "$target" $candidates
}

failed=0

pull_with_mirrors "postgres:16-alpine" "postgres:16-alpine" || failed=1
pull_with_mirrors "nginx:alpine" "nginx:alpine" || failed=1

if [ "$failed" -ne 0 ]; then
  echo ""
  echo "Configure Docker registry mirrors on the VPS (/etc/docker/daemon.json), then retry."
  exit 1
fi

echo ""
echo "All cuty-expenses base images are ready locally."
