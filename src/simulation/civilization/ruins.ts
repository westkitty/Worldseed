// Archaeological Ruins, Settlement Abandonment, Stratigraphy, and Troglobite Micro-Ecosystems

import { PRNG } from '../math/prng';
import { HistoricalEvent, RuinSite, Settlement, Tile } from '../../types/simulation';

export function createRuinFromSettlement(
  settlement: Settlement,
  tile: Tile,
  collapseCause: string,
  year: number,
  prng: PRNG
): { ruin: RuinSite; event: HistoricalEvent } {
  settlement.isAbandoned = true;
  settlement.abandonmentYear = year;
  settlement.abandonmentCause = collapseCause;

  const ruinId = `ruin_${settlement.id}`;
  const prominentStructures: string[] = ['Crumbling Foundations', 'Collapsed Stone Gate'];
  if (settlement.infrastructure.hasAqueduct) prominentStructures.push('Arched Aqueduct Remnants');
  if (settlement.infrastructure.hasLibrary) prominentStructures.push('Subterranean Archive Vaults');
  if (settlement.infrastructure.hasWalls) prominentStructures.push('Cyclopean Defense Ramparts');
  if (settlement.infrastructure.hasTemple) prominentStructures.push('Monolithic Pillar Circle');

  const ruin: RuinSite = {
    id: ruinId,
    settlementId: settlement.id,
    originalName: settlement.name,
    founderCultureId: settlement.cultureId,
    founderSpeciesId: settlement.speciesId,
    foundedYear: settlement.foundedYear,
    collapsedYear: year,
    collapseCause,
    prominentStructures,
    excavationLevel: 0.1, // starts buried by silt/dust
    artifactsRemaining: ['Inscribed Clay Tablets', 'Bronze Tool Cache', 'Carved Reliquaries'],
    decayLevel: 0.05,
    shelteredTroglobites: prng.next() < 0.45, // 45% chance to house a unique subterranean micro-refugium!
    associatedMythIds: []
  };

  // Embed ruin into the tile's historical stratigraphy
  tile.ruins.push(ruin);
  tile.settlementId = undefined;

  const event: HistoricalEvent = {
    id: `evt_collapse_${settlement.id}`,
    year,
    title: `Fall of ${settlement.name}`,
    description: `The settlement of ${settlement.name} has been abandoned and collapsed into ruins. Cause: ${collapseCause}. Its monuments and archives now lie buried beneath encroaching wilderness.`,
    category: 'POLITY_COLLAPSE',
    importance: 4,
    tileCoordinates: { x: settlement.tileX, y: settlement.tileY },
    relatedEntityIds: [settlement.id, ruinId],
    causalNodeId: settlement.causalNodeId
  };

  return { ruin, event };
}

export function updateRuinDecayAndExcavation(
  ruin: RuinSite,
  currentYear: number,
  nearbySettlementPresent: boolean,
  prng: PRNG
): string | null {
  const age = currentYear - ruin.collapsedYear;
  // Natural weathering and sedimentation over centuries
  ruin.decayLevel = Math.min(1.0, ruin.decayLevel + 0.001);

  if (nearbySettlementPresent && ruin.excavationLevel < 1.0 && prng.next() < 0.05) {
    ruin.excavationLevel = Math.min(1.0, ruin.excavationLevel + 0.2);
    return `Archaeological excavation at the ruins of ${ruin.originalName} uncovered ${prng.choice(ruin.artifactsRemaining)}.`;
  }
  return null;
}
