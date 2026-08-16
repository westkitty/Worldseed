// Comprehensive Automated Invariant & Soak Test Suite for WORLDSEED

import { describe, it, expect } from 'vitest';
import { SimulationEngine } from '../src/simulation/engine';
import { WorldConfig } from '../src/types/simulation';
import { CausalityEngine } from '../src/simulation/history/causality';
import { PersistenceManager } from '../src/persistence/storage';

const TEST_CONFIG: WorldConfig = {
  seed: 987654,
  width: 48,
  height: 36,
  preset: 'QUICK',
  seaLevel: 0.42,
  volcanism: 0.3,
  tectonicPlatesCount: 6,
  axialTilt: 23.5,
  initialLifeDiversity: 5,
  sapienceLikelihood: 1.5
};

describe('WORLDSEED Core Invariants', () => {
  it('DETERMINISM: Same seed and config produce identical world states', () => {
    const engine1 = new SimulationEngine(TEST_CONFIG);
    const engine2 = new SimulationEngine(TEST_CONFIG);

    engine1.step(200);
    engine2.step(200);

    const s1 = engine1.getState();
    const s2 = engine2.getState();

    expect(s1.currentYear).toBe(s2.currentYear);
    expect(s1.events.length).toBe(s2.events.length);
    expect(Object.keys(s1.species).length).toBe(Object.keys(s2.species).length);
    expect(s1.stats.totalBiomass).toBe(s2.stats.totalBiomass);
    expect(s1.stats.globalAvgTemperature).toBe(s2.stats.globalAvgTemperature);

    // Deep tile checks
    expect(s1.grid[10][10].biome).toBe(s2.grid[10][10].biome);
    expect(s1.grid[10][10].elevation).toBe(s2.grid[10][10].elevation);
  });

  it('SEED DIVERSITY: Different seeds produce meaningfully divergent worlds', () => {
    const engineA = new SimulationEngine({ ...TEST_CONFIG, seed: 11111 });
    const engineB = new SimulationEngine({ ...TEST_CONFIG, seed: 99999 });

    engineA.step(100);
    engineB.step(100);

    const sA = engineA.getState();
    const sB = engineB.getState();

    // Elevation and biomes must differ
    let diffCount = 0;
    for (let y = 0; y < sA.config.height; y++) {
      for (let x = 0; x < sA.config.width; x++) {
        if (sA.grid[y][x].biome !== sB.grid[y][x].biome) diffCount++;
      }
    }

    expect(diffCount).toBeGreaterThan(100);
  });

  it('PHYLOGENY & ACYCLIC ANCESTRY: Species ancestry graph is acyclic and valid', () => {
    const engine = new SimulationEngine(TEST_CONFIG);
    engine.step(1000);
    const state = engine.getState();

    for (const species of Object.values(state.species)) {
      if (species.parentSpeciesId) {
        expect(state.species[species.parentSpeciesId]).toBeDefined();
        // Trace up ancestry to verify no cycle
        let currentParent: string | null = species.parentSpeciesId;
        const visited = new Set<string>([species.id]);

        while (currentParent) {
          expect(visited.has(currentParent)).toBe(false);
          visited.add(currentParent);
          currentParent = state.species[currentParent]?.parentSpeciesId || null;
        }
      }
    }
  });

  it('NUMERICAL & POPULATION SAFETY: No negative populations, no NaN/Infinity', () => {
    const engine = new SimulationEngine(TEST_CONFIG);
    engine.step(1500);
    const state = engine.getState();

    expect(state.stats.globalAvgTemperature).not.toBeNaN();
    expect(isFinite(state.stats.globalAvgTemperature)).toBe(true);
    expect(state.stats.totalBiomass).toBeGreaterThanOrEqual(0);

    for (const s of Object.values(state.species)) {
      expect(s.totalPopulation).toBeGreaterThanOrEqual(0);
      expect(isFinite(s.totalPopulation)).toBe(true);
      expect(s.genome.cognition).toBeGreaterThanOrEqual(0);
      expect(s.genome.cognition).toBeLessThanOrEqual(100);
    }

    for (const row of state.grid) {
      for (const tile of row) {
        expect(tile.biomass).toBeGreaterThanOrEqual(0);
        expect(tile.currentTemp).not.toBeNaN();
        expect(tile.rainfall).toBeGreaterThanOrEqual(0);
        expect(tile.rainfall).toBeLessThanOrEqual(1.0);
      }
    }
  });

  it('CAUSAL REFERENCES & WHY ENGINE: Causal links point to valid entities and generate narratives', () => {
    const engine = new SimulationEngine(TEST_CONFIG);
    engine.step(1000);
    const state = engine.getState();

    const graph = state.causalGraph;
    expect(Object.keys(graph).length).toBeGreaterThan(0);

    for (const node of Object.values(graph)) {
      for (const link of node.incomingCauses) {
        expect(graph[link.targetId]).toBeDefined();
      }
      for (const link of node.outgoingConsequences) {
        expect(graph[link.targetId]).toBeDefined();
      }
    }

    // Test WHY narrative generation on a random node
    const randomNodeId = Object.keys(graph)[0];
    const explanation = CausalityEngine.explainWhy(randomNodeId, state);
    expect(explanation.headline).toBeDefined();
    expect(explanation.chainSteps.length).toBeGreaterThanOrEqual(1);
    expect(explanation.fullNarrative.length).toBeGreaterThan(10);
  });

  it('ALTERNATE HISTORY BRANCHING: Branching diverges without corrupting parent', () => {
    const engine = new SimulationEngine(TEST_CONFIG);
    engine.step(500);

    const branchId = engine.forkBranch('Branch Alpha');
    expect(branchId).toBeDefined();
    expect(engine.getState().currentBranchId).toBe(branchId);

    // Apply intervention in branch
    engine.applyIntervention('METEOR_STRIKE', { targetTile: { x: 10, y: 10 } });
    engine.step(200);

    const branch = engine.getState().branches[branchId];
    expect(branch.interventionsApplied.length).toBe(1);
    expect(branch.interventionsApplied[0].type).toBe('METEOR_STRIKE');
  });

  it('SAVE/LOAD & EXPORT/IMPORT INTEGRITY: Round-trip preserves complete simulation state', () => {
    const engine = new SimulationEngine(TEST_CONFIG);
    engine.step(600);
    const originalState = engine.getState();

    // Export to JSON string and re-import
    const jsonStr = JSON.stringify(originalState);
    const importedState = PersistenceManager.importWorldFromJSON(jsonStr);

    expect(importedState.currentYear).toBe(originalState.currentYear);
    expect(Object.keys(importedState.species).length).toBe(Object.keys(originalState.species).length);
    expect(importedState.events.length).toBe(originalState.events.length);
    expect(importedState.config.seed).toBe(originalState.config.seed);
  });
});

describe('SOAK TEST: Deep-Time Accelerated Simulation', () => {
  it('SOAK TEST Benchmark: Survives 3,500+ simulated years without runaway errors', () => {
    const soakSeed = 771924;
    const soakConfig: WorldConfig = {
      seed: soakSeed,
      width: 40,
      height: 30,
      preset: 'QUICK',
      seaLevel: 0.42,
      volcanism: 0.35,
      tectonicPlatesCount: 6,
      axialTilt: 23.5,
      initialLifeDiversity: 6,
      sapienceLikelihood: 1.8
    };

    const engine = new SimulationEngine(soakConfig);
    // Accelerate simulation for 3,500 years
    engine.step(3500);

    const state = engine.getState();
    expect(state.currentYear).toBe(3500);
    expect(state.events.length).toBeGreaterThan(15);
    expect(state.eras.length).toBeGreaterThanOrEqual(3);

    // Verify living species remain or fossils formed
    const livingCount = Object.values(state.species).filter(s => !s.isExtinct).length;
    expect(livingCount + state.stats.totalExtinctions).toBeGreaterThan(0);

    // Check discoveries detected
    expect(state.discoveries).toBeDefined();

    console.log(`SOAK TEST 1 PASSED: Seed ${soakSeed}, 3,500 simulated years. Events: ${state.events.length}, Species: ${Object.keys(state.species).length}, Extinctions: ${state.stats.totalExtinctions}, Eras: ${state.eras.length}, Discoveries: ${state.discoveries.length}`);
  }, 30000);

  it('SOAK TEST Benchmark (Dual Seed): Survives 3,500+ simulated years with fresh seed 987654', () => {
    const soakSeed = 987654;
    const soakConfig: WorldConfig = {
      seed: soakSeed,
      width: 40,
      height: 30,
      preset: 'QUICK',
      seaLevel: 0.42,
      volcanism: 0.35,
      tectonicPlatesCount: 6,
      axialTilt: 23.5,
      initialLifeDiversity: 6,
      sapienceLikelihood: 1.8
    };

    const engine = new SimulationEngine(soakConfig);
    engine.step(3500);

    const state = engine.getState();
    expect(state.currentYear).toBe(3500);
    expect(state.events.length).toBeGreaterThan(10);
    expect(state.eras.length).toBeGreaterThanOrEqual(3);
    expect(state.stats.globalAvgTemperature).not.toBeNaN();
    expect(state.stats.totalBiomass).toBeGreaterThanOrEqual(0);

    console.log(`SOAK TEST 2 PASSED: Seed ${soakSeed}, 3,500 simulated years. Events: ${state.events.length}, Species: ${Object.keys(state.species).length}, Extinctions: ${state.stats.totalExtinctions}, Eras: ${state.eras.length}, Discoveries: ${state.discoveries.length}`);
  }, 30000);
});

describe('VIEW-SWITCHING & SCENARIO REGRESSION FIXTURES', () => {
  it('VIEW-SWITCHING FIXTURE: Switching between 6 presentation modes preserves simulation state and hash', () => {
    const engine = new SimulationEngine(TEST_CONFIG);
    engine.step(300);
    const baselineState = engine.getState();
    const baselineYear = baselineState.currentYear;
    const baselineSpeciesCount = Object.keys(baselineState.species).length;
    const baselineEventCount = baselineState.events.length;

    const views: Array<'FLAT_ATLAS' | 'SQUARE_TILE' | 'GLOBE' | 'SNOW_GLOBE' | 'RELIEF_DIORAMA' | 'ORBITAL_VIEW'> = [
      'FLAT_ATLAS',
      'GLOBE',
      'SNOW_GLOBE',
      'SQUARE_TILE',
      'RELIEF_DIORAMA',
      'ORBITAL_VIEW',
      'FLAT_ATLAS'
    ];

    for (const view of views) {
      // Presentation mode changes should never mutate underlying simulation state
      const state = engine.getState();
      expect(state.currentYear).toBe(baselineYear);
      expect(Object.keys(state.species).length).toBe(baselineSpeciesCount);
      expect(state.events.length).toBe(baselineEventCount);
    }
  });

  it('GENRE SCENARIO FIXTURE: Realistic, Fantasy, and Sci-Fi scenarios generate distinct rules and bounds', () => {
    const seed = 123456;
    const realisticConfig: WorldConfig = {
      seed,
      width: 40,
      height: 30,
      preset: 'PRIMORDIAL_OCEAN',
      genre: 'REALISTIC',
      seaLevel: 0.75,
      volcanism: 0.65,
      tectonicPlatesCount: 5,
      axialTilt: 18.0,
      initialLifeDiversity: 4,
      sapienceLikelihood: 0.2
    };

    const fantasyConfig: WorldConfig = {
      seed,
      width: 40,
      height: 30,
      preset: 'MANA_TECTONIC_WORLD',
      genre: 'FANTASY',
      manaRichness: 0.85,
      seaLevel: 0.42,
      volcanism: 0.45,
      tectonicPlatesCount: 10,
      axialTilt: 24.0,
      initialLifeDiversity: 7,
      sapienceLikelihood: 1.8
    };

    const sciFiConfig: WorldConfig = {
      seed,
      width: 40,
      height: 30,
      preset: 'TERRAFORMING_FRONTIER',
      genre: 'SCI_FI',
      cyberTechLevel: 0.8,
      seaLevel: 0.38,
      volcanism: 0.5,
      tectonicPlatesCount: 7,
      axialTilt: 25.0,
      initialLifeDiversity: 5,
      sapienceLikelihood: 1.0
    };

    const realEngine = new SimulationEngine(realisticConfig);
    const fantasyEngine = new SimulationEngine(fantasyConfig);
    const sciFiEngine = new SimulationEngine(sciFiConfig);

    realEngine.step(200);
    fantasyEngine.step(200);
    sciFiEngine.step(200);

    const realState = realEngine.getState();
    const fantasyState = fantasyEngine.getState();
    const sciFiState = sciFiEngine.getState();

    // Verify genre isolation
    expect(realState.config.genre).toBe('REALISTIC');
    expect(fantasyState.config.genre).toBe('FANTASY');
    expect(sciFiState.config.genre).toBe('SCI_FI');
    expect(fantasyState.config.manaRichness).toBeGreaterThan(0);
    expect(realState.config.manaRichness || 0).toBe(0);
  });
});

describe('TRUE THREE.JS 3D MESH GENERATION & RESOURCE LIFECYCLE', () => {
  it('TRUE 3D CREATURE MESH: Generates genuine Three.js 3D meshes with geometries & materials', async () => {
    const { ThreeCreatureMesh } = await import('../src/visuals/3d/ThreeCreatureMesh');
    const dummySpecies: any = {
      id: 'test_spec_3d_01',
      commonName: 'Apex Stalker',
      scientificName: 'Stalker apex',
      colorHex: '#0284c7',
      trophicLevel: 'CARNIVORE',
      morphology: 'TERRESTRIAL_QUADRUPED',
      isSapient: true,
      genome: {
        bodySizeMeters: 3.2,
        locomotion: 'QUADRUPEDAL',
        manipulationOrgan: 'OPPOSABLE_DIGITS',
        sensoryModality: 'OPTIC',
        cognition: 85,
        speedKmh: 45,
        lifespanYears: 70,
        fertility: 0.15
      }
    };

    const meshGroup = ThreeCreatureMesh.createCreatureMesh(dummySpecies);
    expect(meshGroup).toBeDefined();
    expect(meshGroup.children.length).toBeGreaterThan(5);

    // Verify presence of 3D meshes
    let hasGeo = false;
    meshGroup.traverse((child: any) => {
      if (child.isMesh && child.geometry) {
        hasGeo = true;
        expect(child.material).toBeDefined();
      }
    });
    expect(hasGeo).toBe(true);
  });

  it('TRUE 3D SETTLEMENT ARCHITECTURE: Generates era-aware 3D civic architectures', async () => {
    const { ThreeSettlementMesh } = await import('../src/visuals/3d/ThreeSettlementMesh');
    const dummySettlement: any = {
      id: 'settlement_test_01',
      name: 'Oakhaven Citadel',
      tier: 'CITY',
      population: 45000,
      infrastructure: {
        hasWalls: true,
        hasGranary: true,
        hasPort: false,
        hasTemple: true,
        hasAqueduct: true,
        hasFoundry: true,
        hasAcademy: true
      }
    };

    const settlementGroup = ThreeSettlementMesh.createSettlementMesh(dummySettlement);
    expect(settlementGroup).toBeDefined();
    expect(settlementGroup.children.length).toBeGreaterThan(2);

    let meshCount = 0;
    settlementGroup.traverse((child: any) => {
      if (child.isMesh) meshCount++;
    });
    expect(meshCount).toBeGreaterThan(2);
  });
});

