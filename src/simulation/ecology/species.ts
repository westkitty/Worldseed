// Species generation, binomial nomenclature, morphology, and genomes

import { PRNG } from '../math/prng';
import {
  Genome,
  MorphologicalGroup,
  Species,
  TrophicLevel,
  SensoryModality,
  ManipulationOrgan,
  LocomotionType
} from '../../types/simulation';

// Latin genus prefixes & specific epithets
const GENUS_PREFIXES = [
  'Thalasso', 'Dendro', 'Pyro', 'Chrono', 'Geo', 'Aero', 'Myco', 'Entomo',
  'Osteo', 'Pachy', 'Steno', 'Macro', 'Micro', 'Paleo', 'Crypto', 'Hydro',
  'Xero', 'Rhizo', 'Spiro', 'Platy', 'Arthro', 'Lophoc', 'Titanoc', 'Nycto'
];

const GENUS_SUFFIXES = [
  'coris', 'phytum', 'cetus', 'therium', 'dromus', 'gaster', 'pteryx', 'myces',
  'scelis', 'soma', 'stoma', 'chelys', 'draco', 'nautis', 'rhynchus', 'gnathus'
];

const SPECIES_EPITHETS = [
  'velox', 'grandis', 'socialis', 'borealis', 'australis', 'communis', 'vulgaris',
  'elegans', 'robustus', 'sylvestris', 'abyssalis', 'montanus', 'fragilis', 'altus',
  'nocturnus', 'ferox', 'subtilis', 'caeruleus', 'auratus', 'lividus', 'armatus'
];

const COMMON_ROOTS = [
  'Reed', 'Fern', 'Oak', 'Moss', 'Kelp', 'Spore', 'Lichen', 'Bloom',
  'Crawler', 'Beetle', 'Mantis', 'Scorpion', 'Clam', 'Nautilus', 'Eel', 'Ray',
  'Lizard', 'Drake', 'Tortoise', 'Stalker', 'Hawk', 'Gull', 'Strider', 'Hare',
  'Boar', 'Wolf', 'Bison', 'Mastodon', 'Ape', 'Serpent', 'Otter', 'Fox'
];

const COMMON_MODIFIERS = [
  'Great', 'Lesser', 'Spotted', 'Spiny', 'Horned', 'Silken', 'Crested', 'Striped',
  'River', 'Cliff', 'Deep-Trench', 'Sun-Loving', 'Shadow', 'Frost', 'Iron-Shelled',
  'Wandering', 'Singing', 'Armored', 'Emerald', 'Golden', 'Swift', 'Giant', 'Pygmy'
];

export function generateSpeciesName(
  morphology: MorphologicalGroup,
  trophic: TrophicLevel,
  prng: PRNG
): { scientificName: string; commonName: string } {
  const genus = prng.choice(GENUS_PREFIXES) + prng.choice(GENUS_SUFFIXES);
  const epithet = prng.choice(SPECIES_EPITHETS);
  const scientificName = `${genus} ${epithet}`;

  const mod = prng.choice(COMMON_MODIFIERS);
  const root = prng.choice(COMMON_ROOTS);
  const commonName = `${mod} ${root}`;

  return { scientificName, commonName };
}

export function generatePrimordialGenome(
  morphology: MorphologicalGroup,
  trophic: TrophicLevel,
  prng: PRNG
): Genome {
  let bodySize = 0.5; // meters
  let locomotion: LocomotionType = 'SWIMMING';
  let sensory: SensoryModality = 'OPTIC';
  let manipulation: ManipulationOrgan = 'BEAK_TONGUE';
  let cognition = prng.float(5, 25);
  let lifespan = prng.float(1, 20);

  switch (morphology) {
    case 'AUTOTROPH_PLANT':
    case 'AUTOTROPH_ALGAE':
      bodySize = prng.float(0.01, 15.0);
      locomotion = 'SESSILE';
      sensory = 'THERMAL';
      manipulation = 'BEAK_TONGUE';
      cognition = 0;
      lifespan = prng.float(1, 200);
      break;
    case 'FUNGUS_MYCELIUM':
      bodySize = prng.float(0.1, 5.0);
      locomotion = 'SESSILE';
      sensory = 'OLFACTORY';
      manipulation = 'PSEUDOPODS';
      cognition = prng.float(0, 10);
      lifespan = prng.float(2, 500);
      break;
    case 'INVERTEBRATE_ARTHROPOD':
    case 'INVERTEBRATE_MOLLUSK':
      bodySize = prng.float(0.02, 1.2);
      locomotion = prng.choice(['CRAWLING', 'SWIMMING', 'BURROWING']);
      sensory = prng.choice(['OPTIC', 'OLFACTORY', 'VIBRATIONAL']);
      manipulation = prng.choice(['MANDIBLES', 'PREHENSILE_TENTACLES']);
      cognition = prng.float(10, 35);
      lifespan = prng.float(0.5, 10);
      break;
    case 'PISCINE':
      bodySize = prng.float(0.1, 4.0);
      locomotion = 'SWIMMING';
      sensory = prng.choice(['OPTIC', 'ELECTRORECEPTION', 'VIBRATIONAL']);
      manipulation = 'BEAK_TONGUE';
      cognition = prng.float(15, 40);
      lifespan = prng.float(2, 25);
      break;
    case 'AMPHIBIAN':
    case 'REPTILIAN':
      bodySize = prng.float(0.2, 5.0);
      locomotion = prng.choice(['QUADRUPEDAL', 'CRAWLING', 'SWIMMING']);
      sensory = prng.choice(['OPTIC', 'THERMAL', 'OLFACTORY']);
      manipulation = prng.choice(['BEAK_TONGUE', 'OPPOSABLE_DIGITS']);
      cognition = prng.float(20, 50);
      lifespan = prng.float(5, 60);
      break;
    case 'AVIAN':
      bodySize = prng.float(0.1, 2.5);
      locomotion = 'WINGED_FLIGHT';
      sensory = 'OPTIC';
      manipulation = 'BEAK_TONGUE';
      cognition = prng.float(30, 65);
      lifespan = prng.float(3, 35);
      break;
    case 'MAMMALIAN':
    case 'EXOTIC_SYMBIONT':
      bodySize = prng.float(0.3, 6.0);
      locomotion = prng.choice(['QUADRUPEDAL', 'BIPEDAL', 'SWIMMING']);
      sensory = prng.choice(['OPTIC', 'OLFACTORY', 'ECHOLOCATION']);
      manipulation = prng.choice(['OPPOSABLE_DIGITS', 'PREHENSILE_TENTACLES', 'TRUNK_PROBOSCIS']);
      cognition = prng.float(35, 70);
      lifespan = prng.float(10, 80);
      break;
  }

  const colors = [
    '#22c55e', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6',
    '#ec4899', '#f97316', '#eab308', '#84cc16', '#14b8a6'
  ];

  return {
    bodySizeMeters: Math.round(bodySize * 100) / 100,
    speedKmh: Math.round(prng.float(1, 45) * 10) / 10,
    lifespanYears: Math.round(lifespan * 10) / 10,
    metabolismRate: Math.round(prng.float(0.5, 1.5) * 100) / 100,
    energyStorage: Math.round(prng.float(0.2, 0.9) * 100) / 100,
    fertility: Math.round(prng.float(0.2, 0.8) * 100) / 100,
    offspringCount: prng.int(1, 12),
    maturationYears: Math.round(prng.float(0.5, 8.0) * 10) / 10,
    preferredTemp: prng.int(-5, 28),
    tempTolerance: prng.int(8, 22),
    moistureTolerance: Math.round(prng.float(0.2, 0.8) * 100) / 100,
    preferredElevation: prng.float(-0.5, 0.5),
    armor: Math.round(prng.float(0, 0.7) * 100) / 100,
    camouflage: Math.round(prng.float(0.1, 0.8) * 100) / 100,
    aggression: Math.round(prng.float(0.1, 0.9) * 100) / 100,
    socialTendency: Math.round(prng.float(0.1, 0.9) * 100) / 100,
    mobility: Math.round(prng.float(0.1, 0.9) * 100) / 100,
    migrationTendency: Math.round(prng.float(0.1, 0.8) * 100) / 100,
    diseaseResistance: Math.round(prng.float(0.3, 0.85) * 100) / 100,
    mutationRate: Math.round(prng.float(0.02, 0.08) * 1000) / 1000,
    cognition: Math.round(cognition * 10) / 10,
    sensoryRange: Math.round(prng.float(0.2, 0.9) * 100) / 100,
    sensoryModality: sensory,
    manipulationOrgan: manipulation,
    locomotion
  };
}

export function createSpecies(
  id: string,
  morphology: MorphologicalGroup,
  trophic: TrophicLevel,
  parentSpeciesId: string | null,
  year: number,
  originTile: { x: number; y: number },
  prng: PRNG,
  inheritedGenome?: Genome
): Species {
  const { scientificName, commonName } = generateSpeciesName(morphology, trophic, prng);
  const genome = inheritedGenome ? mutateGenome(inheritedGenome, prng) : generatePrimordialGenome(morphology, trophic, prng);

  const colors = [
    '#4ade80', '#2dd4bf', '#38bdf8', '#818cf8', '#c084fc',
    '#f472b6', '#fb923c', '#facc15', '#a3e635', '#34d399'
  ];

  return {
    id,
    commonName,
    scientificName,
    culturalNames: {},
    morphology,
    trophicLevel: trophic,
    diet: getDietaryRequirements(trophic),
    genome,
    parentSpeciesId,
    divergenceYear: year,
    originTile,
    isSapient: false,
    isDomesticated: false,
    isFeral: false,
    isExtinct: false,
    totalPopulation: 1000,
    totalBiomass: 1000 * genome.bodySizeMeters,
    colorHex: prng.choice(colors),
    iconSymbol: getSpeciesIcon(morphology),
    causalNodeId: `cause_spec_${id}`
  };
}

export function mutateGenome(parent: Genome, prng: PRNG): Genome {
  const rate = parent.mutationRate;
  const mutate = (val: number, delta: number, min: number, max: number): number => {
    if (prng.next() < 0.3) {
      const change = prng.gaussian(0, delta);
      return Math.max(min, Math.min(max, val + change));
    }
    return val;
  };

  return {
    ...parent,
    bodySizeMeters: Math.round(mutate(parent.bodySizeMeters, 0.2 * parent.bodySizeMeters, 0.001, 30.0) * 100) / 100,
    speedKmh: Math.round(mutate(parent.speedKmh, 3.0, 0.5, 90.0) * 10) / 10,
    lifespanYears: Math.round(mutate(parent.lifespanYears, 2.0, 0.1, 500) * 10) / 10,
    metabolismRate: Math.round(mutate(parent.metabolismRate, 0.1, 0.1, 3.0) * 100) / 100,
    fertility: Math.round(mutate(parent.fertility, 0.05, 0.05, 0.95) * 100) / 100,
    offspringCount: Math.round(mutate(parent.offspringCount, 1, 1, 500)),
    preferredTemp: Math.round(mutate(parent.preferredTemp, 2.0, -30, 45)),
    tempTolerance: Math.round(mutate(parent.tempTolerance, 1.5, 4, 30)),
    moistureTolerance: Math.round(mutate(parent.moistureTolerance, 0.05, 0.05, 1.0) * 100) / 100,
    armor: Math.round(mutate(parent.armor, 0.05, 0, 1.0) * 100) / 100,
    camouflage: Math.round(mutate(parent.camouflage, 0.05, 0, 1.0) * 100) / 100,
    aggression: Math.round(mutate(parent.aggression, 0.05, 0, 1.0) * 100) / 100,
    socialTendency: Math.round(mutate(parent.socialTendency, 0.05, 0, 1.0) * 100) / 100,
    mobility: Math.round(mutate(parent.mobility, 0.05, 0, 1.0) * 100) / 100,
    diseaseResistance: Math.round(mutate(parent.diseaseResistance, 0.04, 0.1, 0.99) * 100) / 100,
    cognition: Math.round(mutate(parent.cognition, 2.5, 0, 100) * 10) / 10
  };
}

function getDietaryRequirements(trophic: TrophicLevel): string[] {
  switch (trophic) {
    case 'PRODUCER': return ['Sunlight', 'Soil Minerals', 'Freshwater'];
    case 'PRIMARY_CONSUMER': return ['Vegetation', 'Seeds', 'Foliage', 'Algae'];
    case 'SECONDARY_CONSUMER': return ['Insects', 'Herbivores', 'Fish'];
    case 'APEX_PREDATOR': return ['Large Herbivores', 'Secondary Predators'];
    case 'DECOMPOSER': return ['Dead Biomass', 'Detritus', 'Fallen Timber'];
    case 'SCAVENGER': return ['Carrion', 'Bone Marrow', 'Organic Scraps'];
  }
}

function getSpeciesIcon(morphology: MorphologicalGroup): string {
  switch (morphology) {
    case 'AUTOTROPH_PLANT': return '🌿';
    case 'AUTOTROPH_ALGAE': return '🫧';
    case 'FUNGUS_MYCELIUM': return '🍄';
    case 'INVERTEBRATE_ARTHROPOD': return '🦗';
    case 'INVERTEBRATE_MOLLUSK': return '🐚';
    case 'PISCINE': return '🐟';
    case 'AMPHIBIAN': return '🐸';
    case 'REPTILIAN': return '🦎';
    case 'AVIAN': return '🦅';
    case 'MAMMALIAN': return '🐺';
    case 'EXOTIC_SYMBIONT': return '✨';
  }
}
