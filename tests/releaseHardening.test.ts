import { describe, expect, it } from 'vitest';
import { getPresetConfig } from '../src/simulation/scenarios/presets';
import { makeDiscoveryId } from '../src/simulation/history/discoveries';
const VALID_TOPOLOGIES = new Set(['SPHERICAL','PLANAR_BOUNDED','TOROIDAL_WRAP','FLOATING_ISLANDS','RINGWORLD_SEGMENT','LAYERED_CAVERNS','CYLINDRICAL_HABITAT']);
describe('release hardening determinism', () => {
  it('reproduces Surprise Me recipes exactly from the same seed', () => { for (const seed of [1,42,482910,999999,0x7fffffff]) { const a=getPresetConfig('SURPRISE_ME',seed),b=getPresetConfig('SURPRISE_ME',seed); expect(b).toEqual(a); expect(VALID_TOPOLOGIES.has(a.topology||'')).toBe(true); expect(a.seed).toBe(seed); } });
  it('allows deterministic Surprise Me generation to reach every supported topology', () => { const seen=new Set<string>(); for(let seed=1;seed<=500;seed++) seen.add(getPresetConfig('SURPRISE_ME',seed).topology||''); for(const topology of VALID_TOPOLOGIES) expect(seen.has(topology)).toBe(true); });
  it('builds discovery ids from simulated state rather than wall-clock time', () => { expect(makeDiscoveryId('troglobite_ruins',3250)).toBe('disc_troglobite_ruins_3250'); expect(makeDiscoveryId('troglobite_ruins',3250)).toBe(makeDiscoveryId('troglobite_ruins',3250)); expect(makeDiscoveryId('troglobite_ruins',3251)).not.toBe(makeDiscoveryId('troglobite_ruins',3250)); });
});
