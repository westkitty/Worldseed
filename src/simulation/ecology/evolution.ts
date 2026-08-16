// Speciation, phylogenetic divergence, extinction cascades, and fossil stratigraphy

import { PRNG } from '../math/prng';
import { createSpecies, mutateGenome } from './species';
import { FossilLayer, HistoricalEvent, Species, Tile, WorldConfig } from '../../types/simulation';
import { TilePop } from './populations';

export function checkSpeciation(
  speciesMap: Record<string, Species>,
  tilePops: Map<string, TilePop[]>,
  grid: Tile[][],
  config: WorldConfig,
  prng: PRNG,
  currentYear: number,
  speciesCountCounter: { current: number }
): { newSpecies: Species[]; events: HistoricalEvent[] } {
  const { width, height } = config;
  const newSpecies: Species[] = [];
  const events: HistoricalEvent[] = [];

  // Count active species to prevent unbounded memory growth (maintain ~20-50 diverse lineages)
  const activeSpecies = Object.values(speciesMap).filter(s => !s.isExtinct);
  if (activeSpecies.length >= 60) return { newSpecies, events };

  for (const parent of activeSpecies) {
    // Large, widely distributed populations with high mutation rate can speciate
    if (parent.totalPopulation > 1500 && prng.next() < 0.08) {
      // Find an isolated peripheral tile where this species lives
      const candidateTiles: Array<{ x: number; y: number; adaptation: number }> = [];

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const pops = tilePops.get(`${x},${y}`);
          if (pops) {
            const match = pops.find(p => p.speciesId === parent.id);
            if (match && match.count > 100) {
              candidateTiles.push({ x, y, adaptation: match.adaptation });
            }
          }
        }
      }

      if (candidateTiles.length >= 2) {
        // Pick peripheral colony
        const target = prng.choice(candidateTiles);
        const tile = grid[target.y][target.x];

        speciesCountCounter.current++;
        const newId = `spec_${speciesCountCounter.current.toString().padStart(4, '0')}`;

        // Create mutated daughter lineage
        const daughter = createSpecies(
          newId,
          parent.morphology,
          parent.trophicLevel,
          parent.id,
          currentYear,
          { x: target.x, y: target.y },
          prng,
          parent.genome
        );

        // Adapt daughter genome to local tile conditions
        daughter.genome.preferredTemp = tile.currentTemp;
        daughter.genome.moistureTolerance = tile.moisture;
        daughter.totalPopulation = 300;

        newSpecies.push(daughter);

        // Convert part of parent cluster in this tile to the new species
        const pops = tilePops.get(`${target.x},${target.y}`);
        if (pops) {
          const pMatch = pops.find(p => p.speciesId === parent.id);
          if (pMatch) {
            pMatch.count = Math.max(10, pMatch.count - 300);
            pops.push({ speciesId: daughter.id, count: 300, adaptation: 0.8 });
          }
        }

        // Record Speciation Event
        events.push({
          id: `evt_spec_${newId}`,
          year: currentYear,
          title: `Divergence of ${daughter.commonName}`,
          description: `A population of ${parent.commonName} (${parent.scientificName}) diverged in the ${tile.biome.toLowerCase().replace('_', ' ')} region, giving rise to ${daughter.commonName} (${daughter.scientificName}).`,
          category: 'SPECIATION',
          importance: 2,
          tileCoordinates: { x: target.x, y: target.y },
          relatedEntityIds: [parent.id, daughter.id],
          causalNodeId: daughter.causalNodeId
        });
      }
    }
  }

  return { newSpecies, events };
}

export function handleExtinctions(
  extinctIds: string[],
  speciesMap: Record<string, Species>,
  grid: Tile[][],
  currentYear: number,
  prng: PRNG
): HistoricalEvent[] {
  const events: HistoricalEvent[] = [];

  for (const sId of extinctIds) {
    const s = speciesMap[sId];
    if (!s || s.isExtinct) continue;

    s.isExtinct = true;
    s.extinctionYear = currentYear;
    s.totalPopulation = 0;

    // Determine believable causal narrative
    let cause = 'Loss of ecological niche and starvation';
    if (s.trophicLevel === 'PRODUCER') {
      cause = 'Prolonged climate desiccation and thermal shock';
    } else if (s.trophicLevel === 'APEX_PREDATOR') {
      cause = 'Depletion of primary prey populations and over-specialization';
    } else if (s.isDomesticated) {
      cause = 'Collapse of patron civilization and feral competition';
    }

    s.extinctionCause = cause;

    // Deposit Fossils in the stratigraphy of the planet grid
    const depthMeters = Math.max(1.0, (50000 - currentYear) * 0.002 + prng.float(1, 10));
    const fossil: FossilLayer = {
      speciesId: s.id,
      speciesName: s.commonName,
      scientificName: s.scientificName,
      trophicLevel: s.trophicLevel,
      extinctionYear: currentYear,
      geologicalDepthMeters: Math.round(depthMeters * 10) / 10,
      mineralizationQuality: Math.round(prng.float(0.6, 0.98) * 100) / 100
    };

    // Embed in origin tile and surrounding area
    const { x, y } = s.originTile;
    const height = grid.length;
    const width = grid[0].length;

    for (let dy = -1; dy <= 1; dy++) {
      const ny = Math.max(0, Math.min(height - 1, y + dy));
      for (let dx = -1; dx <= 1; dx++) {
        const nx = (x + dx + width) % width;
        if (prng.next() < 0.6) {
          grid[ny][nx].fossils.push(fossil);
        }
      }
    }

    events.push({
      id: `evt_ext_${s.id}`,
      year: currentYear,
      title: `Extinction of ${s.commonName}`,
      description: `The lineage of ${s.commonName} (${s.scientificName}) has vanished from the biosphere after surviving for ${currentYear - s.divergenceYear} simulated years. Cause: ${cause}.`,
      category: 'EXTINCTION',
      importance: s.isSapient ? 5 : 3,
      tileCoordinates: s.originTile,
      relatedEntityIds: [s.id],
      causalNodeId: s.causalNodeId
    });
  }

  return events;
}
