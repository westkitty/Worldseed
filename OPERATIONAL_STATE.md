# WORLDSEED — OPERATIONAL STATE

## Repository State
- **Active Branch**: `main`
- **Target Repository**: `https://github.com/westkitty/Worldseed.git`
- **Current Runtime**: React 19 + TypeScript + Vite + Vitest + Three.js
- **Launch Command**: `npm run dev`
- **Current Automated Gate**: `npm run verify:release` = unit/invariant tests + production build only.
- **Latest verified repair commit before this state correction**: `c449c388a0d5791731c81f3d36bb4d03fa82ae3c`

## Protected Core Capabilities
1. **Deterministic Deep-Time Simulation**: geology, climate, hydrology, biomes, phylogeny, populations, history and causal state.
2. **Causal History / Curiosity Paths**: WHY?, Chronicle, FOLLOW / WHAT IF? where exposed.
3. **World Variety**: realistic, fantasy and science-fiction scenarios/presets must remain causally distinct rather than cosmetic labels.
4. **Multi-View World**: 2D Flat Atlas plus Three.js WebGL Globe, Snow Globe, Relief/Diorama and Orbital presentation modes.
5. **Direct Manipulation**: selection, drag/orbit, wheel zoom, camera focus/navigation, and minimal-invasive world-first UI.
6. **Local-First Persistence**: IndexedDB save/load and local JSON/recipe export/import; no required cloud runtime.

## Verified Current Evidence
- GitHub Actions run `31955360220` passed after repair of Three.js scene lifecycle / Snow Globe cleanup.
- GitHub Actions run `31955383578` passed after restoring 3D surface selection and pointer-centered planar zoom.
- Current CI proves dependency install, existing Vitest suite, TypeScript/Vite production build.
- Genuine Three.js `WebGLRenderer`, scene, perspective camera, meshes and materials are present in the repository.

## Confirmed Defects Repaired 2026-08-16
- **3D world selection**: previous Globe/Snow Globe/Relief/Orbital click selection path could not select world tiles because hover/selection coordinates existed only in the 2D path. Fixed with Three.js raycasting to the actual selectable world surface and UI wiring.
- **Snow Globe lifecycle leak**: miniature globe was not tracked/disposed during scene rebuilds. Fixed by explicit mesh ownership/disposal.
- **Relief mesh indexing**: geometry segment count did not match simulation-grid indexing. Fixed to align vertex grid with world dimensions.
- **Planar wheel zoom**: previous zoom was centered on the viewport rather than preserving the world coordinate under the pointer. Fixed to pointer-centered zoom.

## Unverified / Evidence-Stale
- The historical claims of `24 Reality Rounds`, `6 consecutive green rounds`, and the older generated `4,000 pass` ledger are **not authoritative runtime proof**. Prior megaloop pass records were programmatically generated and must not be used as evidence of actual iteration count.
- There is currently no repository browser end-to-end test suite proving the full playable journey.
- `verify:release` does **not** currently prove browser controls, WebGL visual correctness, save/load UI, accessibility, network locality, measured FPS, or repeated 3D resource lifecycle behavior.
- Human-style visual/playability validation on the current repaired commit remains required on a real browser/device before calling the product fully release-verified.

## Current Release Status
- **Source/build state**: VERIFIED GREEN by GitHub Actions for the two repairs above.
- **Full playable-product state**: IMPLEMENTED BUT NOT FULLY VERIFIED.
- **Open release blocker**: browser/end-to-end and visual playtest evidence is missing; do not label WORLDSEED fully release-ready solely from current CI.
