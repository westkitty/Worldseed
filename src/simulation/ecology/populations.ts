// Spatial population simulation, trophic energy flow, and Lotka-Volterra dynamics

import { PRNG } from '../math/prng';
import { Species, Tile, WorldConfig } from '../../types/simulation';

export interface TilePop {
  speciesId: string;
  count: number;
  adaptation: number; // 0 to 1
}

export function simulateEcologicalCycle(
  grid: Tile[][],
  speciesMap: Record<string, Species>,
  tilePops: Map<string, TilePop[]>, // key: `${x},${y}`
  config: WorldConfig,
  prng: PRNG,
  year: number
): {
  updatedTilePops: Map<string, TilePop[]>;
  speciesTotals: Record<string, number>;
  extinctionCandidates: string[];
} {
  const { width, height } = config;
  const newTilePops = new Map<string, TilePop[]>();
  const speciesTotals: Record<string, number> = {};
  const activeSpeciesIds = new Set<string>();

  for (const sId of Object.keys(speciesMap)) {
    if (!speciesMap[sId].isExtinct) {
      speciesTotals[sId] = 0;
      activeSpeciesIds.add(sId);
    }
  }

  // Iterate over each tile on the map
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tile = grid[y][x];
      const key = `${x},${y}`;
      const pops = tilePops.get(key) || [];
      const updatedPopsForTile: TilePop[] = [];

      // Calculate total plant biomass available in this tile
      let availablePlantBiomass = tile.biomass;
      let totalHerbivoresCount = 0;
      let totalPredatorsCount = 0;

      for (const p of pops) {
        const s = speciesMap[p.speciesId];
        if (!s || s.isExtinct) continue;
        if (s.trophicLevel === 'PRIMARY_CONSUMER') totalHerbivoresCount += p.count;
        if (s.trophicLevel === 'SECONDARY_CONSUMER' || s.trophicLevel === 'APEX_PREDATOR') totalPredatorsCount += p.count;
      }

      // Process each species population cluster in this tile
      for (const p of pops) {
        const s = speciesMap[p.speciesId];
        if (!s || s.isExtinct) continue;

        // 1. Environmental Suitability Check
        const tempDiff = Math.abs(tile.currentTemp - s.genome.preferredTemp);
        const tempSuitability = Math.max(0, 1.0 - tempDiff / (s.genome.tempTolerance + 0.1));

        // Aquatic vs Terrestrial check
        const aquaticSuitability = (tile.isWater && (s.morphology === 'AUTOTROPH_ALGAE' || s.morphology === 'PISCINE' || s.morphology === 'INVERTEBRATE_MOLLUSK')) ||
                                  (!tile.isWater && (s.morphology !== 'AUTOTROPH_ALGAE' && s.morphology !== 'PISCINE')) ? 1.0 : 0.05;

        const moistureDiff = Math.abs(tile.moisture - 0.5);
        const moistureSuitability = Math.max(0.1, 1.0 - moistureDiff * (1.0 - s.genome.moistureTolerance));

        const overallFitness = Math.max(0.01, tempSuitability * aquaticSuitability * moistureSuitability);

        // 2. Trophic Dynamics (Births, Starvation, Predation)
        let growthRate = 0;
        let deathRate = 0;

        if (s.trophicLevel === 'PRODUCER') {
          // Producers grow based on sunlight, soil fertility, freshwater
          growthRate = s.genome.fertility * 0.4 * overallFitness * (tile.soilFertility + 0.2);
          // Grazing pressure from herbivores
          deathRate = 0.05 + (totalHerbivoresCount / (tile.carryingCapacity + 100)) * 0.3;
        } else if (s.trophicLevel === 'PRIMARY_CONSUMER') {
          // Herbivores feed on plant biomass
          const foodAvailable = Math.min(1.0, availablePlantBiomass / (totalHerbivoresCount * s.genome.bodySizeMeters + 10));
          growthRate = s.genome.fertility * 0.35 * overallFitness * foodAvailable;
          // Predation loss
          deathRate = 0.08 + (totalPredatorsCount / (totalHerbivoresCount + 50)) * 0.4;
        } else if (s.trophicLevel === 'SECONDARY_CONSUMER' || s.trophicLevel === 'APEX_PREDATOR') {
          // Carnivores feed on herbivores
          const preyAvailable = Math.min(1.0, (totalHerbivoresCount * 2.0) / (totalPredatorsCount + 10));
          growthRate = s.genome.fertility * 0.25 * overallFitness * preyAvailable;
          deathRate = 0.12 + (1.0 - preyAvailable) * 0.5;
        } else {
          // Decomposers / Scavengers
          growthRate = s.genome.fertility * 0.3 * overallFitness;
          deathRate = 0.1;
        }

        // Apply population change with logistic capacity damper
        const capacityFactor = Math.max(0.1, 1.0 - p.count / (tile.carryingCapacity + 100));
        let newCount = p.count + p.count * (growthRate * capacityFactor - deathRate);

        // Random demographic drift
        newCount += prng.gaussian(0, Math.sqrt(Math.max(1, p.count)) * 0.2);
        newCount = Math.round(newCount);

        if (newCount > 5) {
          updatedPopsForTile.push({
            speciesId: p.speciesId,
            count: newCount,
            adaptation: Math.min(1.0, p.adaptation + 0.01 * overallFitness)
          });
          speciesTotals[p.speciesId] = (speciesTotals[p.speciesId] || 0) + newCount;

          // 3. Migration Pressure: If population is healthy, spread to adjacent tiles
          if (newCount > 150 && s.genome.mobility > 0.2 && prng.next() < s.genome.migrationTendency * 0.4) {
            const dx = prng.choice([-1, 0, 1]);
            const dy = prng.choice([-1, 0, 1]);
            if (dx !== 0 || dy !== 0) {
              const nx = (x + dx + width) % width;
              const ny = Math.max(0, Math.min(height - 1, y + dy));
              const neighborKey = `${nx},${ny}`;
              const migrantCount = Math.round(newCount * 0.1);

              let nPops = newTilePops.get(neighborKey);
              if (!nPops) {
                nPops = [];
                newTilePops.set(neighborKey, nPops);
              }
              const existing = nPops.find(ep => ep.speciesId === p.speciesId);
              if (existing) {
                existing.count += migrantCount;
              } else {
                nPops.push({ speciesId: p.speciesId, count: migrantCount, adaptation: 0.5 });
              }
            }
          }
        }
      }

      // Merge newly added migrants with updated pops
      let existingMerged = newTilePops.get(key) || [];
      for (const up of updatedPopsForTile) {
        const found = existingMerged.find(e => e.speciesId === up.speciesId);
        if (found) {
          found.count += up.count;
        } else {
          existingMerged.push(up);
        }
      }
      if (existingMerged.length > 0) {
        newTilePops.set(key, existingMerged);
      }

      // Update tile population density summary & dominant species
      let tileTotalPop = 0;
      let dominantSId: string | undefined;
      let maxCount = 0;
      for (const p of existingMerged) {
        tileTotalPop += p.count;
        if (p.count > maxCount) {
          maxCount = p.count;
          dominantSId = p.speciesId;
        }
      }
      tile.populationDensity = tileTotalPop;
      tile.dominantSpeciesId = dominantSId;
    }
  }

  // Identify species that have died out everywhere
  const extinctionCandidates: string[] = [];
  for (const sId of activeSpeciesIds) {
    if ((speciesTotals[sId] || 0) <= 0) {
      extinctionCandidates.push(sId);
    }
  }

  return { updatedTilePops: newTilePops, speciesTotals, extinctionCandidates };
}
