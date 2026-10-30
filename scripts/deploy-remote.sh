#!/bin/sh
set -eu

DEPLOY_DIR="${DEPLOY_DIR:-/opt/shoptn}"
IMAGE_TAG="${1:-}"
DOCKERHUB_NAMESPACE="${2:-}"

case "$IMAGE_TAG" in
  ''|*[!A-Za-z0-9._-]*)
    echo "A valid image tag is required." >&2
    exit 2
    ;;
esac

case "$DOCKERHUB_NAMESPACE" in
  ''|*[!a-z0-9_-]*)
    echo "A valid Docker Hub namespace is required." >&2
    exit 2
    ;;
esac

cd "$DEPLOY_DIR"

if [ ! -f .env.production ]; then
  echo "Missing $DEPLOY_DIR/.env.production. Create it from .env.production.example first." >&2
  exit 1
fi

CONFIGURED_NAMESPACE="$(sed -n 's/^DOCKERHUB_NAMESPACE=//p' .env.production | head -n 1)"
if [ "$CONFIGURED_NAMESPACE" != "$DOCKERHUB_NAMESPACE" ]; then
  echo "DOCKERHUB_NAMESPACE in .env.production does not match the Jenkins pipeline setting." >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1 || ! docker compose version >/dev/null 2>&1; then
  echo "Docker Engine and the Docker Compose plugin are required on the EC2 host." >&2
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required for the post-deploy health check." >&2
  exit 1
fi

PREVIOUS_TAG=""
if [ -f .deploy.env ]; then
  PREVIOUS_TAG="$(sed -n 's/^IMAGE_TAG=//p' .deploy.env | head -n 1)"
fi

COMPOSE="docker compose --env-file .env.production --env-file .deploy.env -f docker-compose.prod.yml"

restore_previous() {
  if [ -n "$PREVIOUS_TAG" ]; then
    printf 'IMAGE_TAG=%s\n' "$PREVIOUS_TAG" > .deploy.env
    echo "Restoring previously deployed image tag $PREVIOUS_TAG."
    if ! $COMPOSE up -d --wait --wait-timeout 120; then
      echo "Automatic rollback could not restore service health; inspect docker compose logs." >&2
      return 1
    fi
    if ! ./scripts/check-health.sh http://127.0.0.1:8081; then
      echo "Previous image started but failed its health check." >&2
      return 1
    fi
  else
    rm -f .deploy.env
    echo "No previous deployment is recorded; automatic rollback is not available." >&2
  fi
}

printf 'IMAGE_TAG=%s\n' "$IMAGE_TAG" > .deploy.env
chmod 600 .deploy.env

if ! $COMPOSE pull backend frontend; then
  restore_previous || true
  echo "Could not pull the new Docker Hub images." >&2
  exit 1
fi

if ! $COMPOSE up -d --wait --wait-timeout 120; then
  restore_previous || true
  echo "Compose did not reach a healthy state after deployment." >&2
  exit 1
fi

if ! ./scripts/check-health.sh http://127.0.0.1:8081; then
  restore_previous || true
  echo "Post-deploy health check failed." >&2
  exit 1
fi

echo "Deployment of $IMAGE_TAG completed successfully."
