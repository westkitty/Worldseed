import { describe, expect, it } from 'vitest';
import { SimulationEngine } from '../src/simulation/engine';
import { snapshotEngineRuntime, restoreEngineRuntime } from '../src/persistence/runtimeSnapshot';
import { WorldConfig } from '../src/types/simulation';

const CONFIG: WorldConfig = {
  seed: 246810,
  width: 32,
  height: 24,
  preset: 'DEEP_TIME',
  topology: 'SPHERICAL',
  genre: 'REALISTIC',
  startingEra: 'PREBIOTIC',
  seaLevel: 0.42,
  volcanism: 0.35,
  tectonicPlatesCount: 6,
  axialTilt: 23.5,
  initialLifeDiversity: 5,
  sapienceLikelihood: 1.0
};

describe('WORLDSEED engine runtime persistence', () => {
  it('save -> restore -> continue preserves deterministic engine continuation', () => {
    const original = new SimulationEngine(CONFIG);
    original.step(420);

    const saved = snapshotEngineRuntime(original, original.getState());
    const restored = restoreEngineRuntime(JSON.parse(JSON.stringify(saved)));

    original.step(120);
    restored.step(120);

    const expected = original.getState();
    const actual = restored.getState();

    expect(actual.currentYear).toBe(expected.currentYear);
    expect(actual.ticks).toBe(expected.ticks);
    expect(actual.stats.totalBiomass).toBe(expected.stats.totalBiomass);
    expect(actual.stats.totalExtinctions).toBe(expected.stats.totalExtinctions);
    expect(actual.stats.totalSpeciations).toBe(expected.stats.totalSpeciations);
    expect(Object.keys(actual.species)).toEqual(Object.keys(expected.species));
    expect(actual.events).toEqual(expected.events);

    for (const speciesId of Object.keys(expected.species)) {
      expect(actual.species[speciesId].totalPopulation).toBe(expected.species[speciesId].totalPopulation);
      expect(actual.species[speciesId].isExtinct).toBe(expected.species[speciesId].isExtinct);
    }
  }, 30_000);

  it('runtime snapshot survives a branched/intervened world before continuing', () => {
    const original = new SimulationEngine({ ...CONFIG, seed: 135791 });
    original.step(360);
    original.forkBranch('Persistence branch');
    original.applyIntervention('METEOR_STRIKE', { targetTile: { x: 8, y: 8 } });
    original.step(40);

    const saved = snapshotEngineRuntime(original, original.getState());
    const restored = restoreEngineRuntime(JSON.parse(JSON.stringify(saved)));

    original.step(80);
    restored.step(80);

    expect(restored.getState().currentBranchId).toBe(original.getState().currentBranchId);
    expect(restored.getState().branches).toEqual(original.getState().branches);
    expect(restored.getState().currentYear).toBe(original.getState().currentYear);
    expect(restored.getState().stats.totalBiomass).toBe(original.getState().stats.totalBiomass);
    expect(restored.getState().events).toEqual(original.getState().events);
  }, 30_000);
});
