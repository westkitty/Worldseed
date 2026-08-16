// Domestication of living biosphere organisms, selective breeding, and feral escapes

import { PRNG } from '../math/prng';
import { Culture, HistoricalEvent, Species } from '../../types/simulation';
import { TilePop } from '../ecology/populations';

export function attemptDomestication(
  culture: Culture,
  speciesMap: Record<string, Species>,
  tilePops: Map<string, TilePop[]>,
  settlementTilePos: { x: number; y: number },
  currentYear: number,
  prng: PRNG,
  speciesCountCounter: { current: number }
): { domesticSpecies: Species | null; event: HistoricalEvent | null } {
  const key = `${settlementTilePos.x},${settlementTilePos.y}`;
  const pops = tilePops.get(key) || [];

  // Find wild organisms present in this tile suitable for domestication
  const candidates: Species[] = [];
  for (const p of pops) {
    const s = speciesMap[p.speciesId];
    if (s && !s.isExtinct && !s.isDomesticated && !s.isSapient) {
      if (s.trophicLevel === 'PRODUCER' || s.trophicLevel === 'PRIMARY_CONSUMER' || s.trophicLevel === 'SECONDARY_CONSUMER') {
        candidates.push(s);
      }
    }
  }

  if (candidates.length === 0 || prng.next() > 0.15) {
    return { domesticSpecies: null, event: null };
  }

  const wildAncestor = prng.choice(candidates);
  speciesCountCounter.current++;
  const newId = `spec_${speciesCountCounter.current.toString().padStart(4, '0')}`;

  // Domesticated daughter species with selectively bred traits
  const domesticName = `Domesticated ${wildAncestor.commonName}`;
  const domesticScientific = `${wildAncestor.scientificName} domesticus`;

  const domesticGenome = {
    ...wildAncestor.genome,
    aggression: Math.max(0.05, wildAncestor.genome.aggression * 0.3), // Docility
    fertility: Math.min(0.95, wildAncestor.genome.fertility * 1.4), // Higher yield
    socialTendency: Math.min(0.95, wildAncestor.genome.socialTendency * 1.3),
    energyStorage: Math.min(0.98, wildAncestor.genome.energyStorage * 1.25)
  };

  const domesticSpecies: Species = {
    id: newId,
    commonName: domesticName,
    scientificName: domesticScientific,
    culturalNames: { [culture.id]: `${culture.name}'s Bread-Beast` },
    morphology: wildAncestor.morphology,
    trophicLevel: wildAncestor.trophicLevel,
    diet: [...wildAncestor.diet],
    genome: domesticGenome,
    parentSpeciesId: wildAncestor.id,
    divergenceYear: currentYear,
    originTile: settlementTilePos,
    isSapient: false,
    isDomesticated: true,
    domesticatedByCultureId: culture.id,
    ancestorWildSpeciesId: wildAncestor.id,
    isFeral: false,
    isExtinct: false,
    totalPopulation: 500,
    totalBiomass: 500 * domesticGenome.bodySizeMeters,
    colorHex: '#eab308',
    iconSymbol: wildAncestor.trophicLevel === 'PRODUCER' ? '🌾' : '🐕',
    causalNodeId: `cause_spec_${newId}`
  };

  // Add domestic population to tile
  pops.push({ speciesId: domesticSpecies.id, count: 500, adaptation: 0.95 });

  const event: HistoricalEvent = {
    id: `evt_dom_${newId}`,
    year: currentYear,
    title: `Domestication of ${wildAncestor.commonName}`,
    description: `The ${culture.name} successfully domesticated ${wildAncestor.commonName} (${wildAncestor.scientificName}), breeding the lineage of ${domesticName} for agricultural sustenance and labor.`,
    category: 'DOMESTICATION',
    importance: 3,
    tileCoordinates: settlementTilePos,
    relatedEntityIds: [wildAncestor.id, domesticSpecies.id, culture.id],
    causalNodeId: domesticSpecies.causalNodeId
  };

  return { domesticSpecies, event };
}

export function handleFeralEscapes(
  speciesMap: Record<string, Species>,
  settlementCollapsed: boolean,
  currentYear: number,
  prng: PRNG
): HistoricalEvent[] {
  const events: HistoricalEvent[] = [];

  const domestics = Object.values(speciesMap).filter(s => s.isDomesticated && !s.isFeral && !s.isExtinct);
  for (const s of domestics) {
    if (settlementCollapsed || prng.next() < 0.05) {
      s.isFeral = true;
      s.commonName = `Feral ${s.commonName.replace('Domesticated ', '')}`;
      s.genome.aggression = Math.min(0.8, s.genome.aggression * 2.0); // Regains wild defenses

      events.push({
        id: `evt_feral_${s.id}_${currentYear}`,
        year: currentYear,
        title: `Escape and Feralization of ${s.commonName}`,
        description: `Descendants of ${s.commonName} have escaped captivity and established wild self-sustaining breeding populations in the surrounding wilderness.`,
        category: 'SPECIATION',
        importance: 2,
        tileCoordinates: s.originTile,
        relatedEntityIds: [s.id],
        causalNodeId: s.causalNodeId
      });
    }
  }

  return events;
}
