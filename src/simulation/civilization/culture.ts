// Procedural Culture Generation, Kinship, Sacred Species, and Values

import { PRNG } from '../math/prng';
import {
  ArchitectureTendency,
  BurialPractice,
  Culture,
  KinshipStructure,
  Language,
  Species
} from '../../types/simulation';

const BURIAL_PRACTICES: BurialPractice[] = [
  'EARTHEN_TUMULUS', 'SKY_BURIAL', 'DEEP_CATACOMB',
  'CREMATION_PYRE', 'OCEAN_CAIRN', 'PEAT_BOG_SACRIFICE', 'TREE_COFFIN'
];

const ARCHITECTURE_STYLES: ArchitectureTendency[] = [
  'MONOLITHIC_STONE', 'ORGANIC_CHITIN_HIVE', 'RIVER_CLAY_BRICK',
  'HEWN_TIMBER', 'CLIFF_CARVED', 'LIVING_VINE_BOWER', 'SUBTERRANEAN_VAULT'
];

const KINSHIP_TYPES: KinshipStructure[] = [
  'MATRILINEAL_CLAN', 'PATRILINEAL_LINEAGE', 'COMMUNAL_NURSERY',
  'BAND_EGALITARIAN', 'ELDERS_COUNCIL', 'CASTE_SPECIALIST'
];

export function generateCulture(
  id: string,
  species: Species,
  language: Language,
  livingSpecies: Species[],
  year: number,
  prng: PRNG
): Culture {
  // Pick sacred species from living biosphere
  const sacredSpeciesIds: string[] = [];
  if (livingSpecies.length > 0) {
    const candidates = livingSpecies.filter(s => s.id !== species.id);
    if (candidates.length > 0) {
      sacredSpeciesIds.push(prng.choice(candidates).id);
    }
  }

  // Culture name derived from language roots
  const v = language.vocabulary;
  const cName = `${v['great'] || 'Val'}${v['clan'] || 'dor'}`;
  const formattedName = cName.charAt(0).toUpperCase() + cName.slice(1);

  const colors = [
    '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6', '#10b981',
    '#ef4444', '#06b6d4', '#84cc16', '#d946ef', '#14b8a6'
  ];

  // Select architectural style based on anatomy/morphology
  let arch: ArchitectureTendency = prng.choice(ARCHITECTURE_STYLES);
  if (species.morphology === 'INVERTEBRATE_ARTHROPOD') {
    arch = 'ORGANIC_CHITIN_HIVE';
  } else if (species.morphology === 'AVIAN') {
    arch = 'CLIFF_CARVED';
  }

  return {
    id,
    name: `${formattedName} Culture`,
    speciesId: species.id,
    languageId: language.id,
    originYear: year,
    kinship: prng.choice(KINSHIP_TYPES),
    burial: prng.choice(BURIAL_PRACTICES),
    architecture: arch,
    values: {
      ecologicalHarmony: Math.round(prng.float(0.1, 0.95) * 100) / 100,
      expansionism: Math.round(prng.float(0.1, 0.95) * 100) / 100,
      scholarlyPursuit: Math.round(prng.float(0.1, 0.95) * 100) / 100,
      martialHonor: Math.round(prng.float(0.1, 0.95) * 100) / 100,
      commercialTrade: Math.round(prng.float(0.1, 0.95) * 100) / 100
    },
    sacredSpeciesIds,
    sacredGeographicFeatures: ['The Sunward Peak', 'The Whispering Basin', 'The Sacred Gorge'],
    tabooDiets: ['Carnivore Marrow', 'Sacred Spores'],
    colorHex: prng.choice(colors),
    causalNodeId: `cause_cult_${id}`
  };
}
