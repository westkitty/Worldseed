# WORLDSEED — OPERATIONAL STATE

## Repository State
- **Active Branch**: `main`
- **Target Repository**: `https://github.com/westkitty/Worldseed.git`
- **Local Project Root**: `/Users/andrew/Worldseed`
- **Current Runtime**: React 19 + TypeScript + Vite + Vitest + Three.js, with a native SwiftUI + WebKit macOS wrapper.
- **Native Build Command**: `npm run build:mac`
- **Native Launch Command**: `npm run mac`
- **Browser Development Command**: `npm run dev`
- **Native App Output**: `build/macos/WORLDSEED.app`
- **Current verified implementation commit**: `97a0747d6f7629f179cef725d1d83aee8ef7e39b`.
- **Current verification run**: GitHub Actions `31984208870` — native macOS and Linux/browser jobs SUCCESS.

## Product Contract
WORLDSEED is a world-first deep-time biosphere/civilization simulator. The simulation is the primary interface. The normal experience should be:

**SEE WORLD → NAVIGATE → NOTICE → INSPECT → FOLLOW / WHY? / WHAT IF? → RUN TIME → WATCH CONSEQUENCES**

Visible product behavior takes precedence over completion ledgers, generated pass counts, implementation comments, or feature labels.

## Superseded / Rejected Presentation
- The pre-rebuild dashboard-heavy product surface is rejected. Do not restore the permanent toolbar/card-wall/modal-first layout as the default experience.
- The old procedural soundscape consisting of continuous 55 Hz and 82.4 Hz oscillator drones is rejected. Do not restore continuous oscillator ambience.
- A user-provided target-Mac screen recording established that the old surface was visually unacceptable and that its continuous sound was painful.
- Historical `4,000 pass`, `24 Reality Round`, and similar generated/self-certified ledgers remain non-authoritative. They do not prove product quality or runtime behavior.

## Current World-First Surface — Verified 2026-08-16
- Globe is the default presentation instead of the old flat debug-map/dashboard composition.
- The world owns the full viewport; secondary controls float over it rather than consuming permanent dashboard space.
- The default HUD is limited to a small WORLDSEED identity chip, compact view/layer/search/tools/new-world controls, and a compact time/curiosity control strip.
- Secondary systems such as Tree of Life, Chronicle, World Lab, discoveries, field guide, civilization dossier, languages, Twin Worlds, branch comparison, stats, saves, and settings remain available but are hidden until requested.
- Selection opens a compact contextual inspector rather than a permanent sidebar.
- The inspector exposes the curiosity triad directly: **FOLLOW / WHY? / WHAT IF?**.
- Search is contextual and hidden until requested.
- Minimap and map legend are visually demoted and reveal more detail on hover instead of competing with the world.
- Immersion mode remains available for nearly chrome-free observation.

## Audio Contract — Verified 2026-08-16
- Audio defaults to **OFF / silent**.
- Starting or accelerating simulation time does not initialize continuous audio oscillators.
- The sound engine no longer creates an always-running drone.
- If the user explicitly enables audio, the current implementation uses sparse, short, low-level event tones for discoveries/extinctions only.
- Browser acceptance instrumentation verifies zero oscillator creation before explicit audio enable, including while time is running.

## 3D / World Presentation — Verified 2026-08-16
- Globe, Snow Globe, Relief/Diorama, and Orbital modes use genuine Three.js WebGL rendering with perspective camera, geometry, depth, lighting, materials, meshes, and raycasting.
- Globe has planet surface, atmosphere and cloud shell.
- Snow Globe has planet, glass shell, base and bounded particle field.
- Relief/Diorama uses displaced terrain geometry.
- Orbital view has planet/atmosphere plus orbital-scale framing and moon geometry.
- Switching hero views resets to mode-appropriate camera framing instead of inheriting destructive zoom from the previous view.
- World textures use biome/water/elevation/fertility/vegetation information with physical shading and deterministic surface grain.
- Settlements and ruins can appear as restrained spatial markers in 3D when present.
- 3D state refresh is decoupled from simulation cadence so expensive texture regeneration does not execute on every simulation tick.
- WebGL meshes, materials, textures, animation frames and renderer resources retain explicit disposal paths.

## 2D Cartography — Verified 2026-08-16
- Flat Atlas and Square World no longer use the old sprite/debug-grid presentation as their final renderer.
- A smooth cartographic renderer now provides terrain/biome surface treatment, coastlines, rivers, settlement marks and ruin marks.
- Square World presents the map as a framed world-table surface rather than a bare pixel grid.
- Expensive atlas rendering is cached in bounded ten-year terrain buckets; settlements/ruins remain drawn live.
- Per-tile throwaway canvas allocation discovered during visual/performance QA was removed before the current verified commit.

## Simulation Timing — Verified 2026-08-16
- SimulationEngine remains authoritative for world state.
- Play/pause and speed settings are synchronized with engine state.
- Playback now advances from elapsed real time using `requestAnimationFrame`, carries fractional simulated years forward, and performs bounded catch-up after rendering stalls.
- Simulation speed therefore no longer depends on how many timer callbacks happened to fire while rendering was busy.
- Current browser verification advanced **18 simulated years** during the bounded 20× timing check.

## Persistence — Verified 2026-08-16
- Save/load uses versioned persistence envelopes and engine runtime snapshots.
- Runtime snapshots preserve private simulation state needed for deterministic continuation, including population maps, PRNG state, and entity counters.
- The browser journey performs save → mutate world by +10 years → load → wait for asynchronous restoration → confirm the exact saved year.
- Current verified run restored year 91 after mutating to year 101.
- Dedicated engine tests cover deterministic continuation after serialization/restoration.

## Native macOS Wrapper — Verified in CI
- Native wrapper uses SwiftUI `WindowGroup` + `WKWebView` and produces a standard macOS application window.
- The old direct `file://` boot path is superseded because it produced a real target-Mac white screen.
- Bundled web content is served locally through the app-owned `worldseed://` `WKURLSchemeHandler` with explicit MIME types.
- No external/public HTTP server is required at runtime.
- WebKit uses persistent website data storage so IndexedDB remains available.
- Native `NSOpenPanel` / `NSSavePanel` handle import/export paths; external links open in the default browser.
- JavaScript/runtime/navigation failures are surfaced rather than silently presenting a blank white window.
- macOS CI requires actual React `#root` content plus successful IndexedDB access inside native WebKit; process survival alone is not accepted.
- Current commit `97a0747...` passed the macOS native build, bundle verification, rendered-root check, and IndexedDB readiness gate.

## Current Browser Acceptance Gate
The real Chromium journey now verifies the product experience rather than an inventory of dashboard controls. It checks:
- default Globe view;
- full-viewport world coverage;
- compact timeline dimensions;
- secondary dashboard tools hidden initially;
- real WebGL hero views;
- orbit/drag/zoom and surface selection;
- contextual FOLLOW / WHY? / WHAT IF? actions;
- World Lab entry from selection;
- observation-layer switching;
- keyboard camera navigation;
- audio silent until explicitly enabled;
- continuous 20× simulation pacing;
- IndexedDB save/load round trip with asynchronous restoration;
- repeated switching across all six presentation modes;
- Immersion Mode;
- browser console/page runtime errors.

### Current browser evidence
GitHub Actions run `31984208870`, commit `97a0747d6f7629f179cef725d1d83aee8ef7e39b`:
- unit/invariant tests: PASS
- TypeScript/Vite production build: PASS
- Chromium user journey: PASS
- default view: Globe
- world viewport coverage: 100% width / 100% height
- curiosity triad: PASS
- audio silent until enabled: PASS
- hero views: Globe / Snow Globe / Relief-Diorama / Orbital
- repeated view switches: 18
- continuous 20× timing check: +18 simulated years
- persistence round trip: saved 91 → mutated 101 → restored 91
- runtime errors: 0

## Visual QA Evidence
- Green-run screenshots were manually inspected after the automated gate rather than accepting the green badge alone.
- The current Globe surface is world-dominant with quiet controls and no permanent dashboard wall.
- Snow Globe is spatially framed with glass/base/particle treatment.
- Relief/Diorama exposes actual terrain depth.
- Orbital view retains stable independent camera framing.
- The first smooth 2D cartography pass was visually inspected; the old hard sprite-grid appearance is superseded, though the underlying simulation grid still limits geographical visual resolution.

## Protected Core Capabilities
1. **Deterministic Deep-Time Simulation**: geology, climate, hydrology, biomes, phylogeny, populations, history and causal state.
2. **Causal History / Curiosity Paths**: WHY?, Chronicle, FOLLOW / WHAT IF? where exposed.
3. **World Variety**: realistic, fantasy and science-fiction scenarios/presets must remain causally distinct rather than cosmetic labels.
4. **Multi-View World**: Flat Atlas, Square World, WebGL Globe, Snow Globe, Relief/Diorama and Orbital presentation.
5. **Direct Manipulation**: selection, drag/orbit, wheel zoom, WASD/arrows, camera focus/navigation, and minimal-invasive world-first UI.
6. **Local-First Persistence**: IndexedDB save/load and local JSON/recipe export/import; no required cloud runtime.
7. **Native macOS Surface**: own standard macOS application window without a browser window or external/public server dependency.
8. **Silent-by-default audio**: no continuous oscillator ambience.

## Evidence Not Accepted As Release Proof
- Generated iteration/pass ledgers.
- Build success without runtime interaction.
- Native process survival without rendered content.
- Class/function names containing `3D` without WebGL runtime evidence.
- UI controls that render but are not exercised.
- A single screenshot as proof of all world seeds/scenarios.

## Known Limits / Remaining Spec Gaps
- **Target-Mac rebuild/review pending for this world-first surface.** CI and screenshots verify the rebuilt behavior, but the user has not yet pulled and visually judged commit `97a0747...` in `/Users/andrew/Worldseed`.
- **Starting-era fidelity remains incomplete.** Named starting eras are exposed, but the simulation core has not been proven to bootstrap every named era into a biologically, technologically and historically coherent state. Do not claim full era parity.
- **Exotic topology depth remains partial.** Edge/migration behavior differentiates topologies, but exotic topology choices have not been proven to alter every geology/climate/civilization subsystem.
- **Visual art depth remains procedural/stylized.** The rebuilt surface is materially cleaner and more dimensional, but it is not equivalent to a bespoke high-budget authored art pipeline.
- **Underlying geographic simulation resolution is still 64×48 for the default recipe.** Rendering can smooth and interpret that data but cannot manufacture geological detail that the simulation does not contain.
- **Native signing/notarization** remains local/ad-hoc only. No Developer ID signing, notarization, stapling or public Gatekeeper distribution certification is claimed.

## Current Release Status
- **Core source/build**: VERIFIED GREEN on `97a0747d6f7629f179cef725d1d83aee8ef7e39b`.
- **Playable browser core**: VERIFIED GREEN with the new world-first acceptance journey on the same commit.
- **Native macOS wrapper**: CI-VERIFIED GREEN for bundle build, real WebKit React rendering and IndexedDB on the same commit.
- **Product surface**: REBUILT and machine/visual-QA verified; target-user aesthetic verdict still pending.
- **Full original mega-spec parity**: PARTIAL because starting-era fidelity, deeper exotic-topology semantics, and authored art depth remain incomplete.
- **Developer distribution**: LOCAL BUILD ONLY; not Developer ID signed/notarized.
