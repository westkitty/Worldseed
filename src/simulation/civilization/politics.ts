// Political dynamics, dynamic borders, wars, peace treaties, and trade networks

import { PRNG } from '../math/prng';
import { Culture, HistoricalEvent, Polity, Settlement, Tile, WorldConfig } from '../../types/simulation';

export function createPolity(
  id: string,
  name: string,
  speciesId: string,
  culture: Culture,
  capitalSettlement: Settlement,
  year: number,
  prng: PRNG
): Polity {
  const govTypes: Polity['governmentType'][] = [
    'TRIBAL_CONFEDERACY', 'SACRED_THEOCRACY', 'MERCHANT_LEAGUE',
    'EXPANSIONIST_EMPIRE', 'SCHOLASTIC_SYNDICATE', 'COMMUNAL_COUNCIL'
  ];

  return {
    id,
    name: `${name} ${prng.choice(['Empire', 'League', 'Confederacy', 'Dominion', 'Realm', 'Syndicate'])}`,
    governmentType: prng.choice(govTypes),
    primarySpeciesId: speciesId,
    primaryCultureId: culture.id,
    capitalSettlementId: capitalSettlement.id,
    foundedYear: year,
    isExtinct: false,
    territoryTileIndices: [],
    allies: [],
    rivals: [],
    activeWars: [],
    discoveredTechIds: ['TECH_FIRE_MASTERY'],
    colorHex: culture.colorHex,
    causalNodeId: `cause_polity_${id}`
  };
}

export function updatePolityTerritories(
  polities: Record<string, Polity>,
  settlements: Record<string, Settlement>,
  grid: Tile[][],
  config: WorldConfig
) {
  const { width, height } = config;

  // Clear existing tile ownership
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      grid[y][x].polityId = undefined;
    }
  }

  for (const polity of Object.values(polities)) {
    if (polity.isExtinct) continue;
    polity.territoryTileIndices = [];

    // Find all active settlements belonging to this polity
    const politySettlements = Object.values(settlements).filter(
      s => s.polityId === polity.id && !s.isAbandoned
    );

    for (const s of politySettlements) {
      const radius = s.tier === 'METROPOLIS' ? 4 : s.tier === 'CITY' ? 3 : s.tier === 'TOWN' ? 2 : 1;

      for (let dy = -radius; dy <= radius; dy++) {
        const ny = Math.max(0, Math.min(height - 1, s.tileY + dy));
        for (let dx = -radius; dx <= radius; dx++) {
          if (dx * dx + dy * dy <= radius * radius) {
            const nx = (s.tileX + dx + width) % width;
            const tile = grid[ny][nx];
            if (!tile.isWater && !tile.polityId) {
              tile.polityId = polity.id;
              polity.territoryTileIndices.push(ny * width + nx);
            }
          }
        }
      }
    }
  }
}

export function simulateDiplomacyAndWar(
  polities: Record<string, Polity>,
  settlements: Record<string, Settlement>,
  currentYear: number,
  prng: PRNG
): HistoricalEvent[] {
  const events: HistoricalEvent[] = [];
  const activePolities = Object.values(polities).filter(p => !p.isExtinct);

  if (activePolities.length < 2) return events;

  // Pairwise diplomatic evaluation
  for (let i = 0; i < activePolities.length; i++) {
    for (let j = i + 1; j < activePolities.length; j++) {
      const pA = activePolities[i];
      const pB = activePolities[j];

      const isAtWar = pA.activeWars.some(w => w.enemyPolityId === pB.id);

      if (isAtWar) {
        // Chance of peace treaty
        if (prng.next() < 0.2) {
          pA.activeWars = pA.activeWars.filter(w => w.enemyPolityId !== pB.id);
          pB.activeWars = pB.activeWars.filter(w => w.enemyPolityId !== pA.id);

          events.push({
            id: `evt_peace_${pA.id}_${pB.id}_${currentYear}`,
            year: currentYear,
            title: `Treaty of Reconciliation: ${pA.name} and ${pB.name}`,
            description: `Hostilities concluded between ${pA.name} and ${pB.name}, establishing stabilized territorial borders along frontier river boundaries.`,
            category: 'PEACE_TREATY',
            importance: 3,
            relatedEntityIds: [pA.id, pB.id],
            causalNodeId: pA.causalNodeId
          });
        }
      } else {
        // Chance of conflict breakout (resource competition or territorial rivalry)
        if (prng.next() < 0.08) {
          const reason = prng.choice([
            'Territorial dispute over fertile river valleys',
            'Competition over high-grade copper and iron deposits',
            'Retaliation for cross-border foraging and raiding',
            'Clash of ancestral religious ceremonies'
          ]);

          pA.activeWars.push({ enemyPolityId: pB.id, startYear: currentYear, reason });
          pB.activeWars.push({ enemyPolityId: pA.id, startYear: currentYear, reason });

          events.push({
            id: `evt_war_${pA.id}_${pB.id}_${currentYear}`,
            year: currentYear,
            title: `Outbreak of War between ${pA.name} and ${pB.name}`,
            description: `The ${pA.name} declared war upon the ${pB.name}. Motive: ${reason}.`,
            category: 'WAR_DECLARED',
            importance: 4,
            relatedEntityIds: [pA.id, pB.id],
            causalNodeId: pA.causalNodeId
          });
        }
      }
    }
  }

  return events;
}
