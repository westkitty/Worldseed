# WORLDSEED — OPERATIONAL STATE

## Repository State
- **Active Branch**: `main`
- **Target Repository**: `https://github.com/westkitty/Worldseed.git`
- **Current Runtime**: React 19 + TypeScript + Vite + Vitest + Three.js, with a native SwiftUI + WebKit macOS wrapper.
- **Native Launch Command**: `npm run mac`
- **Browser Development Command**: `npm run dev`
- **Native App Output**: `build/macos/WORLDSEED.app`
- **Automated CI Gate**: unit/invariant tests + TypeScript/Vite production build + real headless Chromium playtest + native macOS wrapper build/bundle verification/smoke launch.
- **Browser evidence**: screenshots and JSON report are uploaded by CI as `worldseed-browser-playtest` artifacts.
- **Last fully verified implementation commit**: `d2ac842789ac2fff8845dddbc75bc054f1a2037e` (GitHub Actions run `31976573499`, SUCCESS across both Linux/browser and macOS-native jobs).

## Protected Core Capabilities
1. **Deterministic Deep-Time Simulation**: geology, climate, hydrology, biomes, phylogeny, populations, history and causal state.
2. **Causal History / Curiosity Paths**: WHY?, Chronicle, FOLLOW / WHAT IF? where exposed.
3. **World Variety**: realistic, fantasy and science-fiction scenarios/presets must remain causally distinct rather than cosmetic labels.
4. **Multi-View World**: 2D Flat Atlas plus Three.js WebGL Globe, Snow Globe, Relief/Diorama and Orbital presentation modes.
5. **Direct Manipulation**: selection, drag/orbit, wheel zoom, WASD/arrows, camera focus/navigation, and minimal-invasive world-first UI.
6. **Local-First Persistence**: IndexedDB save/load and local JSON/recipe export/import; no required cloud runtime.
7. **Native macOS Surface**: WORLDSEED can launch as its own standard macOS application window without a browser window or local HTTP server.

## Confirmed Repairs During Final Audit — 2026-08-16
- Restored actual 3D surface selection in Globe, Snow Globe, Relief/Diorama and Orbital views through Three.js raycasting.
- Fixed Snow Globe mesh ownership/disposal leak and component-unmount WebGL cleanup.
- Fixed relief geometry grid indexing and normalized meter-like elevation into sane Three.js scene units.
- Fixed pointer-centered planar wheel zoom and removed browser passive-wheel `preventDefault` errors discovered by the first real Chromium run.
- Prevented rebuilding Three.js geometry on every simulation tick; live state/layers update textures/terrain in place where possible.
- Wired selected map layers into both 2D and 3D world rendering instead of changing only legend/control state.
- Synchronized simulation Play and speed controls with authoritative `SimulationEngine` state; continuous 20x simulation is now a browser regression check.
- Added causal ecological effects for fantasy/science-fantasy mana and sci-fi machine/terraforming substrate instead of leaving genre entirely cosmetic.
- Made ecological migration respect bounded, spherical/cylindrical/ring and toroidal edge semantics instead of always wrapping horizontally.
- Added versioned/validated persistence envelopes plus private runtime snapshots for population maps, PRNG state and entity counters.
- Added deterministic `save -> restore -> continue` tests, including a branched/intervened world, and a browser IndexedDB save/load round trip.
- Reassigned WASD/arrows to camera navigation and removed the old W/D modal-shortcut conflict; `+/-` zoom and Home reset are exposed in the control guide.
- Corrected flat-world minimap/follow centering math in `8f96570e09c115f9d04ca633db7c66596a42308d`.

## Native macOS Wrapper — Verified 2026-08-16
- Added `macos/WorldseedApp.swift`, a native SwiftUI `WindowGroup` containing `WKWebView`, producing normal macOS title-bar controls, app/window menus, Dock presence, resize/minimize/full-screen behavior, and independent application lifecycle.
- The wrapper loads the production Vite build directly from `WORLDSEED.app/Contents/Resources/web`; no local HTTP server is required at runtime.
- The wrapper uses WebKit's persistent website data store so existing IndexedDB/local-storage semantics remain available inside the native application.
- JSON import is routed through a native `NSOpenPanel` because macOS WKWebView file uploads require an explicit UI delegate.
- JSON/blob downloads are routed through `WKDownloadDelegate` and a native `NSSavePanel`.
- JavaScript alert/confirm/prompt surfaces map to native macOS dialogs.
- External URL schemes open in the user's default browser instead of silently navigating the WORLDSEED window away from local content.
- Build tooling creates `build/macos/WORLDSEED.app`, validates `Info.plist`, verifies relative Vite asset paths, compiles the Swift executable, applies local ad-hoc signing, and checks the bundle with `codesign --verify --deep --strict`.
- GitHub Actions run `31976573499` on commit `d2ac842789ac2fff8845dddbc75bc054f1a2037e` passed the macOS 14 native-wrapper job, including build/bundle verification and a five-second process smoke launch.
- The same CI run passed the existing Linux unit suite, production build, production preview, real Chromium playtest, and browser evidence upload; the wrapper change did not regress the verified browser path.

## Verified Evidence
- GitHub Actions `31976573499`: SUCCESS for both jobs on `d2ac842789ac2fff8845dddbc75bc054f1a2037e`.
- macOS native job: dependency install, native app build, plist/resource validation, ad-hoc signature verification, and app-process smoke launch all passed.
- Linux/browser job: current Vitest suite, TypeScript/Vite production build, Chromium install, production preview launch, real Chromium interaction test, and browser evidence upload all passed.
- Earlier Chromium CI correctly failed on a passive-wheel console error before that defect was fixed, proving the browser gate can discover runtime failures instead of merely self-certifying success.
- The browser test exercises WebGL hero views, orbit/drag/zoom, 3D selection, layer switching, repeated view switching, keyboard camera controls, continuous simulation, Immersion Mode and IndexedDB save/load.
- A dedicated runtime-persistence test compares continued simulation after serialization/restoration against the uninterrupted original engine.
- Genuine Three.js `WebGLRenderer`, scene, perspective camera, meshes, materials, depth and raycasting are part of the current runtime.

## Evidence Not Accepted As Release Proof
- Historical claims of `24 Reality Rounds`, `6 consecutive green rounds`, and the old generated `4,000 pass` ledger are not authoritative runtime proof. The megaloop records were programmatically generated and remain historical narrative only.
- A passing build alone is not proof of playability.
- A generated ledger entry is not proof of a user journey.

## Known Limits / Remaining Spec Gaps
- **Starting-era fidelity remains incomplete.** Scenario configuration exposes named starting eras, but the current core has not been proven to bootstrap each named era into a biologically, technologically and historically coherent starting state. Do not describe every starting-era option as fully simulated until that behavior is implemented and directly tested.
- **Exotic topology depth remains partial.** Migration now respects topology edge semantics, but ringworld/floating-island/cavern choices have not been proven to alter every relevant geology, climate and civilization subsystem.
- **Visual art depth is functional/stylized rather than bespoke high-detail production art.** Current Three.js views are genuine 3D but should not be described as equivalent to a fully authored commercial art pipeline.
- **Native signing/notarization**: the local build is ad-hoc signed only. Developer ID signing, notarization, stapling, Gatekeeper distribution testing, and a custom app icon have not been performed and must not be claimed.
- Headless browser QA proves tested interactions and captures screenshots; it is not a substitute for a human aesthetic review of every seed/genre/view combination.

## Current Release Status
- **Core source/build**: VERIFIED GREEN on `d2ac842789ac2fff8845dddbc75bc054f1a2037e`.
- **Playable browser core**: VERIFIED GREEN with real Chromium on the same commit.
- **Native macOS wrapper**: VERIFIED GREEN for build, bundle validation and smoke-launch process on macOS 14 CI.
- **Developer-distribution status**: LOCAL BUILD READY; not Developer ID signed or notarized.
- **Full original mega-spec parity**: PARTIAL because starting-era fidelity and deeper exotic-topology semantics remain incomplete.
- **Release guidance**: WORLDSEED is demonstrably runnable/playable through the verified browser journey and now has a verified native macOS application wrapper, but do not claim every historical mega-prompt requirement or public-distribution signing step is complete.
