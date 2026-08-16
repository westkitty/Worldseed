import { SimulationEngine } from '../simulation/engine';
import { WorldState } from '../types/simulation';
import type { TilePop } from '../simulation/ecology/populations';

const RUNTIME_SNAPSHOT_VERSION = 1;

interface CounterSnapshot {
  species: number;
  settlement: number;
  polity: number;
  culture: number;
  language: number;
  pathogen: number;
  myth: number;
}

interface EngineRuntimeSnapshot {
  version: number;
  prngState: number;
  tilePops: Array<[string, TilePop[]]>;
  counters: CounterSnapshot;
}

export type PersistableWorldState = WorldState & {
  __worldseedRuntime?: EngineRuntimeSnapshot;
};

type EngineInternals = {
  state: WorldState;
  prng: { s: number };
  tilePops: Map<string, TilePop[]>;
  speciesCounter: { current: number };
  settlementCounter: { current: number };
  polityCounter: { current: number };
  cultureCounter: { current: number };
  languageCounter: { current: number };
  pathogenCounter: { current: number };
  mythCounter: { current: number };
};

const getInternals = (engine: SimulationEngine): EngineInternals => engine as unknown as EngineInternals;

const cloneTilePops = (entries: Array<[string, TilePop[]]>): Array<[string, TilePop[]]> =>
  entries.map(([key, pops]) => [key, pops.map(pop => ({ ...pop }))]);

export function snapshotEngineRuntime(engine: SimulationEngine | null, state: WorldState): PersistableWorldState {
  if (!engine) return { ...state };
  const internals = getInternals(engine);

  const runtime: EngineRuntimeSnapshot = {
    version: RUNTIME_SNAPSHOT_VERSION,
    prngState: internals.prng.s,
    tilePops: cloneTilePops(Array.from(internals.tilePops.entries())),
    counters: {
      species: internals.speciesCounter.current,
      settlement: internals.settlementCounter.current,
      polity: internals.polityCounter.current,
      culture: internals.cultureCounter.current,
      language: internals.languageCounter.current,
      pathogen: internals.pathogenCounter.current,
      myth: internals.mythCounter.current
    }
  };

  return {
    ...state,
    __worldseedRuntime: runtime
  };
}

export function restoreEngineRuntime(saved: WorldState): SimulationEngine {
  const persistable = saved as PersistableWorldState;
  const engine = new SimulationEngine(saved.config);
  const internals = getInternals(engine);
  const runtime = persistable.__worldseedRuntime;

  if (runtime?.version === RUNTIME_SNAPSHOT_VERSION && Array.isArray(runtime.tilePops)) {
    internals.state = saved;
    internals.prng.s = runtime.prngState;
    internals.tilePops = new Map(cloneTilePops(runtime.tilePops));
    internals.speciesCounter.current = runtime.counters.species;
    internals.settlementCounter.current = runtime.counters.settlement;
    internals.polityCounter.current = runtime.counters.polity;
    internals.cultureCounter.current = runtime.counters.culture;
    internals.languageCounter.current = runtime.counters.language;
    internals.pathogenCounter.current = runtime.counters.pathogen;
    internals.mythCounter.current = runtime.counters.myth;
    return engine;
  }

  // Legacy saves did not contain private simulation runtime state. Replaying the same
  // deterministic seed to the saved year reconstructs the closest safe runtime baseline
  // before restoring the serialized public state. It cannot recreate interventions that
  // were never persisted as engine internals, so new saves should always use snapshots.
  if (saved.currentYear > 0) engine.step(saved.currentYear);
  getInternals(engine).state = saved;
  return engine;
}
