#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RELEASE_DIR="${RELEASE_DIR:-$ROOT_DIR/release}"
GO_CACHE_DIR="${GOCACHE:-$ROOT_DIR/.cache/go-build}"
OS_NAME="$(go env GOOS)"
ARCH_NAME="$(go env GOARCH)"
STAMP="$(date +%Y%m%d-%H%M%S)"
PACKAGE_NAME="family-english-${OS_NAME}-${ARCH_NAME}-${STAMP}"
PACKAGE_DIR="$RELEASE_DIR/$PACKAGE_NAME"

require_command() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

require_command go
require_command tar
mkdir -p "$PACKAGE_DIR" "$GO_CACHE_DIR"

FRONTEND_BUILD=(npm run build --prefix "$ROOT_DIR/web")

echo "[1/3] Preparing frontend dependencies"
if [[ -x "$ROOT_DIR/web/node_modules/.bin/vite" ]]; then
  echo "Frontend dependencies already installed"
elif [[ -f "$ROOT_DIR/web/pnpm-lock.yaml" ]]; then
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

echo "[3/3] Building ${OS_NAME}/${ARCH_NAME} service binary"
GOCACHE="$GO_CACHE_DIR" go build -trimpath -ldflags="-s -w" -o "$PACKAGE_DIR/family-english" "$ROOT_DIR/cmd/server"
cp "$ROOT_DIR/docs/operations/self-hosted-deployment.md" "$PACKAGE_DIR/DEPLOYMENT.md"
cp "$ROOT_DIR/README.md" "$PACKAGE_DIR/README.md"

ARCHIVE="$RELEASE_DIR/$PACKAGE_NAME.tar.gz"
tar -C "$RELEASE_DIR" -czf "$ARCHIVE" "$PACKAGE_NAME"

if command -v shasum >/dev/null 2>&1; then
  shasum -a 256 "$ARCHIVE" > "$ARCHIVE.sha256"
else
  sha256sum "$ARCHIVE" > "$ARCHIVE.sha256"
fi

echo
echo "Package created: $ARCHIVE"
echo "Checksum: $ARCHIVE.sha256"
