# WORLDSEED native macOS wrapper

The macOS wrapper packages the production WORLDSEED web build inside a native SwiftUI + WebKit application bundle. It does not require a browser window or a local HTTP server at runtime.

## What the wrapper provides

- A normal macOS application window with title bar, traffic-light controls, Dock presence, standard application/window menus, resizing, minimization, and full-screen behavior.
- The WORLDSEED production build bundled under `WORLDSEED.app/Contents/Resources/web` and loaded directly by `WKWebView`.
- Persistent WebKit website data for WORLDSEED's IndexedDB/local storage.
- Native macOS file-open handling for WORLDSEED JSON import.
- Native macOS save panels for WORLDSEED JSON export/downloads.
- JavaScript alert/confirm/prompt panels mapped to native macOS dialogs.
- External web links opened in the user's default browser rather than navigated inside the WORLDSEED window.
- Local ad-hoc code signing for the locally built app bundle. This is not Developer ID signing or notarization.

## Requirements

- macOS 13 or later
- Node.js 18 or later and npm
- Xcode Command Line Tools (`xcode-select --install` if missing)

## Build

```bash
npm ci
npm run build:mac
```

The app is created at:

```text
build/macos/WORLDSEED.app
```

## Build and launch

```bash
npm ci
npm run mac
```

`npm run mac` rebuilds the production web bundle, rebuilds and verifies the native app, then opens `WORLDSEED.app` with the normal macOS application launcher.
