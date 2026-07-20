#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_ADDR="${APP_ADDR:-:8080}"
APP_DATA_DIR="${APP_DATA_DIR:-$ROOT_DIR/data}"
APP_BINARY="$ROOT_DIR/bin/family-english"
GO_CACHE_DIR="${GOCACHE:-$ROOT_DIR/.cache/go-build}"

require_command() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

require_command go
mkdir -p "$ROOT_DIR/bin" "$APP_DATA_DIR" "$GO_CACHE_DIR"

echo "[1/3] Installing frontend dependencies"
if [[ -f "$ROOT_DIR/web/pnpm-lock.yaml" ]]; then
  require_command pnpm
  pnpm --dir "$ROOT_DIR/web" install --frozen-lockfile
  FRONTEND_BUILD=(pnpm --dir "$ROOT_DIR/web" run build)
else
  require_command npm
  npm ci --prefix "$ROOT_DIR/web"
  FRONTEND_BUILD=(npm run build --prefix "$ROOT_DIR/web")
fi

echo "[2/3] Building Vue frontend"
"${FRONTEND_BUILD[@]}"

echo "[3/3] Building and starting the Go service"
GOCACHE="$GO_CACHE_DIR" go build -trimpath -ldflags="-s -w" -o "$APP_BINARY" "$ROOT_DIR/cmd/server"

if [[ "$APP_ADDR" == :* ]]; then
  APP_URL="http://127.0.0.1$APP_ADDR"
else
  APP_URL="http://$APP_ADDR"
fi

echo
echo "Family English App is available at $APP_URL"
echo "Data directory: $APP_DATA_DIR"
echo "Press Ctrl+C to stop the service."
exec "$APP_BINARY" -addr "$APP_ADDR" -data "$APP_DATA_DIR"
