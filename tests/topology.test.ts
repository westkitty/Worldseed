import { describe, it, expect } from 'vitest';
import { SimulationEngine } from '../src/simulation/engine';
import { stepCoordinate, topologicalDistance, topologyRules } from '../src/simulation/planet/topology';
import { WorldConfig, WorldTopology } from '../src/types/simulation';

const ALL_TOPOLOGIES: WorldTopology[] = [
  'SPHERICAL',
  'PLANAR_BOUNDED',
  'TOROIDAL_WRAP',
  'FLOATING_ISLANDS',
  'RINGWORLD_SEGMENT',
  'LAYERED_CAVERNS',
  'CYLINDRICAL_HABITAT'
];

const config = (topology: WorldTopology): WorldConfig => ({
  seed: 606061,
  width: 48,
  height: 36,
  preset: 'DEEP_TIME',
  topology,
  genre: 'REALISTIC',
  startingEra: 'PREBIOTIC',
  seaLevel: 0.42,
  volcanism: 0.35,
  tectonicPlatesCount: 8,
  axialTilt: 23.5,
  initialLifeDiversity: 5,
  sapienceLikelihood: 1.0
});

describe('TOPOLOGY SEMANTICS', () => {
  it('wrapping worlds join their edges and bounded worlds do not', () => {
    // East of the last column.
    expect(stepCoordinate(47, 10, 1, 0, 48, 36, 'SPHERICAL')).toEqual({ x: 0, y: 10 });
    expect(stepCoordinate(47, 10, 1, 0, 48, 36, 'TOROIDAL_WRAP')).toEqual({ x: 0, y: 10 });
    expect(stepCoordinate(47, 10, 1, 0, 48, 36, 'PLANAR_BOUNDED')).toBeNull();
    expect(stepCoordinate(47, 10, 1, 0, 48, 36, 'FLOATING_ISLANDS')).toBeNull();

    // North of the first row.
    expect(stepCoordinate(10, 0, 0, -1, 48, 36, 'SPHERICAL')).toEqual({ x: 10, y: 0 }); // pole, you stop
    expect(stepCoordinate(10, 0, 0, -1, 48, 36, 'TOROIDAL_WRAP')).toEqual({ x: 10, y: 35 });
    expect(stepCoordinate(10, 0, 0, -1, 48, 36, 'LAYERED_CAVERNS')).toBeNull();
  });

  it('distance respects which axes actually connect', () => {
    const near = { x: 1, y: 5 };
    const far = { x: 46, y: 5 };
    // On a sphere those two are close the short way round; on a slab they are far apart.
    expect(topologicalDistance(near, far, 48, 36, 'SPHERICAL')).toBeCloseTo(3, 5);
    expect(topologicalDistance(near, far, 48, 36, 'PLANAR_BOUNDED')).toBeCloseTo(45, 5);
  });

  it('only spherical worlds declare poles', () => {
    expect(topologyRules('SPHERICAL').hasPoles).toBe(true);
    expect(topologyRules('CYLINDRICAL_HABITAT').hasPoles).toBe(false);
    expect(topologyRules('RINGWORLD_SEGMENT').wrapsX).toBe(true);
    expect(topologyRules('PLANAR_BOUNDED').openEdges).toBe(true);
  });

  it.each(ALL_TOPOLOGIES)('%s generates and simulates a valid world', topology => {
    const engine = new SimulationEngine(config(topology));
    const state = engine.step(300);

    expect(state.currentYear).toBe(300);
    for (const row of state.grid) {
      for (const tile of row) {
        expect(Number.isFinite(tile.elevation)).toBe(true);
        expect(Number.isFinite(tile.riverFlow)).toBe(true);
        expect(tile.riverFlow).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(tile.biomass)).toBe(true);
        expect(tile.biomass).toBeGreaterThanOrEqual(0);
      }
    }
    for (const s of Object.values(state.species)) {
      expect(Number.isFinite(s.totalPopulation)).toBe(true);
      expect(s.totalPopulation).toBeGreaterThanOrEqual(0);
    }
  }, 60_000);

  it('open-edged worlds let water leave instead of pooling against the array bounds', () => {
    // On a bounded slab, a sky archipelago or a cavern system, the rim is a real edge:
    // water that reaches it is gone, so no boundary tile may become an endorheic lake.
    for (const topology of ['PLANAR_BOUNDED', 'FLOATING_ISLANDS', 'LAYERED_CAVERNS'] as WorldTopology[]) {
      const state = new SimulationEngine({ ...config(topology), seed: 771924, width: 64, height: 48 }).getState();
      const { width, height } = state.config;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
            expect(state.grid[y][x].isLake).toBe(false);
          }
        }
      }
    }
  }, 60_000);

  it('wrapping worlds still form inland lakes', () => {
    const state = new SimulationEngine({ ...config('SPHERICAL'), seed: 771924, width: 64, height: 48 }).getState();
    expect(state.grid.flat().filter(t => t.isLake).length).toBeGreaterThan(0);
    expect(state.grid.flat().filter(t => t.riverFlow > 0).length).toBeGreaterThan(0);
  }, 60_000);
});
