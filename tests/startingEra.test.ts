import { describe, it, expect } from 'vitest';
import { SimulationEngine } from '../src/simulation/engine';
import { ERA_PROFILES } from '../src/simulation/scenarios/startingEra';
import { StartingEra, WorldConfig } from '../src/types/simulation';

const baseConfig = (startingEra: StartingEra, seed = 482910): WorldConfig => ({
  seed,
  // A smaller grid keeps each generation short enough that the test worker stays responsive
  // while still exercising every era rule; determinism and invariants are size-independent.
  width: 32,
  height: 24,
  preset: 'DEEP_TIME',
  topology: 'SPHERICAL',
  genre: 'REALISTIC',
  startingEra,
  seaLevel: 0.42,
  volcanism: 0.35,
  tectonicPlatesCount: 8,
  axialTilt: 23.5,
  initialLifeDiversity: 5,
  sapienceLikelihood: 1.0
});

describe('STARTING ERA FIDELITY', () => {
  it('PREBIOTIC starts at year zero with no civilisation', () => {
    const state = new SimulationEngine(baseConfig('PREBIOTIC')).getState();
    expect(state.currentYear).toBe(0);
    expect(Object.keys(state.settlements)).toHaveLength(0);
    expect(Object.values(state.species).some(s => s.isSapient)).toBe(false);
  });

  it.each<[StartingEra]>([
    ['MICROBIAL'],
    ['COMPLEX_LIFE'],
    ['MATURE_BIOSPHERE'],
    ['SAPIENCE_DAWN'],
    ['FIRST_CITIES'],
    ['MEDIEVAL'],
    ['INDUSTRIAL'],
    ['SPACEFARING'],
    ['POST_COLLAPSE']
  ])('%s generates state coherent with its own promise', era => {
    const profile = ERA_PROFILES[era];
    const state = new SimulationEngine(baseConfig(era)).getState();

    // Real simulated history must precede the start date.
    expect(state.currentYear).toBeGreaterThanOrEqual(profile.simulatedYears);
    expect(state.events.length).toBeGreaterThan(0);
    expect(state.events.every(e => e.year <= state.currentYear)).toBe(true);

    // The biosphere must actually exist by the time complex life is claimed.
    const livingSpecies = Object.values(state.species).filter(s => !s.isExtinct);
    expect(livingSpecies.length).toBeGreaterThan(0);

    if (profile.requiresSapience) {
      const sapients = Object.values(state.species).filter(s => s.isSapient);
      expect(sapients.length).toBeGreaterThan(0);
      // Sapience must be dated in the past, not at the start instant.
      expect(sapients[0].sapienceEmergenceYear).toBeLessThan(state.currentYear);

      const living = Object.values(state.settlements).filter(s => !s.isAbandoned);
      expect(living.length).toBeGreaterThan(0);
      expect(Object.keys(state.cultures).length).toBeGreaterThan(0);
      expect(Object.keys(state.languages).length).toBeGreaterThan(0);

      // Every settlement must have been founded before the start date.
      for (const s of Object.values(state.settlements)) {
        expect(s.foundedYear).toBeLessThan(state.currentYear);
      }
    } else {
      expect(Object.keys(state.settlements)).toHaveLength(0);
    }

    if (profile.techDepth >= 3) {
      const polity = Object.values(state.polities)[0];
      expect(polity).toBeDefined();
      expect(polity.discoveredTechIds.length).toBeGreaterThanOrEqual(3);
      // Granted technology must never be orphaned from its prerequisites.
      const owned = new Set(polity.discoveredTechIds);
      for (const techId of polity.discoveredTechIds) {
        for (const prereq of state.technologies[techId].prerequisites) {
          expect(owned.has(prereq)).toBe(true);
        }
      }
    }

    if (profile.predecessorRuins > 0) {
      const ruinTiles = state.grid.flat().filter(t => t.ruins.length > 0);
      expect(ruinTiles.length).toBeGreaterThan(0);
      for (const tile of ruinTiles) {
        for (const ruin of tile.ruins) {
          expect(ruin.collapsedYear).toBeLessThan(state.currentYear);
          expect(ruin.foundedYear).toBeLessThan(ruin.collapsedYear);
          expect(ruin.collapseCause.length).toBeGreaterThan(0);
        }
      }
    }

    if (profile.industrialLoad > 0.3) {
      const scarred = state.grid.flat().filter(t => t.pollution > 0.05).length;
      expect(scarred).toBeGreaterThan(0);
    }

    // Numerical safety across the whole generated world.
    for (const row of state.grid) {
      for (const tile of row) {
        expect(Number.isFinite(tile.elevation)).toBe(true);
        expect(Number.isFinite(tile.biomass)).toBe(true);
        expect(tile.biomass).toBeGreaterThanOrEqual(0);
        expect(tile.populationDensity).toBeGreaterThanOrEqual(0);
      }
    }
    for (const s of Object.values(state.species)) {
      expect(Number.isFinite(s.totalPopulation)).toBe(true);
      expect(s.totalPopulation).toBeGreaterThanOrEqual(0);
      if (s.parentSpeciesId) expect(state.species[s.parentSpeciesId]).toBeDefined();
    }
  }, 60_000);

  it('POST_COLLAPSE leaves survivors living among more ruins than cities', () => {
    const state = new SimulationEngine(baseConfig('POST_COLLAPSE')).getState();
    const living = Object.values(state.settlements).filter(s => !s.isAbandoned);
    const ruins = state.grid.flat().reduce((n, t) => n + t.ruins.length, 0);
    expect(ruins).toBeGreaterThan(living.length);
    expect(state.events.some(e => e.title === 'The Collapse')).toBe(true);
  }, 60_000);

  it('era bootstrap is deterministic for a given seed', () => {
    const a = new SimulationEngine(baseConfig('MEDIEVAL', 777001)).getState();
    const b = new SimulationEngine(baseConfig('MEDIEVAL', 777001)).getState();
    expect(a.currentYear).toBe(b.currentYear);
    expect(Object.keys(a.settlements)).toEqual(Object.keys(b.settlements));
    expect(a.events.map(e => e.id)).toEqual(b.events.map(e => e.id));
    expect(JSON.stringify(a.stats)).toBe(JSON.stringify(b.stats));
  }, 60_000);
});
