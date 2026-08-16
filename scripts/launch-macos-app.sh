#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_BUNDLE="$ROOT/build/macos/WORLDSEED.app"

"$ROOT/scripts/build-macos-app.sh"
open "$APP_BUNDLE"
