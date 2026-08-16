// Chronicle of Eras, Auto-Epoch Detection, and Milestone History Records

import { Era, HistoricalEvent, WorldState } from '../../types/simulation';

export function evaluateEras(state: WorldState): Era[] {
  const { currentYear, events, species, settlements, polities } = state;
  const eras: Era[] = [];

  const activeSapientCount = Object.values(species).filter(s => s.isSapient && !s.isExtinct).length;
  const activeSettlementCount = Object.values(settlements).filter(s => !s.isAbandoned).length;
  const activePolityCount = Object.values(polities).filter(p => !p.isExtinct).length;

  // 1. Primordial Dawn
  eras.push({
    id: 'era_primordial',
    name: 'The Primordial Dawn',
    startYear: 0,
    endYear: Math.min(currentYear, 500),
    dominantTheme: 'Planetary cooling, tectonic stabilization, and the seeding of primordial autotrophic and invertebrate lineages.',
    description: 'The oceans settle into ancient basins as primitive organisms colonize tidal flats and deep hydrothermal vents.',
    keyEventsCount: events.filter(e => e.year <= 500).length
  });

  // 2. Age of Adaptive Radiation
  if (currentYear > 500) {
    eras.push({
      id: 'era_radiation',
      name: 'The Age of Adaptive Radiation',
      startYear: 501,
      endYear: Math.min(currentYear, 1500),
      dominantTheme: 'Ecosystem diversification, trophic arms races, and widespread ecological colonization.',
      description: 'Forests expand across continental interiors while herbivores and apex predators carve out specialized niches.',
      keyEventsCount: events.filter(e => e.year > 500 && e.year <= 1500).length
    });
  }

  // 3. Epoch of Ecological Climax or Awakening of Mind
  if (currentYear > 1500) {
    const isAwakened = activeSapientCount > 0;
    eras.push({
      id: 'era_awakening',
      name: isAwakened ? 'The Awakening of Mind' : 'The Epoch of Ecological Equilibrium',
      startYear: 1501,
      endYear: Math.min(currentYear, 3000),
      dominantTheme: isAwakened
        ? 'Emergence of symbolic thought, tool making, vocal dialects, and tribal hearthfires.'
        : 'Stabilization of apex predator food webs, megafaunal migration corridors, and dense climax forest canopies.',
      description: isAwakened
        ? 'Sapient lineages develop kinship clans, oral mythologies, and the first permanent campsites along fertile waterways.'
        : 'Ecosystems reach dynamic maturity across continental watersheds, establishing deep biomass reserves.',
      keyEventsCount: events.filter(e => e.year > 1500 && e.year <= 3000).length
    });
  }

  // 4. Age of River Citadels & Deep Stratigraphy
  if (currentYear > 3000) {
    const hasCities = activeSettlementCount > 0;
    eras.push({
      id: 'era_civilization',
      name: hasCities ? 'The Age of River Citadels' : 'The Epoch of Primeval Megafauna',
      startYear: 3001,
      endYear: Math.min(currentYear, 5000),
      dominantTheme: hasCities
        ? 'Canal agriculture, selective domestication of fauna, monumental architecture, and the founding of city-states.'
        : 'Widespread fossil deposition, localized climate shifts, and long-term soil enrichment.',
      description: hasCities
        ? 'Stone towers and granaries rise beside floodplains; trade routes connect distant biomes as writing systems codify law.'
        : 'Millennia of biological activity create rich coal and mineralized fossil strata in the bedrock.',
      keyEventsCount: events.filter(e => e.year > 3000 && e.year <= 5000).length
    });
  }

  // 5. Epoch of Layered History
  if (currentYear > 5000) {
    eras.push({
      id: 'era_deep_history',
      name: 'The Epoch of Deep Stratigraphy',
      startYear: 5001,
      endYear: null,
      dominantTheme: 'Layered civilizations, archaeological excavations, distorted cultural mythologies, and forgotten precursor ruins.',
      description: 'Successor kingdoms build palaces above ancient buried catacombs, venerating fossils of creatures that walked the earth millennia prior.',
      keyEventsCount: events.filter(e => e.year > 5000).length
    });
  }

  return eras;
}
