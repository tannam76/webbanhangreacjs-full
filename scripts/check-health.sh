#!/bin/sh
set -eu

BASE_URL="${1:-http://127.0.0.1}"

if ! curl --fail --silent --show-error "$BASE_URL/" --output /dev/null; then
  echo "Frontend is not responding at $BASE_URL/." >&2
  exit 1
fi

HEALTH_RESPONSE="$(curl --fail --silent --show-error "$BASE_URL/api/health")"
printf '%s\n' "$HEALTH_RESPONSE"

if ! printf '%s' "$HEALTH_RESPONSE" | grep -Eq '"databaseConnected"[[:space:]]*:[[:space:]]*true'; then
  echo "API is responding but does not report a healthy database connection." >&2
  exit 1
fi

echo "Frontend, API, and database health checks passed."
