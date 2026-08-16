// WORLDSEED Preset Library — 18+ Rich Data-Driven Starting Scenarios

import { WorldConfig, WorldPreset, WorldTopology, GenreRuleset, StartingEra } from '../../types/simulation';

export interface PresetDefinition {
  id: WorldPreset;
  name: string;
  category: 'REALISTIC' | 'FANTASY' | 'SCI_FI' | 'WILDCARD';
  tagline: string;
  description: string;
  config: Partial<WorldConfig>;
}

export const WORLDSEED_PRESETS: PresetDefinition[] = [
  // 1. REALISTIC / NATURALISTIC
  {
    id: 'PRIMORDIAL_OCEAN',
    name: 'Primordial Ocean Planet',
    category: 'REALISTIC',
    tagline: 'Archean deep ocean with volcanic islands and hydrothermal vents',
    description: 'An ancient waterworld before continental crust formation. Life thrives exclusively around abyssal hydrothermal vents and shallow sunlit tidal pools.',
    config: {
      seaLevel: 0.75,
      volcanism: 0.65,
      tectonicPlatesCount: 5,
      axialTilt: 18.0,
      initialLifeDiversity: 4,
      sapienceLikelihood: 0.2,
      topology: 'SPHERICAL',
      genre: 'REALISTIC',
      startingEra: 'PREBIOTIC'
    }
  },
  {
    id: 'OXYGENATION_WORLD',
    name: 'The Great Oxygenation',
    category: 'REALISTIC',
    tagline: 'Cyanobacteria blooms transforming planetary chemistry',
    description: 'Photosynthetic algae flood the atmosphere with oxygen, precipitating banded iron formations and triggering catastrophic anaerobic mass extinctions.',
    config: {
      seaLevel: 0.52,
      volcanism: 0.4,
      tectonicPlatesCount: 7,
      axialTilt: 22.0,
      initialLifeDiversity: 6,
      sapienceLikelihood: 0.4,
      topology: 'SPHERICAL',
      genre: 'REALISTIC',
      startingEra: 'MICROBIAL'
    }
  },
  {
    id: 'ADAPTIVE_RADIATION',
    name: 'Cambrian Explosion',
    category: 'REALISTIC',
    tagline: 'Rapid morphological radiation across shallow ocean reefs',
    description: 'The sudden emergence of hard carapaces, compound eyes, predatory claws, and diverse body plans competing across vibrant shallow seas.',
    config: {
      seaLevel: 0.48,
      volcanism: 0.3,
      tectonicPlatesCount: 8,
      axialTilt: 23.5,
      initialLifeDiversity: 8,
      sapienceLikelihood: 0.8,
      topology: 'SPHERICAL',
      genre: 'REALISTIC',
      startingEra: 'COMPLEX_LIFE'
    }
  },
  {
    id: 'ICEHOUSE_PLANET',
    name: 'Cryogenian Snowball Earth',
    category: 'REALISTIC',
    tagline: 'Glacial ice sheets stretching from poles to equatorial seas',
    description: 'Runaway albedo feedback blankets the planet in ice. Life clings to equatorial meltwater leads and geothermal volcanic rifts.',
    config: {
      seaLevel: 0.38,
      volcanism: 0.5,
      tectonicPlatesCount: 9,
      axialTilt: 28.0,
      initialLifeDiversity: 4,
      sapienceLikelihood: 0.5,
      topology: 'SPHERICAL',
      genre: 'REALISTIC',
      startingEra: 'MATURE_BIOSPHERE'
    }
  },
  {
    id: 'GREENHOUSE_PLANET',
    name: 'Carboniferous Super-Jungle',
    category: 'REALISTIC',
    tagline: 'Hyper-oxygenated swamps and giant arthropod forests',
    description: 'Vast warm wetlands and soaring conifer canopies dominate the continents, fostering giant predatory insects and rapid coal bed deposition.',
    config: {
      seaLevel: 0.45,
      volcanism: 0.35,
      tectonicPlatesCount: 8,
      axialTilt: 21.0,
      initialLifeDiversity: 7,
      sapienceLikelihood: 1.0,
      topology: 'SPHERICAL',
      genre: 'REALISTIC',
      startingEra: 'MATURE_BIOSPHERE'
    }
  },
  {
    id: 'SAPIENCE_DAWN_PRESET',
    name: 'The Sapience Threshold',
    category: 'REALISTIC',
    tagline: 'First tool users awakening in savannah river basins',
    description: 'Complex social lineages develop linguistic syntax, fire mastery, and lithic toolkits, beginning the transition from biology to culture.',
    config: {
      seaLevel: 0.42,
      volcanism: 0.3,
      tectonicPlatesCount: 8,
      axialTilt: 23.5,
      initialLifeDiversity: 6,
      sapienceLikelihood: 2.5,
      topology: 'SPHERICAL',
      genre: 'REALISTIC',
      startingEra: 'SAPIENCE_DAWN'
    }
  },
  {
    id: 'FIRST_RIVER_CIVILIZATIONS',
    name: 'Fertile River Empires',
    category: 'REALISTIC',
    tagline: 'Agricultural irrigation, cuneiform tablets, and bronze metallurgy',
    description: 'Dense agrarian settlements arise along major river confluences, domesticating wild beasts, constructing granaries, and establishing codified laws.',
    config: {
      seaLevel: 0.40,
      volcanism: 0.25,
      tectonicPlatesCount: 8,
      axialTilt: 23.5,
      initialLifeDiversity: 6,
      sapienceLikelihood: 2.0,
      topology: 'SPHERICAL',
      genre: 'REALISTIC',
      startingEra: 'FIRST_CITIES'
    }
  },
  {
    id: 'INDUSTRIAL_THRESHOLD',
    name: 'The Coal & Iron Revolution',
    category: 'REALISTIC',
    tagline: 'Fossil extraction, steam locomotives, and massive deforestation',
    description: 'Civilizations discover fossil fuel thermodynamics, rapidly industrializing city foundries at the cost of aggressive environmental scarring.',
    config: {
      seaLevel: 0.40,
      volcanism: 0.25,
      tectonicPlatesCount: 8,
      axialTilt: 23.5,
      initialLifeDiversity: 5,
      sapienceLikelihood: 1.5,
      topology: 'SPHERICAL',
      genre: 'REALISTIC',
      startingEra: 'INDUSTRIAL'
    }
  },

  // 2. FANTASY & SPECULATIVE
  {
    id: 'MANA_TECTONIC_WORLD',
    name: 'Mana Ley-Line Planet',
    category: 'FANTASY',
    tagline: 'Magical fault lines, crystal veins, and arcane biomes',
    description: 'Tectonic plate boundaries radiate raw magical energy. Civilizations build spires over ley nexus points to harness supernatural manipulation.',
    config: {
      seaLevel: 0.42,
      volcanism: 0.45,
      tectonicPlatesCount: 10,
      axialTilt: 24.0,
      initialLifeDiversity: 7,
      sapienceLikelihood: 1.8,
      manaRichness: 0.85,
      topology: 'SPHERICAL',
      genre: 'FANTASY',
      startingEra: 'MATURE_BIOSPHERE'
    }
  },
  {
    id: 'FLOATING_CONTINENTS',
    name: 'The Sky Archipelago',
    category: 'FANTASY',
    tagline: 'Floating islands suspended over an abyss of clouds',
    description: 'Anti-gravitational mineral deposits lift fractured landmasses into the troposphere. Winged and soaring sapient species dominate sky trade.',
    config: {
      seaLevel: 0.35,
      volcanism: 0.55,
      tectonicPlatesCount: 12,
      axialTilt: 15.0,
      initialLifeDiversity: 6,
      sapienceLikelihood: 1.6,
      manaRichness: 0.7,
      topology: 'FLOATING_ISLANDS',
      genre: 'FANTASY',
      startingEra: 'COMPLEX_LIFE'
    }
  },
  {
    id: 'MYTHIC_MEGAFAUNA',
    name: 'Age of Colossal Titans',
    category: 'FANTASY',
    tagline: 'Wandering mountain-sized beasts revered by tribal kingdoms',
    description: 'Enchanted biosphere carrying capacity allows colossal beasts to roam continents. Sapients construct nomadic cities upon titan carapaces.',
    config: {
      seaLevel: 0.44,
      volcanism: 0.3,
      tectonicPlatesCount: 7,
      axialTilt: 23.5,
      initialLifeDiversity: 8,
      sapienceLikelihood: 1.4,
      manaRichness: 0.75,
      topology: 'SPHERICAL',
      genre: 'FANTASY',
      startingEra: 'MATURE_BIOSPHERE'
    }
  },
  {
    id: 'ARCANE_ICE_AGE',
    name: 'The Eternal Frost Blight',
    category: 'FANTASY',
    tagline: 'Magical frost rifts and enchanted hearth sanctuaries',
    description: 'An arcane winter locks the planet in crystalline permafrost. Cultures gather around elemental fire rifts and subterranean catacombs.',
    config: {
      seaLevel: 0.35,
      volcanism: 0.6,
      tectonicPlatesCount: 9,
      axialTilt: 30.0,
      initialLifeDiversity: 5,
      sapienceLikelihood: 1.2,
      manaRichness: 0.8,
      topology: 'SPHERICAL',
      genre: 'FANTASY',
      startingEra: 'FIRST_CITIES'
    }
  },

  // 3. SCIENCE FICTION
  {
    id: 'TIDALLY_LOCKED_EXOPLANET',
    name: 'The Eyeball World',
    category: 'SCI_FI',
    tagline: 'Scorching dayside, frozen nightside, twilight habitable ribbon',
    description: 'A world perpetually facing its parent red dwarf star. Ecosystems and civilizations crowd into the narrow perpetual dusk terminator zone.',
    config: {
      seaLevel: 0.50,
      volcanism: 0.35,
      tectonicPlatesCount: 6,
      axialTilt: 0.0,
      initialLifeDiversity: 5,
      sapienceLikelihood: 1.2,
      topology: 'PLANAR_BOUNDED',
      genre: 'SCI_FI',
      startingEra: 'COMPLEX_LIFE'
    }
  },
  {
    id: 'TERRAFORMING_FRONTIER',
    name: 'Terraforming Project Genesis',
    category: 'SCI_FI',
    tagline: 'Autonomous atmospheric drones seeding synthetic ecology',
    description: 'An ancient automated terraforming array melts glaciers and introduces engineered synthetic microbes onto a barren red terrestrial sphere.',
    config: {
      seaLevel: 0.38,
      volcanism: 0.5,
      tectonicPlatesCount: 7,
      axialTilt: 25.0,
      initialLifeDiversity: 5,
      sapienceLikelihood: 1.0,
      cyberTechLevel: 0.8,
      topology: 'SPHERICAL',
      genre: 'SCI_FI',
      startingEra: 'MICROBIAL'
    }
  },
  {
    id: 'GENERATION_HABITAT',
    name: 'O\'Neill Cylinder Interior',
    category: 'SCI_FI',
    tagline: 'Centrifugal mega-habitat drifting through interstellar void',
    description: 'A 30-kilometer rotating cylindrical megastructure containing miniature engineered biomes, artificial rivers, and evolving enclosed societies.',
    config: {
      seaLevel: 0.30,
      volcanism: 0.1,
      tectonicPlatesCount: 4,
      axialTilt: 0.0,
      initialLifeDiversity: 4,
      sapienceLikelihood: 1.5,
      cyberTechLevel: 0.9,
      topology: 'CYLINDRICAL_HABITAT',
      genre: 'SCI_FI',
      startingEra: 'SPACEFARING'
    }
  },
  {
    id: 'MACHINE_ECOLOGY',
    name: 'The Silicon Biosphere',
    category: 'SCI_FI',
    tagline: 'Self-replicating robotic organisms and digital speciation',
    description: 'Organic life was replaced eons ago by self-repairing autonomous mechanical fauna that undergo Darwinian hardware mutations and energy foraging.',
    config: {
      seaLevel: 0.32,
      volcanism: 0.4,
      tectonicPlatesCount: 8,
      axialTilt: 23.5,
      initialLifeDiversity: 6,
      sapienceLikelihood: 2.0,
      cyberTechLevel: 0.95,
      topology: 'SPHERICAL',
      genre: 'SCI_FI',
      startingEra: 'MATURE_BIOSPHERE'
    }
  },
  {
    id: 'ANCIENT_MEGASTRUCTURE',
    name: 'Ringworld Fracture',
    category: 'SCI_FI',
    tagline: 'Segment of an astronomical ringworld orbiting a yellow star',
    description: 'A monumental ring segment millions of kilometers across. Remnant civilizations occupy decaying automated sub-zones without understanding the machinery.',
    config: {
      seaLevel: 0.40,
      volcanism: 0.2,
      tectonicPlatesCount: 6,
      axialTilt: 0.0,
      initialLifeDiversity: 6,
      sapienceLikelihood: 1.5,
      cyberTechLevel: 0.9,
      topology: 'RINGWORLD_SEGMENT',
      genre: 'SCI_FI',
      startingEra: 'POST_COLLAPSE'
    }
  },

  // 4. WILDCARD
  {
    id: 'SURPRISE_ME',
    name: 'Procedural Wildcard',
    category: 'WILDCARD',
    tagline: 'A unique algorithmic synthesis of exotic topology, genre, and planetary parameters',
    description: 'Generates a completely randomized planet combining unexpected tectonic geometries, axial precessions, and biological conditions.',
    config: {
      preset: 'SURPRISE_ME'
    }
  }
];

export function getPresetConfig(presetId: WorldPreset, seed: number = Date.now()): WorldConfig {
  const def = WORLDSEED_PRESETS.find(p => p.id === presetId) || WORLDSEED_PRESETS[0];
  
  if (presetId === 'SURPRISE_ME') {
    const topologies: WorldTopology[] = ['SPHERICAL', 'PLANAR_BOUNDED', 'TOROIDAL_WRAP', 'FLOATING_ISLANDS', 'RINGWORLD_SEGMENT'];
    const genres: GenreRuleset[] = ['REALISTIC', 'SPECULATIVE_BIO', 'FANTASY', 'SCI_FI', 'SCIENCE_FANTASY'];
    const eras: StartingEra[] = ['PREBIOTIC', 'MICROBIAL', 'COMPLEX_LIFE', 'MATURE_BIOSPHERE', 'SAPIENCE_DAWN', 'FIRST_CITIES'];

    return {
      seed,
      width: 64,
      height: 48,
      preset: 'SURPRISE_ME',
      topology: topologies[Math.floor(Math.random() * topologies.length)],
      genre: genres[Math.floor(Math.random() * genres.length)],
      startingEra: eras[Math.floor(Math.random() * eras.length)],
      seaLevel: 0.3 + Math.random() * 0.4,
      volcanism: 0.1 + Math.random() * 0.6,
      tectonicPlatesCount: 5 + Math.floor(Math.random() * 6),
      axialTilt: Math.floor(Math.random() * 35),
      initialLifeDiversity: 4 + Math.floor(Math.random() * 5),
      sapienceLikelihood: 0.5 + Math.random() * 2.0,
      manaRichness: Math.random() < 0.4 ? 0.7 : 0.0,
      cyberTechLevel: Math.random() < 0.4 ? 0.8 : 0.0
    };
  }

  return {
    seed,
    width: 64,
    height: 48,
    preset: presetId,
    topology: def.config.topology || 'SPHERICAL',
    genre: def.config.genre || 'REALISTIC',
    startingEra: def.config.startingEra || 'PREBIOTIC',
    seaLevel: def.config.seaLevel ?? 0.42,
    volcanism: def.config.volcanism ?? 0.35,
    tectonicPlatesCount: def.config.tectonicPlatesCount ?? 8,
    axialTilt: def.config.axialTilt ?? 23.5,
    initialLifeDiversity: def.config.initialLifeDiversity ?? 5,
    sapienceLikelihood: def.config.sapienceLikelihood ?? 1.0,
    manaRichness: def.config.manaRichness ?? 0.0,
    cyberTechLevel: def.config.cyberTechLevel ?? 0.0
  };
}
