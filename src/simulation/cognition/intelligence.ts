// Emergence of Sapience, Cognition Milestones, and Anatomy Conditioning

import { PRNG } from '../math/prng';
import { HistoricalEvent, Species, Tile, WorldConfig } from '../../types/simulation';

export function evaluateSapienceEmergence(
  speciesMap: Record<string, Species>,
  grid: Tile[][],
  config: WorldConfig,
  prng: PRNG,
  currentYear: number
): { upliftedSpecies: Species[]; events: HistoricalEvent[] } {
  const upliftedSpecies: Species[] = [];
  const events: HistoricalEvent[] = [];

  const candidates = Object.values(speciesMap).filter(
    s => !s.isExtinct && !s.isSapient && s.morphology !== 'AUTOTROPH_PLANT' && s.morphology !== 'AUTOTROPH_ALGAE' && s.morphology !== 'FUNGUS_MYCELIUM'
  );

  for (const s of candidates) {
    // Cognitive pressure factors:
    // 1. Base cognition stat (increases over time through sexual selection / hunting / sociality)
    // 2. Social tendency (group cooperation)
    // 3. Manipulation ability (digits, tentacles, proboscis)
    // 4. Lifespan (allows intergenerational teaching)

    let score = s.genome.cognition * 0.5 + s.genome.socialTendency * 30 + (s.genome.lifespanYears > 15 ? 15 : 5);

    if (s.genome.manipulationOrgan === 'OPPOSABLE_DIGITS' || s.genome.manipulationOrgan === 'PREHENSILE_TENTACLES') {
      score += 20;
    }

    // Environmental pressure boost (living in variable biomes forces cognitive adaptation)
    const { x, y } = s.originTile;
    const tile = grid[y][x];
    if (tile.biome === 'SAVANNA' || tile.biome === 'TEMPERATE_FOREST' || tile.biome === 'COASTAL_REEF' || tile.biome === 'HYDROTHERMAL_RIFT') {
      score += 10;
    }

    // Threshold check (modulated by config.sapienceLikelihood)
    const threshold = 95 / Math.max(0.5, config.sapienceLikelihood);

    if (score >= threshold || (currentYear > 2000 && score > 70 && prng.next() < 0.05 * config.sapienceLikelihood)) {
      s.isSapient = true;
      s.sapienceEmergenceYear = currentYear;
      s.genome.cognition = Math.max(85, s.genome.cognition);

      upliftedSpecies.push(s);

      // Construct rich anatomical narrative
      let anatomyDesc = 'bipedal tool-makers';
      if (s.morphology === 'INVERTEBRATE_MOLLUSK' || s.morphology === 'PISCINE') {
        anatomyDesc = 'hydrothermal tool-weavers utilizing bio-luminescent communication and prehensile appendages';
      } else if (s.morphology === 'AVIAN') {
        anatomyDesc = 'cliff-dwelling aerial sapients communicating through acoustic harmonic whistling and aerial coordinate dance';
      } else if (s.morphology === 'INVERTEBRATE_ARTHROPOD') {
        anatomyDesc = 'eusocial hive engineers utilizing pheromone scripts and subterranean acoustic tapping';
      } else if (s.morphology === 'REPTILIAN') {
        anatomyDesc = 'thermal-sensitive ambushers mastering fire-kilns and sun-stone celestial alignments';
      }

      events.push({
        id: `evt_sap_${s.id}`,
        year: currentYear,
        title: `Awakening of Sapience in ${s.commonName}`,
        description: `The lineage of ${s.commonName} (${s.scientificName}) has achieved symbolic abstract thought and complex cultural communication. Operating as ${anatomyDesc}, they stand poised to reshape the planet's history.`,
        category: 'SAPIENCE_EMERGENCE',
        importance: 5,
        tileCoordinates: s.originTile,
        relatedEntityIds: [s.id],
        causalNodeId: s.causalNodeId
      });
    }
  }

  return { upliftedSpecies, events };
}
