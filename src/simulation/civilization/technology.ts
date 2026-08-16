// Nonlinear Technology Knowledge Graph, Environmental Constraints, and Ruin Rediscovery

import { PRNG } from '../math/prng';
import { Polity, Technology, Tile } from '../../types/simulation';

export const TECH_TREE: Record<string, Technology> = {
  TECH_FIRE_MASTERY: {
    id: 'TECH_FIRE_MASTERY',
    name: 'Fire & Kiln Thermal Mastery',
    category: 'MATERIALS',
    description: 'Controlled combustion for tool tempering, food safety, and clay baking.',
    prerequisites: [],
    effects: { agriculturalYieldBonus: 0.1, militaryPowerBonus: 0.1 }
  },
  TECH_IRRIGATION: {
    id: 'TECH_IRRIGATION',
    name: 'River Canal Irrigation',
    category: 'FOOD_PRODUCTION',
    description: 'Artificial channeling of floodwaters into fertile crop basins.',
    prerequisites: ['TECH_FIRE_MASTERY'],
    effects: { agriculturalYieldBonus: 0.3 }
  },
  TECH_POTTERY_WRITING: {
    id: 'TECH_POTTERY_WRITING',
    name: 'Cuneiform & Inscribed Tablets',
    category: 'WRITING_RECORDS',
    description: 'Durable record keeping and historical chronicles on baked clay and stone.',
    prerequisites: ['TECH_FIRE_MASTERY'],
    requiredMinerals: ['CLAY'],
    effects: { durableWriting: true }
  },
  TECH_BRONZE_METALLURGY: {
    id: 'TECH_BRONZE_METALLURGY',
    name: 'Bronze Smelting & Alloying',
    category: 'METALLURGY',
    description: 'Smelting copper and tin alloys for durable plows, armor, and weapons.',
    prerequisites: ['TECH_FIRE_MASTERY'],
    requiredMinerals: ['COPPER', 'TIN'],
    effects: { agriculturalYieldBonus: 0.2, militaryPowerBonus: 0.3, metalCrafting: true }
  },
  TECH_MARITIME_NAVIGATION: {
    id: 'TECH_MARITIME_NAVIGATION',
    name: 'Celestial & Coastal Navigation',
    category: 'NAVIGATION',
    description: 'Star-sighting astrolabes and coastal hull construction for open sea routes.',
    prerequisites: ['TECH_POTTERY_WRITING'],
    effects: { navigationSpeedBonus: 0.4 }
  },
  TECH_IRON_SMELTING: {
    id: 'TECH_IRON_SMELTING',
    name: 'High-Temperature Iron Smelting',
    category: 'METALLURGY',
    description: 'Carbon-fueled bloomeries producing hardened wrought iron and steel tools.',
    prerequisites: ['TECH_BRONZE_METALLURGY'],
    requiredMinerals: ['IRON', 'COAL'],
    effects: { agriculturalYieldBonus: 0.3, militaryPowerBonus: 0.5, metalCrafting: true }
  },
  TECH_HERBAL_MEDICINE: {
    id: 'TECH_HERBAL_MEDICINE',
    name: 'Epidemiological & Herbal Medicine',
    category: 'MEDICINE',
    description: 'Systematic classification of medicinal botanicals and pathogen isolation.',
    prerequisites: ['TECH_POTTERY_WRITING'],
    effects: { sanitationDiseaseReduction: 0.35 }
  },
  TECH_AQUEDUCT_ENGINEERING: {
    id: 'TECH_AQUEDUCT_ENGINEERING',
    name: 'Monumental Aqueducts & Siphon Sanitation',
    category: 'ENERGY_ENGINEERING',
    description: 'Gravity-fed clean water transit preventing waterborne disease plagues.',
    prerequisites: ['TECH_IRRIGATION', 'TECH_BRONZE_METALLURGY'],
    requiredMinerals: ['STONE'],
    effects: { sanitationDiseaseReduction: 0.5, agriculturalYieldBonus: 0.2 }
  },
  TECH_ASTRONOMY_CALENDAR: {
    id: 'TECH_ASTRONOMY_CALENDAR',
    name: 'Celestial Mechanics & Deep-Time Calendars',
    category: 'ASTRONOMY',
    description: 'Precise tracking of planetary orbital cycles, eclipses, and seasonal solstices.',
    prerequisites: ['TECH_POTTERY_WRITING'],
    effects: { astronomyCalculations: true }
  }
};

export function evaluatePolityTechDiscovery(
  polity: Polity,
  territoryTiles: Tile[],
  prng: PRNG,
  year: number
): Technology | null {
  const currentTechs = new Set(polity.discoveredTechIds);

  // Available candidate techs where prerequisites are satisfied
  const candidates: Technology[] = [];
  for (const tech of Object.values(TECH_TREE)) {
    if (currentTechs.has(tech.id)) continue;

    // Check prerequisites
    const hasPrereqs = tech.prerequisites.every(p => currentTechs.has(p));
    if (!hasPrereqs) continue;

    // Check mineral availability in territory
    if (tech.requiredMinerals) {
      const hasMinerals = tech.requiredMinerals.every(m =>
        territoryTiles.some(t => t.minerals[m] > 0.05)
      );
      if (!hasMinerals) continue;
    }

    candidates.push(tech);
  }

  if (candidates.length === 0 || prng.next() > 0.15) {
    return null;
  }

  const discovered = prng.choice(candidates);
  polity.discoveredTechIds.push(discovered.id);
  return discovered;
}
