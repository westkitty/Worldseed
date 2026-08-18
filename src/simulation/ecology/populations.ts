// Spatial population simulation, trophic energy flow, and Lotka-Volterra dynamics

import { PRNG } from '../math/prng';
import { Species, Tile, WorldConfig } from '../../types/simulation';
import { stepCoordinate } from '../planet/topology';

export interface TilePop {
  speciesId: string;
  count: number;
  adaptation: number; // 0 to 1
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function resolveMigrationTarget(
  x: number,
  y: number,
  dx: number,
  dy: number,
  config: WorldConfig
): { x: number; y: number } | null {
  const { width, height } = config;
  // Adjacency is defined once, in planet/topology.ts, so migration, hydrology, atmospheric
  // transport and contagion all agree about what is next to what.
  return stepCoordinate(x, y, dx, dy, width, height, config.topology);
}

function updateGenreEnvironment(tile: Tile, config: WorldConfig): number {
  const genre = config.genre || 'REALISTIC';
  let fitnessMultiplier = 1;

  if (genre === 'FANTASY' || genre === 'SCIENCE_FANTASY') {
    const mineralResonance =
      (tile.minerals.GEMS || 0) * 0.55 +
      (tile.minerals.OBSIDIAN || 0) * 0.25 +
      config.volcanism * 0.2;
    const mana = clamp01(mineralResonance * (config.manaRichness || 0));
    tile.manaDensity = mana;
    tile.isEnchanted = mana > 0.62;
    // Magic is now causal rather than cosmetic: organisms in mana-rich niches
    // receive a bounded environmental advantage and therefore alter migration,
    // selection and downstream civilization history.
    fitnessMultiplier *= 1 + mana * 0.24;
  } else {
    tile.manaDensity = 0;
    tile.isEnchanted = false;
  }

  if (genre === 'SCI_FI' || genre === 'SCIENCE_FANTASY') {
    const cyber = clamp01(config.cyberTechLevel || 0);
    const machineSubstrate = clamp01(
      ((tile.minerals.RARE_EARTHS || 0) * 0.65 + (tile.minerals.IRON || 0) * 0.2 + (tile.minerals.COPPER || 0) * 0.15) * cyber
    );
    tile.techArtifacts = machineSubstrate;
    // Automated habitat support/terraforming is deliberately modest; it changes
    // ecological outcomes without replacing ordinary food-web pressure.
    fitnessMultiplier *= 1 + machineSubstrate * 0.16;
  } else {
    tile.techArtifacts = 0;
  }

  return fitnessMultiplier;
}

export function simulateEcologicalCycle(
  grid: Tile[][],
  speciesMap: Record<string, Species>,
  tilePops: Map<string, TilePop[]>,
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

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tile = grid[y][x];
      const key = `${x},${y}`;
      const pops = tilePops.get(key) || [];
      const updatedPopsForTile: TilePop[] = [];
      const genreFitnessMultiplier = updateGenreEnvironment(tile, config);

      let availablePlantBiomass = tile.biomass;
      let totalHerbivoresCount = 0;
      let totalPredatorsCount = 0;

      for (const p of pops) {
        const s = speciesMap[p.speciesId];
        if (!s || s.isExtinct) continue;
        if (s.trophicLevel === 'PRIMARY_CONSUMER') totalHerbivoresCount += p.count;
        if (s.trophicLevel === 'SECONDARY_CONSUMER' || s.trophicLevel === 'APEX_PREDATOR') totalPredatorsCount += p.count;
      }

      for (const p of pops) {
        const s = speciesMap[p.speciesId];
        if (!s || s.isExtinct) continue;

        const tempDiff = Math.abs(tile.currentTemp - s.genome.preferredTemp);
        const tempSuitability = Math.max(0, 1.0 - tempDiff / (s.genome.tempTolerance + 0.1));

        const aquaticSuitability =
          (tile.isWater && (s.morphology === 'AUTOTROPH_ALGAE' || s.morphology === 'PISCINE' || s.morphology === 'INVERTEBRATE_MOLLUSK')) ||
          (!tile.isWater && s.morphology !== 'AUTOTROPH_ALGAE' && s.morphology !== 'PISCINE')
            ? 1.0
            : 0.05;

        const moistureDiff = Math.abs(tile.moisture - 0.5);
        const moistureSuitability = Math.max(0.1, 1.0 - moistureDiff * (1.0 - s.genome.moistureTolerance));

        const overallFitness = Math.max(
          0.01,
          tempSuitability * aquaticSuitability * moistureSuitability * genreFitnessMultiplier
        );

        let growthRate = 0;
        let deathRate = 0;

        if (s.trophicLevel === 'PRODUCER') {
          growthRate = s.genome.fertility * 0.4 * overallFitness * (tile.soilFertility + 0.2);
          deathRate = 0.05 + (totalHerbivoresCount / (tile.carryingCapacity + 100)) * 0.3;
        } else if (s.trophicLevel === 'PRIMARY_CONSUMER') {
          const foodAvailable = Math.min(1.0, availablePlantBiomass / (totalHerbivoresCount * s.genome.bodySizeMeters + 10));
          growthRate = s.genome.fertility * 0.35 * overallFitness * foodAvailable;
          deathRate = 0.08 + (totalPredatorsCount / (totalHerbivoresCount + 50)) * 0.4;
        } else if (s.trophicLevel === 'SECONDARY_CONSUMER' || s.trophicLevel === 'APEX_PREDATOR') {
          const preyAvailable = Math.min(1.0, (totalHerbivoresCount * 2.0) / (totalPredatorsCount + 10));
          growthRate = s.genome.fertility * 0.25 * overallFitness * preyAvailable;
          deathRate = 0.12 + (1.0 - preyAvailable) * 0.5;
        } else {
          growthRate = s.genome.fertility * 0.3 * overallFitness;
          deathRate = 0.1;
        }

        const capacityFactor = Math.max(0.1, 1.0 - p.count / (tile.carryingCapacity + 100));
        let newCount = p.count + p.count * (growthRate * capacityFactor - deathRate);

        newCount += prng.gaussian(0, Math.sqrt(Math.max(1, p.count)) * 0.2);
        newCount = Math.round(newCount);

        if (newCount > 5) {
          updatedPopsForTile.push({
            speciesId: p.speciesId,
            count: newCount,
            adaptation: Math.min(1.0, p.adaptation + 0.01 * overallFitness)
          });
          speciesTotals[p.speciesId] = (speciesTotals[p.speciesId] || 0) + newCount;

          if (newCount > 150 && s.genome.mobility > 0.2 && prng.next() < s.genome.migrationTendency * 0.4) {
            const dx = prng.choice([-1, 0, 1]);
            const dy = prng.choice([-1, 0, 1]);
            if (dx !== 0 || dy !== 0) {
              const target = resolveMigrationTarget(x, y, dx, dy, config);
              if (target) {
                const neighborKey = `${target.x},${target.y}`;
                const migrantCount = Math.round(newCount * 0.1);
                let nPops = newTilePops.get(neighborKey);
                if (!nPops) {
                  nPops = [];
                  newTilePops.set(neighborKey, nPops);
                }
                const existing = nPops.find(ep => ep.speciesId === p.speciesId);
                if (existing) existing.count += migrantCount;
                else nPops.push({ speciesId: p.speciesId, count: migrantCount, adaptation: 0.5 });
              }
            }
          }
        }
      }

      const existingMerged = newTilePops.get(key) || [];
      for (const up of updatedPopsForTile) {
        const found = existingMerged.find(e => e.speciesId === up.speciesId);
        if (found) found.count += up.count;
        else existingMerged.push(up);
      }
      if (existingMerged.length > 0) newTilePops.set(key, existingMerged);

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

  const extinctionCandidates: string[] = [];
  for (const sId of activeSpeciesIds) {
    if ((speciesTotals[sId] || 0) <= 0) extinctionCandidates.push(sId);
  }

  return { updatedTilePops: newTilePops, speciesTotals, extinctionCandidates };
}
