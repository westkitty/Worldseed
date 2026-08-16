# WORLDSEED — OPERATIONAL STATE

## Repository State
- **Active Branch**: `main`
- **Target Repository**: `https://github.com/westkitty/Worldseed.git`
- **Current Runtime**: React 19 + TypeScript + Vite + Vitest + Three.js, with a native SwiftUI + WebKit macOS wrapper.
- **Native Launch Command**: `npm run mac`
- **Browser Development Command**: `npm run dev`
- **Native App Output**: `build/macos/WORLDSEED.app`
- **Automated CI Gate**: unit/invariant tests + TypeScript/Vite production build + real headless Chromium playtest + native macOS wrapper build/bundle verification + native WebKit rendered-root/IndexedDB readiness check.
- **Current native white-screen repair implementation**: `5fa5bde06ebace374cb57e10cca926308d353780`.

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

## Native macOS Wrapper — White-Screen Repair
- The first wrapper (`d2ac842...`) built, signed, verified and stayed alive on macOS CI, but the user's real launch from `/Users/andrew/Worldseed/build/macos/WORLDSEED.app` produced a blank white window. The old process-only smoke test is therefore not accepted as native playability proof.
- The direct `file://` boot path is superseded. The current wrapper uses an app-owned `worldseed://` `WKURLSchemeHandler` to serve bundled `Contents/Resources/web` HTML, JavaScript, CSS and other assets with explicit MIME types while keeping content entirely local to the bundle.
- The wrapper retains WebKit's persistent website data store, native `NSOpenPanel` import, `NSSavePanel` export, native JavaScript dialogs, and external-link handoff to the default browser.
- JavaScript exceptions, unhandled promises, WebKit navigation failures, content-process termination, root-render timeouts and IndexedDB failures are now surfaced instead of silently leaving a white window.
- CI no longer accepts process survival as the native gate. The macOS job now requires the actual React `#root` to contain rendered content and requires a real IndexedDB database open operation inside the native `WKWebView`.

## Verified Evidence
- **Native white-screen repair CI**: GitHub Actions run `31979297423`, macOS job on `5fa5bde06ebace374cb57e10cca926308d353780`, completed SUCCESS. Native app build/bundle verification passed; the new WebKit rendered-root + IndexedDB readiness test also passed.
- The same run's unit/invariant suite and TypeScript/Vite production build passed. Its full Chromium playtest was still running when this state entry was written; the browser source itself was not changed by the native repair.
- Prior GitHub Actions `31976573499` remains valid browser evidence: Vitest, production build, production preview, real Chromium interaction test and browser evidence upload all passed.
- The browser test exercises WebGL hero views, orbit/drag/zoom, 3D selection, layer switching, repeated view switching, keyboard camera controls, continuous simulation, Immersion Mode and IndexedDB save/load.
- A dedicated runtime-persistence test compares continued simulation after serialization/restoration against the uninterrupted original engine.
- Genuine Three.js `WebGLRenderer`, scene, perspective camera, meshes, materials, depth and raycasting are part of the current runtime.

## Evidence Not Accepted As Release Proof
- Historical claims of `24 Reality Rounds`, `6 consecutive green rounds`, and the old generated `4,000 pass` ledger are not authoritative runtime proof.
- A passing build alone is not proof of playability.
- A native process staying alive is not proof that the native interface rendered.
- A generated ledger entry is not proof of a user journey.

## Known Limits / Remaining Spec Gaps
- **Target-Mac confirmation pending for the repaired wrapper.** CI has directly verified native WebKit rendering and IndexedDB on macOS 14, but the user must pull/rebuild `5fa5bde...` or later and confirm the real `/Users/andrew/Worldseed` launch is no longer blank.
- **Starting-era fidelity remains incomplete.** Scenario configuration exposes named starting eras, but the current core has not been proven to bootstrap each named era into a biologically, technologically and historically coherent starting state.
- **Exotic topology depth remains partial.** Migration respects topology edge semantics, but ringworld/floating-island/cavern choices have not been proven to alter every relevant geology, climate and civilization subsystem.
- **Visual art depth is functional/stylized rather than bespoke high-detail production art.**
- **Native signing/notarization**: local builds are ad-hoc signed only. Developer ID signing, notarization, stapling, Gatekeeper distribution testing, and a custom app icon have not been performed.

## Current Release Status
- **Core source/build**: VERIFIED GREEN through the current native repair's unit/build gates.
- **Playable browser core**: VERIFIED GREEN from the last completed real-Chromium run; current repair does not modify browser application source.
- **Native macOS wrapper**: CI-VERIFIED for bundle build, actual WebKit React rendering and IndexedDB on repair `5fa5bde...`; target-Mac retest pending.
- **Developer-distribution status**: LOCAL BUILD ONLY; not Developer ID signed or notarized.
- **Full original mega-spec parity**: PARTIAL because starting-era fidelity and deeper exotic-topology semantics remain incomplete.
- **Release guidance**: the white-screen mechanism has been replaced and the stronger native render gate is green, but final target-Mac confirmation remains required before calling the user's native path fully verified.
