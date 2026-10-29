#!/bin/sh
set -eu

DEPLOY_DIR="${DEPLOY_DIR:-/opt/shoptn}"
ROLLBACK_TAG="${1:-}"

if [ -z "$ROLLBACK_TAG" ]; then
  echo "Usage: $0 <previous-git-commit-image-tag>" >&2
  exit 2
fi

if [ ! -f "$DEPLOY_DIR/.env.production" ]; then
  echo "Missing $DEPLOY_DIR/.env.production." >&2
  exit 1
fi

DOCKERHUB_NAMESPACE="$(sed -n 's/^DOCKERHUB_NAMESPACE=//p' "$DEPLOY_DIR/.env.production" | head -n 1)"
exec "$DEPLOY_DIR/scripts/deploy-remote.sh" "$ROLLBACK_TAG" "$DOCKERHUB_NAMESPACE"
