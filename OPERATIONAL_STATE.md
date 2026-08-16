# WORLDSEED — OPERATIONAL STATE

## Repository State
- **Active Branch**: `main`
- **Target Repository**: `https://github.com/westkitty/Worldseed.git`
- **Current Runtime**: React 19 + TypeScript + Vite + Vitest + Three.js
- **Launch Command**: `npm run dev`
- **Automated CI Gate**: unit/invariant tests + TypeScript/Vite production build + real headless Chromium playtest.
- **Browser evidence**: screenshots and JSON report are uploaded by CI as `worldseed-browser-playtest` artifacts.

## Protected Core Capabilities
1. **Deterministic Deep-Time Simulation**: geology, climate, hydrology, biomes, phylogeny, populations, history and causal state.
2. **Causal History / Curiosity Paths**: WHY?, Chronicle, FOLLOW / WHAT IF? where exposed.
3. **World Variety**: realistic, fantasy and science-fiction scenarios/presets remain causally distinct rather than cosmetic labels.
4. **Multi-View World**: 2D Flat Atlas plus Three.js WebGL Globe, Snow Globe, Relief/Diorama and Orbital presentation modes.
5. **Direct Manipulation**: selection, drag/orbit, wheel zoom, WASD/arrows, camera focus/navigation, and minimal-invasive world-first UI.
6. **Local-First Persistence**: IndexedDB save/load and local JSON/recipe export/import; no required cloud runtime.

## Confirmed Repairs During Final Convergence — 2026-08-16
- Restored actual 3D surface selection in Globe, Snow Globe, Relief/Diorama and Orbital views through Three.js raycasting.
- Fixed Snow Globe mesh ownership/disposal leak.
- Fixed relief geometry grid indexing and normalized meter-like elevation into sane Three.js scene units.
- Fixed pointer-centered planar wheel zoom.
- Removed browser passive-wheel `preventDefault` errors discovered by the first real Chromium run.
- Prevented rebuilding Three.js geometry on every simulation tick; live state/layers update textures in place where possible.
- Added component-unmount WebGL disposal and repeated view-switch browser coverage.
- Synchronized simulation play/speed controls with the authoritative SimulationEngine state.
- Added versioned/validated persistence envelopes, backward-compatible legacy import, future-schema rejection, and IndexedDB transaction cleanup.
- Reassigned WASD/arrows to camera navigation and removed the old W/D modal shortcut conflict; `+/-` zoom and Home resets the flat overview.
- Added real Chromium coverage for WebGL hero views, orbit/zoom/select, layer switching, repeated view switching, keyboard camera controls, continuous simulation, Immersion Mode, and IndexedDB save → mutate → load.

## Verified Evidence
- Existing Vitest simulation suite has passed repeatedly in GitHub Actions, including deterministic/invariant and long-run soak fixtures.
- TypeScript compilation and Vite production build have passed repeatedly after the renderer/browser repairs.
- GitHub Actions run `31955849850` was the first complete real-browser green run after fixing the passive wheel error; it passed unit tests, build, preview launch, Chromium interaction and artifact upload.
- The initial real Chromium run `31955655690` correctly FAILED on passive wheel console errors, proving the browser gate can detect runtime defects instead of self-certifying success.
- Current final-head convergence run must pass before release status may be promoted further.

## Evidence Not Accepted As Release Proof
- Historical claims of `24 Reality Rounds`, `6 consecutive green rounds`, and the old generated `4,000 pass` ledger are not authoritative proof. The megaloop records were programmatically generated and remain historical narrative only.
- A passing build alone is not proof of playability.
- A generated ledger entry is not proof of a user journey.

## Current Release Status
- **Source/build state**: repeatedly green on recent repair commits.
- **Browser state**: one confirmed full Chromium green exists after the first browser-discovered defect was repaired; newer final-head changes are undergoing fresh convergence runs.
- **Visual quality note**: current 3D presentation is functional but deliberately stylized/coarse; the earlier Relief/Diorama screenshot exposed excessive vertical scale and that renderer defect has been corrected. Snow Globe/Globe art direction is not equivalent to a bespoke high-detail game-art production.
- **Promotion rule**: do not call the current head fully release-verified until the final-head Chromium gate completes successfully and repeated reruns remain green without further code changes.
