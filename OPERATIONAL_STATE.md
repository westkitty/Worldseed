# WORLDSEED — OPERATIONAL STATE

Last verified: 2026-08-18. Everything below was observed on this machine during this pass.
Claims that were not re-verified have been removed rather than carried forward.

## Repository State
- **Active Branch**: `main`
- **Target Repository**: `https://github.com/westkitty/Worldseed.git`
- **Runtime**: React 19 + TypeScript + Vite + Vitest + Three.js, with a native SwiftUI + WebKit macOS wrapper.
- **Native launch**: `npm run mac` · **Native build**: `npm run build:mac` · **Browser dev**: `npm run dev`
- **Native app output**: `build/macos/WORLDSEED.app`
- **CI gate** (`.github/workflows/ci.yml`): unit/invariant tests → TypeScript/Vite production build → real headless Chromium journey → native macOS build/bundle verification → native WebKit rendered-root + IndexedDB readiness check.

## Protected Core Capabilities
1. **Deterministic deep-time simulation**: geology, climate, hydrology, biomes, phylogeny, populations, history, causal state.
2. **Causal history / curiosity paths**: WHY?, Chronicle, FOLLOW, WHAT IF?.
3. **World variety**: realistic, fantasy and science-fiction rulesets remain causally distinct.
4. **Six presentation modes**: Flat Atlas, Square World, Globe, Snow Globe, Relief Diorama, Orbital.
5. **Direct manipulation**: pointer drag/orbit, wheel and pinch zoom, WASD/arrows, focus/navigation, world-first UI.
6. **Local-first persistence**: IndexedDB saves plus local JSON/recipe export/import.
7. **Native macOS surface**: launches as its own application window with no browser and no server.

---

## Reconciliation With `origin/main` (2026-08-18)

This pass began from a local `main` that was **20 commits behind `origin/main`**. Upstream had
independently rebuilt much of the same UI and renderer surface. Rather than discard either
line of work, the two were merged and every overlapping file was decided on its merits.

**Adopted from upstream** (better than what this pass had):
- Simulation now advances from elapsed wall-clock time on animation frames instead of timer
  callbacks, so throttled frames slow the apparent rate rather than silently changing how many
  years a tick covers.
- `src/runtime/accessibilityGuards.ts`: `Tab` is returned to the browser for focus traversal
  and application shortcuts are suppressed while an interactive control or modal has focus.
  The local `Tab`-toggles-Immersion handler was removed in favour of it.
- `src/audio/soundscape.ts` rebuilt as sparse opt-in event audio with no continuous oscillator.
- `SURPRISE_ME` is seed-deterministic (was `Math.random()`); its era pool has been widened to
  all ten eras now that eras genuinely bootstrap.
- The camera focus transform: the previous one inverted longitude and added a ninety-degree
  offset, so locator jumps could land on the limb or the far side of the planet.
- Opening framing that settles on the longitude band carrying the most land, life and
  settlement, reimplemented as a method on `ThreeWorldRenderer` rather than a prototype patch.
- Browser-journey assertions encoding the product contract: world dominates the viewport,
  default view is Globe, permanent chrome stays small, secondary tools stay hidden until
  asked for, zero audio oscillators ever constructed, no cosmetic settings exposed.
- `WHY?` was removed from the time deck. Unscoped, it fell back to an arbitrary causal node;
  it now appears only on a selection, where it has a real subject.

**Kept from this pass** (better than upstream's equivalent):
- `PlanetSurfaceCompositor` supersedes `SmoothMapRenderer`, which upscaled flat biome colours
  8x with bilinear smoothing and no elevation, shading, coastline, hydrology or micro-detail,
  and served the 2D views only. The compositor is shared by 2D and 3D.
- The Three.js hero views (atmosphere shader, cloud deck, snow-globe glass and plinth, relief
  sea plane and slab, viewport-derived framing) supersede the prototype-patching approach in
  `installThreeWorldEnhancements.ts`, whose texture path was a bilinear upscale of flat layer
  colours with random speckle.
- All simulation-layer work below, which upstream did not touch at all.

`SmoothMapRenderer.ts`, `installSmoothMapRenderer.ts` and `installThreeWorldEnhancements.ts`
were deleted after their genuine improvements were ported into the owning classes.

## Defects Corrected This Pass

### Simulation fidelity
- **Starting eras were cosmetic.** `config.startingEra` was written by the wizard and presets but never read by any simulation module: every world began at year 0 regardless of the era chosen, and the Advanced Builder had no control to choose one at all. `src/simulation/scenarios/startingEra.ts` now realises each era by running genuine deterministic simulation, then consolidating that era's defining structures (sapience, cities, technology in dependency order, predecessor ruins, fossil strata, industrial scarring, collapse) with dated historical events and causal links, then simulating a further settling period. The wizard now exposes the choice with each era's real summary and cost.
- **The default world was ~6% land and had no rivers or lakes anywhere.** The raw tectonic + noise elevation field had no fixed relationship to the configured `seaLevel`, so the threshold almost never produced continents. `applyHypsometricNormalization` in `planet/geology.ts` rank-remaps elevation onto a hypsometric curve, making `seaLevel` mean the fraction of surface underwater (default 0.42 → ~29% land) while preserving every ordering the geology produced.
- **Every world was mirror-symmetric east-to-west with latitude-banded, pole-hugging continents.** The cylindrical noise sampled only `cos(longitude)`; `sin` was computed and discarded. Both ring components are now sampled on separate planes and summed, keeping the field seamless at the date line while giving longitude real asymmetric structure.
- **The planet was effectively rainless.** Median land rainfall was 0.02, so continental interiors had no moisture, no rivers and desert/tundra biomes almost everywhere. The advection model also ran three identical passes that only tripled one pass's result. `planet/climate.ts` now models latitudinal convergence (ITCZ rain belt, subtropical desert belt, polar front), a two-lap wrapped sweep, evapotranspiration recycling over land, a convective baseline, and meridional smoothing.
- **Altitude was mis-scaled into the lapse rate**, putting median land near 1,900 m and freezing continents into tundra. Altitude now rises non-linearly with normalised elevation (sea level to ~7,500 m at the summits).
- Surveyed across seven seeds, default worlds now produce rainforest, temperate forest, grassland, savanna, desert, tundra and alpine zones, with 6–31 river tiles and 1–13 lakes each.
- **Topology was edge-wrapping in one module only.** `simulation/planet/topology.ts` is now the single definition of adjacency, distance and open edges, consumed by migration, hydrology (water leaves an open-edged world instead of pooling against the array bounds) and contagion travel distance. `LAYERED_CAVERNS` is now reachable from the wizard.
- **Branch IDs used `Date.now()`**, so a saved world reloaded with a different branch graph. They are now derived from world year and branch count.

### Rendering and runtime
- **The Relief Diorama 3D mesh was completely flat.** It divided a normalised −1..1 elevation field by 1800 as if it were metres. It now maps elevation directly into scene units with a restrained, deliberate exaggeration and a sea plane at the simulation's actual sea level.
- **The 3D world texture was reallocated every simulation tick** (a new canvas, a full repaint and a new `THREE.CanvasTexture` per tick, up to ~50/second at 1000×). One canvas and one texture are now reused; a tick only repaints and flags `needsUpdate`, and repainting is skipped entirely when nothing visible changed.
- **The 2D render loop was torn down and restarted on every simulation tick, camera nudge and hover move**, resetting its animation clock each time. It now runs once and reads live values through refs.
- **The 2D canvas ignored device pixel ratio** and only resized on window resize, so it was upscaled on retina displays and stretched whenever layout changed without a window resize (entering Immersion Mode). It now uses a DPR-scaled backing store and a `ResizeObserver`.
- **Input was mouse-only.** Pointer events now drive drag, orbit, selection, hover and two-finger pinch zoom; wheel is bound non-passively so the page cannot scroll under the world.
- **Repeated view switching created WebGL contexts without releasing them.** `dispose()` now calls `forceContextLoss()`. The browser journey asserts the live canvas count stays bounded after 24 view switches (observed: 2).
- **Globe framing was hard-coded** and overflowed the viewport. Camera distance is now derived from the subject radius and the limiting field of view, and reframes when the viewport aspect changes.
- **`updatePolityTerritories` ran an O(tiles × polities) sweep every simulated year.** It now runs on a five-year cadence. World generation for the heaviest starting eras dropped from 20.7 s to 6.5 s at the default 64×48 world, with no reduction in historical depth.

### Interface
- **The Settings hub was almost entirely fake.** Zoom sensitivity, pan sensitivity, invert zoom, weather particles, reduced motion, high contrast, four performance presets and auto-pause were all local component state wired to nothing. They have been removed. What remains — presentation mode, world effects, and a truthful readout of the system reduced-motion preference — is genuinely connected.
- Particle effects were random decoration unrelated to the world. They now spawn from real tile fields: rain where it rains, snow where it freezes, dust over real deserts, smoke over real environmental damage, embers over volcanic and hydrothermal ground, flocks over genuinely productive biomass.
- The permanent header bar and the wall of toolbar buttons are gone. Chrome is four small floating clusters over a full-bleed world; secondary tools live behind one Instruments menu.
- Hit-testing, rendering, the locator map and camera centring previously used three different framing formulas. They now share `WorldProjectionEngine.frame`.

### Local-first integrity
- **`index.html` loaded Cinzel, Plus Jakarta Sans and JetBrains Mono from `fonts.googleapis.com`** — a required public network request at runtime that silently failed inside the offline native macOS wrapper, so the native build never had its intended typography. Removed in favour of platform font stacks. The built bundle now contains no external host references beyond error-message strings inside React, Three.js and Tailwind.

---

## Visual and UX Work Delivered
- `src/visuals/terrain/planetSurface.ts` composites one authoritative planetary surface consumed by **both** the 2D cartographic views and the WebGL hero views, so all six modes are unmistakably the same world: bilinear terrain interpolation, hill shading from derived normals, blended biome transitions, bathymetric depth ramp, coastal strand, temperature-driven ice with noise-perturbed edges, deterministic micro-texture, traced rivers and lakes, roads and cultivated ground, settlement footprints sized by real population, and ruin scatter.
- Globe: 128×96 sphere, bump relief from the surface image, a custom back-face atmosphere shader, a banded procedural cloud deck, and one consistent sun shared by every mode.
- Snow Globe: physical transmissive glass with clearcoat, a turned wooden plinth with a brass collar, and bounded snow falling under its own gravity inside the dome.
- Relief Diorama: displaced terrain, a translucent sea plane at the real sea level, and a carved slab base.
- Orbital: distant framing, atmosphere limb, deterministic starfield, an orbiting cratered moon.
- Flat Atlas / Square World: shared surface with graticule and equator, settlement symbols scaled by tier with capital rings, ruin glyphs, labels at readable zoom, selection brackets, and a brass-framed tabletop treatment for the bounded Square World.
- Design system in `src/index.css`: surface, ink, accent, radius, shadow and motion tokens; `.ws-panel`, `.ws-chip`, `.ws-select`, `.ws-display`, `.ws-numeric` primitives; `prefers-reduced-motion` honoured globally and by both renderers.
- Inspector rewritten as a field record — identity, a written read of the thing in its place, then FOLLOW / WHY? / WHAT IF? in the same position for every subject type.
- First-use guidance (`FirstLightHint`) names the six moves once, beside the planet, and dismisses permanently on first real interaction. `GenesisOverlay` states what is being generated during era bootstrap.
- Responsive down to 430 px: no critical control is lost. Verified by screenshot and by assertion in the browser journey.
- Accessibility: semantic controls throughout, `aria-pressed` on toggles, accessible names on the clock and selectors, visible focus rings, `Tab` no longer hijacked while a dialog is open, and coarse-pointer touch targets.

## Assets and Licensing
- No external asset was acquired. Every visual byte is generated by project code at runtime.
- No font files are bundled or fetched; typography uses `ui-serif` / `ui-sans-serif` / `ui-monospace` with named platform fallbacks.
- `docs/VISUAL_ASSET_MANIFEST.json` (v1.1.0) and `THIRD_PARTY_NOTICES.md` record the new procedural surface compositor, the hero materials, the typography change, and an explicit no-external-assets / no-runtime-network policy.

## Tests Added
- `tests/startingEra.test.ts` (12 tests): every era's generated state against its own promise — sapience dated in the past, settlements founded before the start date, technology never orphaned from prerequisites, ruins collapsed before the start with a stated cause, industrial scarring present, numerical safety, ancestry integrity, and determinism for a fixed seed.
- `tests/topology.test.ts` (12 tests): wrap/bound semantics per axis, topology-aware distance, pole rules, all seven topologies generating and simulating valid worlds, and open-edged worlds draining off the rim instead of pooling.

## Validation Actually Run (2026-08-18, this machine)
| Gate | Command | Result |
|---|---|---|
| Types | `npx tsc --noEmit` | clean |
| Tests | `npm test` | **42 passed / 5 files**, exit 0 (includes upstream's release-hardening suite) |
| Production build | `npm run build` | success |
| Real Chromium journey | `node scripts/browser-playtest.mjs` | **PASS**, 0 runtime errors, 0 console errors |
| Native macOS build | `npm run build:mac` | bundle verification PASS |
| Native WebKit render + IndexedDB | bundled smoke harness | **PASS** |

One pre-existing invariant test (`NUMERICAL & POPULATION SAFETY`, 1,500 simulated years) was
given an explicit 30 s timeout matching its siblings. Its assertions are unchanged; worlds now
generate real continents, so the same 1,500 years is genuinely several times more ecological
work than when the default world was 6% land.

Browser journey coverage: first-light state, default Globe, Flat Atlas, Square World, all four WebGL hero views with drag/orbit/wheel/selection/layer switching, 24 consecutive view switches, keyboard camera without triggering unrelated modals, continuous 20× simulation, IndexedDB save → advance → load restoring the exact saved year (7 → 107 → 7), globe selection opening the inspector, WHY? trace, Instruments menu, Immersion Mode, and a 430×860 viewport check asserting the time control, Instruments menu and view selector all remain present. Live canvas count after view torture: 2. Audio oscillators constructed across the entire
session: 0. World-first contract assertions: PASS.

Measured generation cost at the default 64×48 world: PREBIOTIC 54 ms, MATURE_BIOSPHERE 2.4 s, FIRST_CITIES 2.9 s, MEDIEVAL 3.9 s, INDUSTRIAL 5.2 s, SPACEFARING 4.4 s, POST_COLLAPSE 6.5 s.

## Evidence Not Accepted As Release Proof
- Historical claims of `24 Reality Rounds`, `6 consecutive green rounds` and the generated `4,000 pass` ledger are not authoritative runtime proof.
- A passing build alone is not proof of playability.
- A native process staying alive is not proof that the native interface rendered.
- "Playwright passed" is not proof that the result looks good; every hero view in this pass was inspected as a screenshot.

## Known Limitations
- **Target-Mac confirmation still pending.** The native build, bundle verification and WebKit rendered-root + IndexedDB checks pass locally, but the user has not yet launched and driven `build/macos/WORLDSEED.app` by hand since this pass.
- **CI has not been run on these changes.** Only local execution of the same commands is recorded above.
- **Two lines of UI work were merged.** Every overlapping file was resolved deliberately and
  the result was re-validated end to end, but the merged interface has had one review pass,
  not the several that each side had separately.
- **Topology depth is improved but still partial.** Adjacency, migration, hydrology drainage and contagion travel now share real topology semantics. Climate transport, trade routing and civilisation travel still assume a wrapping longitude for every topology.
- **Species and settlement 3D meshes were not reworked this pass.** Inherited traits drive the existing creature mesh engine; visual divergence between related species has not been re-verified. Settlement presence on the planet is rendered as footprints and lights baked into the shared surface, not as per-settlement 3D geometry.
- **Continental placement can be strongly polar for some seeds**, because plate elevation bias dominates the noise term. Worlds remain valid and varied, but land is not guaranteed near the equator.
- **The polar cap edge shows tile-scale stair-stepping on the globe**, where the equirectangular texture converges at the poles.
- **On very narrow viewports the WHY? / WHAT IF? / Discoveries cluster scrolls off the time deck.** It remains reachable by scrolling the deck, and the same three actions are always present in the inspector.
- **The production JS bundle is ~1.0 MB (276 kB gzipped)** and is not code-split.
- **Native signing/notarisation**: local ad-hoc signing only. No Developer ID signing, notarisation, stapling, Gatekeeper testing or custom app icon.

## Current Release Status
- **Simulation core**: VERIFIED GREEN — 39 tests including deep-time soak, determinism, ancestry, causal integrity, persistence round trip, era fidelity and topology semantics.
- **Playable browser core**: VERIFIED GREEN from a real Chromium journey against the production build on this machine.
- **Native macOS wrapper**: build, bundle verification, WebKit rendering and IndexedDB all pass locally; hands-on confirmation on the target Mac is still outstanding.
- **Distribution**: LOCAL BUILD ONLY; not Developer ID signed or notarised.
- **Mega-spec parity**: starting-era fidelity is now implemented and tested; exotic-topology depth and bespoke species/settlement 3D art remain partial.
