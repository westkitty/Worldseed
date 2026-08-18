// Disease ecology, zoonotic spillover, trade-route epidemic propagation, and mutation

import { PRNG } from '../math/prng';
import { topologicalDistance } from '../planet/topology';
import {
  HistoricalEvent,
  Pathogen,
  PathogenType,
  Settlement,
  Species,
  Tile,
  TransmissionMode,
  WorldConfig
} from '../../types/simulation';

const PATHOGEN_NAMES = [
  'Crimson Rot', 'Ashen Cough', 'Bile Fever', 'Spore Blight',
  'Weeping Ague', 'Pale Tremor', 'Scalding Pox', 'Shadow Chills'
];

export function checkZoonoticSpillover(
  speciesMap: Record<string, Species>,
  settlements: Record<string, Settlement>,
  grid: Tile[][],
  currentYear: number,
  prng: PRNG,
  pathogenCounter: { current: number }
): { newPathogen: Pathogen | null; event: HistoricalEvent | null } {
  const activeSettlements = Object.values(settlements).filter(s => !s.isAbandoned && s.population > 1000);
  if (activeSettlements.length === 0 || prng.next() > 0.08) {
    return { newPathogen: null, event: null };
  }

  const targetSettlement = prng.choice(activeSettlements);
  const hostSpecies = speciesMap[targetSettlement.speciesId];
  if (!hostSpecies) return { newPathogen: null, event: null };

  // Find domestic or wild reservoir species
  const animalReservoirs = Object.values(speciesMap).filter(
    s => !s.isExtinct && s.id !== hostSpecies.id && (s.morphology === 'MAMMALIAN' || s.morphology === 'AVIAN' || s.isDomesticated)
  );

  const reservoir = animalReservoirs.length > 0 ? prng.choice(animalReservoirs) : null;
  pathogenCounter.current++;
  const pathogenId = `path_${pathogenCounter.current.toString().padStart(3, '0')}`;

  const types: PathogenType[] = ['VIRAL', 'BACTERIAL', 'FUNGAL_SPORE', 'PARASITIC'];
  const transmissions: TransmissionMode[] = ['AIRBORNE', 'WATERBORNE', 'DIRECT_CONTACT', 'VECTOR_INSECT'];

  const type = prng.choice(types);
  const transmission = prng.choice(transmissions);
  const baseName = prng.choice(PATHOGEN_NAMES);
  const pathogenName = `${targetSettlement.name} ${baseName}`;

  const pathogen: Pathogen = {
    id: pathogenId,
    name: pathogenName,
    type,
    transmission,
    originYear: currentYear,
    originTile: { x: targetSettlement.tileX, y: targetSettlement.tileY },
    reservoirSpeciesId: reservoir ? reservoir.id : hostSpecies.id,
    crossSpeciesHostIds: [hostSpecies.id],
    virulence: Math.round(prng.float(1.5, 4.5) * 10) / 10, // R0
    lethality: Math.round(prng.float(0.1, 0.45) * 100) / 100,
    incubationDays: prng.int(4, 21),
    environmentalPersistence: Math.round(prng.float(0.3, 0.8) * 100) / 100,
    mutationCount: 0,
    totalCasualtiesHistorical: 0,
    isActive: true,
    causalNodeId: `cause_path_${pathogenId}`
  };

  // Infect settlement tile
  grid[targetSettlement.tileY][targetSettlement.tileX].activeContagionIds.push(pathogenId);

  const event: HistoricalEvent = {
    id: `evt_plague_outbreak_${pathogenId}`,
    year: currentYear,
    title: `Outbreak of ${pathogenName}`,
    description: `A novel ${type.toLowerCase().replace('_', ' ')} pathogen (${pathogenName}) emerged in ${targetSettlement.name}${reservoir ? ` via zoonotic transmission from ${reservoir.commonName}` : ''}. Transmission: ${transmission.toLowerCase().replace('_', ' ')}.`,
    category: 'PLAGUE_OUTBREAK',
    importance: 4,
    tileCoordinates: { x: targetSettlement.tileX, y: targetSettlement.tileY },
    relatedEntityIds: [pathogenId, targetSettlement.id, hostSpecies.id],
    causalNodeId: pathogen.causalNodeId
  };

  return { newPathogen: pathogen, event };
}

export function simulateEpidemicStep(
  pathogens: Record<string, Pathogen>,
  settlements: Record<string, Settlement>,
  grid: Tile[][],
  config: WorldConfig,
  currentYear: number,
  prng: PRNG
): { casualties: number; events: HistoricalEvent[] } {
  const { width, height } = config;
  let totalCasualties = 0;
  const events: HistoricalEvent[] = [];

  for (const pathogen of Object.values(pathogens)) {
    if (!pathogen.isActive) continue;

    // Spread through infected tiles to neighboring settlements
    for (const s of Object.values(settlements)) {
      if (s.isAbandoned) continue;
      const tile = grid[s.tileY][s.tileX];

      if (tile.activeContagionIds.includes(pathogen.id)) {
        // Sanitation infrastructure reduces lethality and spread
        let lethality = pathogen.lethality;
        if (s.infrastructure.hasSanitation) lethality *= 0.4;
        if (s.infrastructure.hasAqueduct && pathogen.transmission === 'WATERBORNE') lethality *= 0.3;

        const deaths = Math.round(s.population * lethality * prng.float(0.15, 0.4));
        s.population = Math.max(10, s.population - deaths);
        totalCasualties += deaths;
        pathogen.totalCasualtiesHistorical += deaths;

        // Pathogen spread to adjacent settlements (trade & travel routes)
        if (prng.next() < 0.25) {
          for (const otherS of Object.values(settlements)) {
            if (otherS.id !== s.id && !otherS.isAbandoned) {
              // Travel distance follows the world's topology: contagion can round a
              // spherical or toroidal world the short way, but on a bounded slab or a sky
              // archipelago it must actually cross the intervening ground.
              const dist = topologicalDistance(
                { x: s.tileX, y: s.tileY },
                { x: otherS.tileX, y: otherS.tileY },
                width,
                height,
                config.topology
              );

              if (dist < 6) {
                const targetTile = grid[otherS.tileY][otherS.tileX];
                if (!targetTile.activeContagionIds.includes(pathogen.id)) {
                  targetTile.activeContagionIds.push(pathogen.id);
                }
              }
            }
          }
        }
      }
    }

    // Pathogen attenuation / mutation or burn-out over time
    if (prng.next() < 0.1) {
      pathogen.mutationCount++;
      pathogen.lethality = Math.max(0.02, pathogen.lethality * 0.85); // Natural attenuation
      if (pathogen.lethality < 0.04) {
        pathogen.isActive = false; // Becomes mild endemic disease
      }
    }
  }

  return { casualties: totalCasualties, events };
}
