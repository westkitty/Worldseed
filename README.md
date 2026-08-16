# WORLDSEED — Deep-Time Planetary & Historical Simulation

WORLDSEED is an autonomous, living deep-time browser simulator where a procedurally generated planet develops geology, climate, ecosystems, evolution, intelligent species, cultures, civilizations, technologies, catastrophes, ruins, extinctions, and layered history across thousands or millions of simulated years.

Everything feeds back into everything else:
- **Mountains** create rain shadows and alter vegetation.
- **Vegetation** dictates herbivore carrying capacity and predator radiation.
- **Evolution** selectively breeds cognition, anatomy, locomotion, and sensory modalities.
- **Sapient Species** emerge from living lineages and build civilizations reflecting their biological possibilities.
- **Domestication** selectively breeds living organisms, which can escape to become feral species.
- **Pathogens** arise via zoonotic spillover from domestic livestock and travel along trade routes.
- **Settlement Collapses** leave persistent archaeological ruins and subterranean micro-refugia.
- **Major Catastrophes** distort across centuries into cultural myths with recoverable factual origins.
- **The "WHY?" Engine** traverses deep causal graphs to explain the genesis of any entity in simulation history.

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm (v9+)

### Installation & Launch
```bash
# Clone or navigate to the project directory
cd /Users/andrew/Worldseed

# Install dependencies (if not already installed)
npm install

# Start local development server
npm run dev
```

Open your browser at `http://localhost:5173`.

---

## Controls & Navigation

### Time Navigation
- **Spacebar**: Toggle Pause / Play
- **1, 2, 3, 4, 5**: Set simulation speed ($1\times, 5\times, 20\times, 100\times, 1000\times$)
- **+10y / +100y / +1,000y**: Step forward in discrete historical increments

### Interactive World Canvas
- **Click & Drag**: Pan across the planet surface
- **Mouse Wheel**: Smooth Zoom ($0.6\times$ orbital view up to $8.0\times$ local detail)
- **Click Tile / City / Ruin / Species**: Open deep contextual Inspector Panel

### Map Layer Switcher
Switch between 12 synchronized observational layers:
1. **Physical Relief**: Elevation contours, ocean bathymetry, and dynamic river currents
2. **Whittaker Biomes**: 15 distinct ecological biomes from deep trenches to alpine peaks
3. **Temperature Thermal**: Planetary isotherms and seasonal thermal oscillations
4. **Rainfall & Moisture**: Orographic precipitation and moisture gradients
5. **Species Biodiversity**: Biomass density and ecological hotspot map
6. **Polity Territories**: Dynamic political borders and spheres of influence
7. **Cities & Infrastructure**: Settlement tiers (hamlets, towns, cities, metropolises) and roads
8. **Cultural Footprints**: Cultural hearths and architectural zones
9. **Language Families**: Phonological dialects and sound-shift branches
10. **Contagion Vectors**: Active epidemic infection maps
11. **Ruins & Fossils**: Archaeological stratigraphy, buried catacombs, and fossil beds
12. **Environmental Scars**: Deforestation, mine tailings, and volcanic fallout

### Modal Toolbars & Shortcuts
- **T**: Open **Phylogenetic Tree of Life** (ancestry DAG, living/extinct filters, genomes)
- **C**: Open **Chronicle of Eras** (epochs, milestone event records, jump-to-location)
- **W**: Open **World Lab** (Meteor strike, supervolcano, divine uplifts, climate deluge)
- **D**: Open **Discoveries Ledger** (unveils rare emergent systemic anomalies)
- **Languages**: Phonetic inventory, grammar types, vocabulary roots, toponym archaeology
- **Fork World**: Create alternate history branches and compare divergent timelines
- **Save / Load**: Local-first browser persistence, seed config strings, JSON export/import

---

## Core Architecture Overview

```
src/
├── types/
│   └── simulation.ts           # Unified domain interfaces
├── simulation/
│   ├── math/
│   │   ├── prng.ts             # Deterministic Mulberry32 seeded PRNG
│   │   └── noise.ts            # Simplex 2D noise & fractal Brownian motion
│   ├── planet/
│   │   ├── geology.ts          # Tectonic plates, boundary orogeny, elevation
│   │   ├── climate.ts          # Solar insolation, Hadley cells, orographic rain
│   │   ├── hydrology.ts        # Water accumulation, downhill river routing, lakes
│   │   └── biomes.ts           # Whittaker classification, minerals, soil fertility
│   ├── ecology/
│   │   ├── species.ts          # Genomes, morphology, binomial naming, mutation
│   │   ├── populations.ts      # Spatial Lotka-Volterra trophic energy transfer
│   │   └── evolution.ts        # Speciation, adaptive radiation, fossil deposits
│   ├── cognition/
│   │   └── intelligence.ts     # Sapience emergence from cognitive pressures
│   ├── civilization/
│   │   ├── language.ts         # Phonology, sound shifts, place-name archaeology
│   │   ├── culture.ts          # Kinship, burial, values, sacred beasts
│   │   ├── settlement.ts       # Siting, tiers, civic infrastructure, deforestation
│   │   ├── domestication.ts    # Selective breeding, domestic lineages, feral escapes
│   │   ├── technology.ts       # Nonlinear tech web, lost & rediscovered knowledge
│   │   ├── politics.ts         # Polities, dynamic borders, wars, peace treaties
│   │   └── ruins.ts            # Settlement collapse, stratigraphy, troglobite refugia
│   ├── disease/
│   │   └── epidemiology.ts     # Zoonotic spillover, trade-route epidemics, R0
│   ├── myth/
│   │   └── culturalMemory.ts   # Catastrophe imprints, legend mutation, de-mythologizer
│   ├── history/
│   │   ├── causality.ts        # Causal DAG engine & recursive "WHY?" investigator
│   │   ├── chronicle.ts        # Era auto-detection, milestone history logging
│   │   └── discoveries.ts      # 10+ emergent systemic surprises detector
│   └── engine.ts               # Master deterministic simulation coordinator
├── audio/
│   └── soundscape.ts           # Procedural Web Audio API ambient soundscape
├── persistence/
│   └── storage.ts              # Local-first IndexedDB, seed encoder, JSON export/import
└── ui/
    ├── components/             # Canvas renderer, inspector, and interactive modals
    └── App.tsx                 # Master layout and state coordinator
```

---

## Verification & Testing

### Automated Test Suite
Run invariant tests (Determinism, Phylogeny DAG, Population safety, Numerical safety, Causal references, Alternate history branching, Round-trip persistence):
```bash
npm test
```

### Production Build
Verify TypeScript typechecking and bundle compilation:
```bash
npm run build
```

---

## Privacy & Local-First Guarantee
WORLDSEED is $100\%$ local-first:
- Zero telemetry, tracking, or network calls.
- All simulation state, history, and saves persist directly in your browser's IndexedDB.
- No external AI API keys or third-party cloud backends required.
