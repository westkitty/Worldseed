# WORLDSEED — FINAL BUG LEDGER

## Defect Inventory & Triage Register

| Defect ID | Severity | Classification | Status | Discovered Round | Closed Round | Summary & Resolution |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **BUG-001** | P1 | APP BUG | CLOSED | BASELINE | BASELINE | PRNG empty choice candidate array returning undefined during early prebiotic worlds. Fixed in `PRNG.choice`. |
| **BUG-002** | P1 | SIMULATION BUG | CLOSED | BASELINE | BASELINE | Era progression thresholds stalled when sapience was absent. Fixed in `src/simulation/history/chronicle.ts`. |
| **BUG-003** | P2 | 3D / RENDER BUG | CLOSED | BASELINE | S01 | Procedural sprite placeholders upgraded to `BiomeTilesetEngine`, `OrganismSpriteEngine`, and `CivilizationSpriteEngine`. |
| **BUG-004** | P2 | PERFORMANCE BUG | CLOSED | BASELINE | S01 | Main thread frame drops at 1000x speeds resolved via `SpatialGridIndex` and bounded `HistoricalEventBuffer`. |
| **BUG-005** | P1 | 3D / RENDER BUG | CLOSED | S02 | S02 | Spherical raycasting coordinate singularity at polar limits resolved with clamped latitude bounds in `projections.ts`. |
| **BUG-006** | P1 | UI / UX BUG | CLOSED | S03 | S03 | Enum matching in `CreatureMeshEngine` for sensory and locomotion traits corrected to match `simulation.ts`. |
| **BUG-007** | P1 | UI / UX BUG | CLOSED | S04 | S04 | Dynamic calculation of polity population and settlement count added to `CivilizationDossierModal.tsx`. |
| **BUG-008** | P2 | PERSISTENCE BUG | CLOSED | S05 | S05 | Save/load schema versioning updated to retain multi-view and genre configuration settings. |

---

## Current Bug State
- **Open P0**: 0
- **Open P1**: 0
- **Open P2**: 0
- **Open P3**: 0
- **Total Resolved**: 8 / 8
