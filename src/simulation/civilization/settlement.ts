// Settlement founding, tier progression, infrastructure, and ecological feedback

import { PRNG } from '../math/prng';
import { generateToponym } from './language';
import { Culture, Language, Settlement, Tile, WorldConfig } from '../../types/simulation';

export function findOptimalSettlementLocation(
  grid: Tile[][],
  config: WorldConfig,
  culture: Culture,
  existingSettlements: Settlement[],
  prng: PRNG
): { x: number; y: number } | null {
  const { width, height } = config;
  let bestScore = -Infinity;
  let bestPos: { x: number; y: number } | null = null;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tile = grid[y][x];
      if (tile.isWater) continue; // Can't build on deep water

      // Check distance from existing settlements
      let tooClose = false;
      for (const s of existingSettlements) {
        let dx = Math.abs(x - s.tileX);
        if (dx > width / 2) dx = width - dx;
        const dy = Math.abs(y - s.tileY);
        if (dx * dx + dy * dy < 16) {
          // Keep at least 4 tiles separation
          tooClose = true;
          break;
        }
      }
      if (tooClose) continue;

      // Location Scoring based on geographic advantages
      let score = tile.soilFertility * 40 + tile.carryingCapacity * 0.05;

      // Rivers provide massive freshwater & trade bonus
      if (tile.riverFlow > 0.1) {
        score += 35 + tile.riverFlow * 25;
      }

      // Coastal tiles provide harbor & fishing
      const hasOceanNeighbor = [
        [(x + 1) % width, y],
        [(x - 1 + width) % width, y],
        [x, Math.min(height - 1, y + 1)],
        [x, Math.max(0, y - 1)]
      ].some(([nx, ny]) => grid[ny][nx].isWater);

      if (hasOceanNeighbor) {
        score += 20;
      }

      // Mineral wealth bonus
      const totalMinerals = Object.values(tile.minerals).reduce((a, b) => a + b, 0);
      score += totalMinerals * 15;

      // Random local preference jitter
      score += prng.float(-5, 5);

      if (score > bestScore) {
        bestScore = score;
        bestPos = { x, y };
      }
    }
  }

  return bestPos;
}

export function createSettlement(
  id: string,
  culture: Culture,
  language: Language,
  speciesId: string,
  polityId: string,
  tilePos: { x: number; y: number },
  year: number,
  prng: PRNG
): Settlement {
  const name = generateToponym('SETTLEMENT', language, prng);

  return {
    id,
    name,
    originalLanguageName: name,
    tileX: tilePos.x,
    tileY: tilePos.y,
    foundedYear: year,
    population: 250,
    speciesId,
    cultureId: culture.id,
    polityId,
    tier: 'HAMLET',
    infrastructure: {
      hasWalls: false,
      hasGranary: false,
      hasHarbor: false,
      hasLibrary: false,
      hasAqueduct: false,
      hasSanitation: false,
      hasTemple: false,
      hasFoundry: false
    },
    foodSupplyDays: 180,
    waterSupply: 1.0,
    producedResources: ['STONE', 'CLAY'],
    isAbandoned: false,
    causalNodeId: `cause_settle_${id}`
  };
}

export function updateSettlement(
  settlement: Settlement,
  tile: Tile,
  techCount: number,
  prng: PRNG,
  year: number
): { populationDelta: number; causedDeforestation: number } {
  if (settlement.isAbandoned) return { populationDelta: 0, causedDeforestation: 0 };

  // 1. Food and Growth
  const foodProduction = tile.soilFertility * 400 * (settlement.infrastructure.hasGranary ? 1.3 : 1.0);
  const foodDemand = settlement.population * 0.8;
  const foodSurplus = foodProduction - foodDemand;

  let popDelta = 0;
  if (foodSurplus > 0) {
    popDelta = Math.round(settlement.population * prng.float(0.01, 0.04));
    settlement.foodSupplyDays = Math.min(365, settlement.foodSupplyDays + 10);
  } else {
    // Famine
    popDelta = -Math.round(settlement.population * prng.float(0.03, 0.08));
    settlement.foodSupplyDays = Math.max(0, settlement.foodSupplyDays - 20);
  }

  settlement.population = Math.max(10, settlement.population + popDelta);

  // 2. Update Settlement Tier
  const p = settlement.population;
  if (p < 500) settlement.tier = 'HAMLET';
  else if (p < 2000) settlement.tier = 'VILLAGE';
  else if (p < 8000) settlement.tier = 'TOWN';
  else if (p < 25000) settlement.tier = 'CITY';
  else settlement.tier = 'METROPOLIS';

  // 3. Infrastructure Construction
  if (p > 1000 && !settlement.infrastructure.hasGranary) settlement.infrastructure.hasGranary = true;
  if (p > 2500 && !settlement.infrastructure.hasWalls) settlement.infrastructure.hasWalls = true;
  if (p > 4000 && !settlement.infrastructure.hasTemple) settlement.infrastructure.hasTemple = true;
  if (p > 6000 && !settlement.infrastructure.hasAqueduct && tile.riverFlow > 0.1) settlement.infrastructure.hasAqueduct = true;
  if (p > 8000 && !settlement.infrastructure.hasLibrary && techCount > 3) settlement.infrastructure.hasLibrary = true;
  if (p > 12000 && !settlement.infrastructure.hasSanitation) settlement.infrastructure.hasSanitation = true;

  // 4. Ecological Impact: Deforestation and Soil Depletion
  const timberDemand = settlement.population * 0.05;
  const causedDeforestation = Math.min(tile.biomass * 0.05, timberDemand);
  tile.biomass = Math.max(50, tile.biomass - causedDeforestation);
  tile.environmentalDamage = Math.min(1.0, tile.environmentalDamage + 0.01 * (p / 10000));
  tile.infrastructureLevel = settlement.tier === 'METROPOLIS' ? 3 : settlement.tier === 'CITY' ? 2 : 1;

  return { populationDelta: popDelta, causedDeforestation };
}
