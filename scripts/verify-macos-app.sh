#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_BUNDLE="${1:-$ROOT/build/macos/WORLDSEED.app}"
PLIST="$APP_BUNDLE/Contents/Info.plist"
EXECUTABLE="$APP_BUNDLE/Contents/MacOS/WORLDSEED"
WEB_INDEX="$APP_BUNDLE/Contents/Resources/web/index.html"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "ERROR: macOS bundle verification must run on macOS." >&2
  exit 1
fi

[[ -d "$APP_BUNDLE" ]] || { echo "ERROR: Missing app bundle: $APP_BUNDLE" >&2; exit 1; }
[[ -f "$PLIST" ]] || { echo "ERROR: Missing Info.plist" >&2; exit 1; }
[[ -x "$EXECUTABLE" ]] || { echo "ERROR: Missing executable WORLDSEED binary" >&2; exit 1; }
[[ -f "$WEB_INDEX" ]] || { echo "ERROR: Missing bundled web index" >&2; exit 1; }

plutil -lint "$PLIST" >/dev/null

[[ "$(/usr/libexec/PlistBuddy -c 'Print :CFBundleExecutable' "$PLIST")" == "WORLDSEED" ]] || {
  echo "ERROR: CFBundleExecutable mismatch" >&2
  exit 1
}
[[ "$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$PLIST")" == "com.westkitty.worldseed" ]] || {
  echo "ERROR: CFBundleIdentifier mismatch" >&2
  exit 1
}

if grep -E 'src="/assets/|href="/assets/' "$WEB_INDEX" >/dev/null 2>&1; then
  echo "ERROR: Bundled Vite output contains root-absolute asset URLs; WKWebView file loading would break." >&2
  exit 1
fi

codesign --verify --deep --strict --verbose=2 "$APP_BUNDLE"

echo "macOS bundle verification: PASS"
