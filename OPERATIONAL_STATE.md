# WORLDSEED — OPERATIONAL STATE

## Repository State
- **Active Branch**: `main`
- **Target Repository**: `https://github.com/westkitty/Worldseed.git`
- **Current Runtime**: React 19 + TypeScript + Vite + Vitest + Three.js, with a native SwiftUI + WebKit macOS wrapper.
- **Native Launch Command**: `npm run mac`
- **Browser Development Command**: `npm run dev`
- **Native App Output**: `build/macos/WORLDSEED.app`
- **Automated CI Gate**: unit/invariant tests + TypeScript/Vite production build + real headless Chromium playtest + native macOS wrapper build/bundle verification + native WebKit render/readiness check.
- **Browser evidence**: screenshots and JSON report are uploaded by CI as `worldseed-browser-playtest` artifacts.
- **Last fully verified implementation commit before the native white-screen repair**: `d2ac842789ac2fff8845dddbc75bc054f1a2037e` (GitHub Actions run `31976573499`, SUCCESS across both Linux/browser and macOS-native jobs), but that native job only proved process survival and did not prove rendered content.

## Protected Core Capabilities
1. **Deterministic Deep-Time Simulation**: geology, climate, hydrology, biomes, phylogeny, populations, history and causal state.
2. **Causal History / Curiosity Paths**: WHY?, Chronicle, FOLLOW / WHAT IF? where exposed.
3. **World Variety**: realistic, fantasy and science-fiction scenarios/presets must remain causally distinct rather than cosmetic labels.
4. **Multi-View World**: 2D Flat Atlas plus Three.js WebGL Globe, Snow Globe, Relief/Diorama and Orbital presentation modes.
5. **Direct Manipulation**: selection, drag/orbit, wheel zoom, WASD/arrows, camera focus/navigation, and minimal-invasive world-first UI.
6. **Local-First Persistence**: IndexedDB save/load and local JSON/recipe export/import; no required cloud runtime.
7. **Native macOS Surface**: WORLDSEED launches as its own standard macOS application window without a browser window or external/public server dependency.

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

## Native macOS Wrapper
- The first native wrapper implementation built, signed, verified and stayed alive on macOS CI, but a real user launch on `/Users/andrew/Worldseed/build/macos/WORLDSEED.app` produced a blank white window. That makes the earlier process-only smoke evidence insufficient for native playability.
- The current repair replaces direct `file://` app boot with an app-owned `worldseed://` `WKURLSchemeHandler` that serves bundled `Contents/Resources/web` assets with explicit MIME types, following WebKit's supported custom-scheme local-resource pattern while keeping runtime content local to the app bundle.
- The wrapper still uses WebKit's persistent website data store and retains native `NSOpenPanel`, `NSSavePanel`, JavaScript alert/confirm/prompt integration, and external-link handoff to the default browser.
- The wrapper now captures JavaScript/runtime/navigation failures and reports a visible native error instead of silently leaving a blank white window.
- The macOS CI job now requires the actual React root to render and an IndexedDB open operation to succeed inside the native `WKWebView`; process survival alone no longer counts as native readiness.
- **Current native white-screen repair commit**: `e6a6afa7babdf92637ab70a0ac5d761cbab0ffce` — implemented and awaiting/undergoing fresh CI validation before promotion to verified.

## Verified Evidence
- GitHub Actions `31976573499`: SUCCESS for both jobs on `d2ac842789ac2fff8845dddbc75bc054f1a2037e`, but the native portion is now reclassified as build/bundle/process verification only, not rendered-UI proof.
- Linux/browser job on that run: current Vitest suite, TypeScript/Vite production build, Chromium install, production preview launch, real Chromium interaction test, and browser evidence upload all passed.
- Earlier Chromium CI correctly failed on a passive-wheel console error before that defect was fixed, proving the browser gate can discover runtime failures instead of merely self-certifying success.
- The browser test exercises WebGL hero views, orbit/drag/zoom, 3D selection, layer switching, repeated view switching, keyboard camera controls, continuous simulation, Immersion Mode and IndexedDB save/load.
- A dedicated runtime-persistence test compares continued simulation after serialization/restoration against the uninterrupted original engine.
- Genuine Three.js `WebGLRenderer`, scene, perspective camera, meshes, materials, depth and raycasting are part of the current runtime.

## Evidence Not Accepted As Release Proof
- Historical claims of `24 Reality Rounds`, `6 consecutive green rounds`, and the old generated `4,000 pass` ledger are not authoritative runtime proof. The megaloop records were programmatically generated and remain historical narrative only.
- A passing build alone is not proof of playability.
- A native process staying alive is not proof that the native interface rendered.
- A generated ledger entry is not proof of a user journey.

## Known Limits / Remaining Spec Gaps
- **Starting-era fidelity remains incomplete.** Scenario configuration exposes named starting eras, but the current core has not been proven to bootstrap each named era into a biologically, technologically and historically coherent starting state. Do not describe every starting-era option as fully simulated until that behavior is implemented and directly tested.
- **Exotic topology depth remains partial.** Migration now respects topology edge semantics, but ringworld/floating-island/cavern choices have not been proven to alter every relevant geology, climate and civilization subsystem.
- **Visual art depth is functional/stylized rather than bespoke high-detail production art.** Current Three.js views are genuine 3D but should not be described as equivalent to a fully authored commercial art pipeline.
- **Native signing/notarization**: the local build is ad-hoc signed only. Developer ID signing, notarization, stapling, Gatekeeper distribution testing, and a custom app icon have not been performed and must not be claimed.
- Headless browser QA proves tested interactions and captures screenshots; it is not a substitute for a human aesthetic review of every seed/genre/view combination.

## Current Release Status
- **Core source/build**: VERIFIED GREEN through the last completed browser validation.
- **Playable browser core**: VERIFIED GREEN with real Chromium.
- **Native macOS wrapper**: KNOWN-BROKEN at the previous `file://` boot path due to a user-observed white screen; repair `e6a6afa7...` is implemented but must pass the stronger native render/readiness CI before being called fixed.
- **Developer-distribution status**: LOCAL BUILD ONLY; not Developer ID signed or notarized.
- **Full original mega-spec parity**: PARTIAL because starting-era fidelity and deeper exotic-topology semantics remain incomplete.
- **Release guidance**: do not call the native macOS path fixed until the new content-render + IndexedDB native CI gate passes and the user confirms the rebuilt app renders on the target Mac.
