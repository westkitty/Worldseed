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
- **Current verified implementation commit**: `a4933aca98d6c5dedbb3f279eb0b588ff0a38e84` on `main`.
- **Current verification run**: GitHub Actions `31995322056` — native macOS and Linux/browser jobs SUCCESS.

## Product Contract
WORLDSEED is a world-first deep-time biosphere/civilization simulator. The simulation is the primary interface. The normal experience should be:

**SEE WORLD → NAVIGATE → NOTICE → INSPECT → FOLLOW / WHY? / WHAT IF? → RUN TIME → WATCH CONSEQUENCES**

Visible product behavior takes precedence over completion ledgers, generated pass counts, implementation comments, or feature labels.

## Twenty-Five-Defect Release Hardening — Verified 2026-08-17
The release implementation at `a4933aca98d6c5dedbb3f279eb0b588ff0a38e84` is a bounded correction pass over the existing world-first surface rather than a feature expansion. It preserves the protected simulation, persistence, and native-wrapper core while correcting determinism, input/accessibility, semantic UI, map legibility, causal routing, camera framing, and rendering-cost defects.

Verified outcomes include:
- `SURPRISE_ME` recipe randomization now derives from the seeded simulation PRNG and can reproduce the same topology/genre/era/planet parameters from the same seed.
- Emergent-discovery IDs no longer use wall-clock time.
- Browser Tab focus is restored; Tab no longer toggles Immersion Mode.
- World shortcuts no longer fire through focused controls/dialogs, while direct world camera controls remain available when the world owns input.
- Pointer/touch/pen world manipulation, pointer capture, current-coordinate picking, minimap keyboard navigation, and ResizeObserver-based viewport updates are in the release tree.
- The unscoped global `WHY?` action was removed from the timeline; WHY remains contextual to an inspected causal subject.
- Ruin WHY routing now uses an actual causal node through the originating settlement when available.
- UI no longer labels normalized terrain elevation as meters.
- Small-screen speed controls remain available and speed choices expose pressed-state semantics.
- Minimap/legend visibility and layer coverage were expanded without returning to dashboard-first chrome.
- Settings no longer expose local-only controls that pretended to alter runtime camera, performance, accessibility, weather, or simulation behavior.
- 2D observation overlays use smoothed map surfaces rather than hard per-cell rectangles, and a paused 2D world no longer runs an unnecessary full animation loop.
- 3D world texture refreshes and feature-marker rebuilds are more tightly bounded, uniform fake cloud haze is hidden, renderer pixel ratio is capped, and expensive full-texture grain work is replaced by bounded deterministic texture detail.
- Globe/Snow Globe/Orbit hero framing now uses corrected spherical focus math, an information-rich generated-world target, and less aggressively cropped starting distance.

The first hardening candidate failed its native build because a renderer enhancement type boundary collapsed to `never`; that failure was corrected rather than bypassed. A later green candidate was visually inspected and revealed weak 3D hero framing, which was also corrected before promotion to `main`.

## Verification Evidence — `main`
GitHub Actions run `31995322056`, commit `a4933aca98d6c5dedbb3f279eb0b588ff0a38e84`:
- unit/invariant tests: PASS
- TypeScript/Vite production build: PASS
- deterministic hardening tests: PASS
- native macOS build/bundle verification: PASS
- native WebKit rendered-root + IndexedDB readiness: PASS
- real Chromium user journey: PASS
- keyboard Tab navigation: PASS
- unscoped WHY removal: PASS
- contextual curiosity triad: PASS
- fake settings removal: PASS
- audio silent until explicitly enabled: PASS
- hero views: Globe / Snow Globe / Relief-Diorama / Orbital
- repeated view switches: 18
- continuous 20× timing check: +17 simulated years
- persistence round trip: saved 45 → mutated 55 → restored 45
- runtime console/page errors: 0
- green-run screenshots manually inspected after the automated gate

## Superseded / Rejected Presentation
- The pre-rebuild dashboard-heavy product surface is rejected. Do not restore the permanent toolbar/card-wall/modal-first layout as the default experience.
- The old procedural soundscape consisting of continuous 55 Hz and 82.4 Hz oscillator drones is rejected. Do not restore continuous oscillator ambience.
- A user-provided target-Mac screen recording established that the old surface was visually unacceptable and that its continuous sound was painful.
- Historical `4,000 pass`, `24 Reality Round`, and similar generated/self-certified ledgers remain non-authoritative. They do not prove product quality or runtime behavior.

## Current World-First Surface — Verified 2026-08-17
- Globe is the default presentation instead of the old flat debug-map/dashboard composition.
- The world owns the full viewport; secondary controls float over it rather than consuming permanent dashboard space.
- The default HUD is limited to a small WORLDSEED identity chip, compact view/layer/search/tools/new-world controls, and a compact time/curiosity control strip.
- Secondary systems such as Tree of Life, Chronicle, World Lab, discoveries, field guide, civilization dossier, languages, Twin Worlds, branch comparison, stats, saves, and settings remain available but are hidden until requested.
- Selection opens a compact contextual inspector rather than a permanent sidebar.
- The inspector exposes the curiosity triad directly: **FOLLOW / WHY? / WHAT IF?**.
- Search is contextual and hidden until requested.
- Minimap and map legend are visually demoted and reveal more detail on hover/focus instead of competing with the world.
- Immersion mode remains available for nearly chrome-free observation but is entered explicitly rather than by stealing browser Tab navigation.

## Audio Contract — Verified 2026-08-17
- Audio defaults to **OFF / silent**.
- Starting or accelerating simulation time does not initialize continuous audio oscillators.
- The sound engine no longer creates an always-running drone.
- If the user explicitly enables audio, the current implementation uses sparse, short, low-level event tones for discoveries/extinctions only.
- Browser acceptance instrumentation verifies zero oscillator creation before explicit audio enable, including while time is running.

## 3D / World Presentation — Verified 2026-08-17
- Globe, Snow Globe, Relief/Diorama, and Orbital modes use genuine Three.js WebGL rendering with perspective camera, geometry, depth, lighting, materials, meshes, and raycasting.
- Globe has planet surface and atmosphere treatment.
- Snow Globe has planet, glass shell, base and bounded particle field.
- Relief/Diorama uses displaced terrain geometry.
- Orbital view has planet/atmosphere plus orbital-scale framing and moon geometry.
- Switching hero views resets to mode-appropriate camera framing instead of inheriting destructive zoom from the previous view.
- Spherical focus math now centers the requested longitude/latitude correctly rather than applying the prior inverted/offset transform.
- Generated hero views initially bias toward information-rich regions using land, biomass, settlement, ruin and infrastructure signals, while retaining user-controlled orbit afterward.
- World textures use biome/water/elevation/fertility/vegetation information with physical shading and bounded deterministic surface detail.
- Settlements and ruins can appear as restrained spatial markers in 3D when present.
- 3D state refresh is decoupled from simulation cadence so expensive texture regeneration does not execute on every simulation tick.
- WebGL meshes, materials, textures, animation frames and renderer resources retain explicit disposal paths.

## 2D Cartography — Verified 2026-08-17
- Flat Atlas and Square World no longer use the old sprite/debug-grid presentation as their final renderer.
- A smooth cartographic renderer provides terrain/biome surface treatment, coastlines, rivers, settlement marks and ruin marks.
- Nonphysical observation layers are composed through smoothed low-resolution overlays rather than reintroducing hard tile rectangles.
- Square World presents the map as a framed world-table surface rather than a bare pixel grid.
- Expensive atlas rendering is cached in bounded ten-year terrain buckets; settlements/ruins remain drawn live.
- Per-tile throwaway canvas allocation discovered during visual/performance QA remains removed.
- A paused or reduced-motion 2D world no longer requires a permanently spinning visual animation loop.

## Simulation Timing — Verified 2026-08-17
- SimulationEngine remains authoritative for world state.
- Play/pause and speed settings are synchronized with engine state.
- Playback advances from elapsed real time using `requestAnimationFrame`, carries fractional simulated years forward, and performs bounded catch-up after rendering stalls.
- Simulation speed therefore no longer depends on how many timer callbacks happened to fire while rendering was busy.
- Current `main` browser verification advanced **17 simulated years** during the bounded 20× timing check.

## Persistence — Verified 2026-08-17
- Save/load uses versioned persistence envelopes and engine runtime snapshots.
- Runtime snapshots preserve private simulation state needed for deterministic continuation, including population maps, PRNG state, and entity counters.
- The browser journey performs save → mutate world by +10 years → load → wait for asynchronous restoration → confirm the exact saved year.
- Current `main` verification restored year 45 after mutating to year 55.
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
- Commit `a4933aca98d6c5dedbb3f279eb0b588ff0a38e84` passed the macOS native build, bundle verification, rendered-root check, and IndexedDB readiness gate in run `31995322056`.

## Current Browser Acceptance Gate
The real Chromium journey verifies the product experience rather than an inventory of dashboard controls. It checks:
- default Globe view;
- full-viewport world coverage;
- standard browser Tab focus without accidental Immersion entry;
- compact timeline dimensions and no unscoped WHY action;
- secondary dashboard tools hidden initially;
- real WebGL hero views;
- orbit/drag/zoom and surface selection;
- contextual FOLLOW / WHY? / WHAT IF? actions;
- World Lab entry from selection;
- observation-layer switching;
- keyboard camera navigation;
- fake/unwired settings absent;
- audio silent until explicitly enabled;
- continuous 20× simulation pacing;
- IndexedDB save/load round trip with asynchronous restoration;
- repeated switching across all six presentation modes;
- explicit Immersion Mode;
- browser console/page runtime errors.

## Visual QA Evidence
- Green-run screenshots were manually inspected after the automated gate rather than accepting the green badge alone.
- The current Globe surface is world-dominant with quiet controls and improved starting camera distance/focus.
- Snow Globe is spatially framed with glass/base/particle treatment.
- Relief/Diorama exposes actual terrain depth.
- Orbital view retains stable independent camera framing.
- The smooth 2D cartography remains materially cleaner than the old hard sprite-grid appearance, though the underlying simulation grid still limits geographical visual resolution.

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
- **Target-Mac rebuild/review pending for commit `a4933aca98d6c5dedbb3f279eb0b588ff0a38e84`.** CI and screenshots verify the rebuilt behavior, but the user has not yet pulled and visually judged this exact implementation in `/Users/andrew/Worldseed`.
- **Starting-era fidelity remains incomplete.** Named starting eras are exposed, but the simulation core has not been proven to bootstrap every named era into a biologically, technologically and historically coherent state. Do not claim full era parity.
- **Exotic topology depth remains partial.** Edge/migration behavior differentiates topologies, but exotic topology choices have not been proven to alter every geology/climate/civilization subsystem.
- **Visual art depth remains procedural/stylized.** The rebuilt surface is materially cleaner and more dimensional, but it is not equivalent to a bespoke high-budget authored art pipeline.
- **Underlying geographic simulation resolution is still 64×48 for the default recipe.** Rendering can smooth and interpret that data but cannot manufacture geological detail that the simulation does not contain.
- **Native signing/notarization** remains local/ad-hoc only. No Developer ID signing, notarization, stapling or public Gatekeeper distribution certification is claimed.

## Current Release Status
- **Core source/build**: VERIFIED GREEN on `a4933aca98d6c5dedbb3f279eb0b588ff0a38e84` in GitHub Actions `31995322056`.
- **Playable browser core**: VERIFIED GREEN with the hardened world-first acceptance journey on the same commit.
- **Native macOS wrapper**: CI-VERIFIED GREEN for bundle build, real WebKit React rendering and IndexedDB on the same commit.
- **Product surface**: world-first rebuild preserved and hardened; target-user aesthetic verdict for this exact implementation still pending.
- **Full original mega-spec parity**: PARTIAL because starting-era fidelity, deeper exotic-topology semantics, and authored art depth remain incomplete.
- **Developer distribution**: LOCAL BUILD ONLY; not Developer ID signed/notarized.
