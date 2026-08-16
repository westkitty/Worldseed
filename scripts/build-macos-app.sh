#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_NAME="WORLDSEED"
APP_BUNDLE="$ROOT/build/macos/$APP_NAME.app"
CONTENTS="$APP_BUNDLE/Contents"
MACOS_DIR="$CONTENTS/MacOS"
RESOURCES_DIR="$CONTENTS/Resources"
WEB_DIR="$RESOURCES_DIR/web"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "ERROR: WORLDSEED's native wrapper must be built on macOS." >&2
  exit 1
fi

for command_name in node npm xcrun codesign plutil; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "ERROR: Required command '$command_name' is missing." >&2
    exit 1
  fi
done

if ! xcrun --find swiftc >/dev/null 2>&1; then
  echo "ERROR: Swift compiler not found. Install Xcode Command Line Tools with: xcode-select --install" >&2
  exit 1
fi

cd "$ROOT"
if [[ ! -d node_modules ]]; then
  npm ci
fi

npm run build:mac:web

rm -rf "$APP_BUNDLE"
mkdir -p "$MACOS_DIR" "$WEB_DIR"
cp -R "$ROOT/dist/." "$WEB_DIR/"

VERSION="$(node -p "require('./package.json').version")"
sed "s/__VERSION__/$VERSION/g" "$ROOT/macos/Info.plist" > "$CONTENTS/Info.plist"

ARCH="$(uname -m)"
case "$ARCH" in
  arm64|x86_64) ;;
  *)
    echo "ERROR: Unsupported macOS architecture: $ARCH" >&2
    exit 1
    ;;
esac

xcrun --sdk macosx swiftc \
  -O \
  -parse-as-library \
  -target "${ARCH}-apple-macos13.0" \
  -framework AppKit \
  -framework SwiftUI \
  -framework WebKit \
  "$ROOT/macos/WorldseedApp.swift" \
  -o "$MACOS_DIR/$APP_NAME"

chmod 755 "$MACOS_DIR/$APP_NAME"
codesign --force --deep --sign - --timestamp=none "$APP_BUNDLE"

"$ROOT/scripts/verify-macos-app.sh" "$APP_BUNDLE"

echo "Built native macOS app: $APP_BUNDLE"
