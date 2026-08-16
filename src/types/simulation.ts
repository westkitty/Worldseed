export type WorldViewMode =
  | 'FLAT_ATLAS'
  | 'SQUARE_TILE'
  | 'GLOBE'
  | 'SNOW_GLOBE'
  | 'RELIEF_DIORAMA'
  | 'ORBITAL_VIEW';

export type WorldTopology =
  | 'SPHERICAL'
  | 'PLANAR_BOUNDED'
  | 'TOROIDAL_WRAP'
  | 'FLOATING_ISLANDS'
  | 'RINGWORLD_SEGMENT'
  | 'LAYERED_CAVERNS'
  | 'CYLINDRICAL_HABITAT';

export type GenreRuleset =
  | 'REALISTIC'
  | 'SPECULATIVE_BIO'
  | 'FANTASY'
  | 'SCI_FI'
  | 'SCIENCE_FANTASY';

export type StartingEra =
  | 'PREBIOTIC'
  | 'MICROBIAL'
  | 'COMPLEX_LIFE'
  | 'MATURE_BIOSPHERE'
  | 'SAPIENCE_DAWN'
  | 'FIRST_CITIES'
  | 'MEDIEVAL'
  | 'INDUSTRIAL'
  | 'SPACEFARING'
  | 'POST_COLLAPSE';

export type WorldPreset =
  | 'QUICK'
  | 'DEEP_TIME'
  | 'LARGE'
  | 'PRIMORDIAL_OCEAN'
  | 'OXYGENATION_WORLD'
  | 'ADAPTIVE_RADIATION'
  | 'ICEHOUSE_PLANET'
  | 'GREENHOUSE_PLANET'
  | 'SAPIENCE_DAWN_PRESET'
  | 'FIRST_RIVER_CIVILIZATIONS'
  | 'INDUSTRIAL_THRESHOLD'
  | 'MANA_TECTONIC_WORLD'
  | 'FLOATING_CONTINENTS'
  | 'MYTHIC_MEGAFAUNA'
  | 'ARCANE_ICE_AGE'
  | 'TIDALLY_LOCKED_EXOPLANET'
  | 'TERRAFORMING_FRONTIER'
  | 'GENERATION_HABITAT'
  | 'MACHINE_ECOLOGY'
  | 'ANCIENT_MEGASTRUCTURE'
  | 'SURPRISE_ME';

export interface WorldConfig {
  seed: number;
  width: number;
  height: number;
  preset: WorldPreset;
  topology?: WorldTopology;
  genre?: GenreRuleset;
  startingEra?: StartingEra;
  seaLevel: number; // 0.0 - 1.0 (default ~0.42)
  volcanism: number; // 0.0 - 1.0
  tectonicPlatesCount: number; // 5 - 12
  axialTilt: number; // degrees e.g. 23.5
  initialLifeDiversity: number; // 3 - 8 base lineages
  sapienceLikelihood: number; // multiplier e.g. 1.0
  manaRichness?: number; // 0.0 - 1.0 (Fantasy & Science-Fantasy)
  cyberTechLevel?: number; // 0.0 - 1.0 (Sci-Fi & Science-Fantasy)
}

export type BiomeType =
  | 'DEEP_OCEAN'
  | 'SHALLOW_OCEAN'
  | 'HYDROTHERMAL_RIFT'
  | 'COASTAL_REEF'
  | 'TUNDRA'
  | 'TAIGA'
  | 'TEMPERATE_FOREST'
  | 'TEMPERATE_GRASSLAND'
  | 'TROPICAL_RAINFOREST'
  | 'SAVANNA'
  | 'HOT_DESERT'
  | 'COLD_DESERT'
  | 'WETLAND'
  | 'ALPINE'
  | 'VOLCANIC_BARREN';

export type MineralType =
  | 'STONE'
  | 'CLAY'
  | 'COPPER'
  | 'TIN'
  | 'IRON'
  | 'COAL'
  | 'GOLD'
  | 'OBSIDIAN'
  | 'GEMS'
  | 'RARE_EARTHS';

export interface FossilLayer {
  speciesId: string;
  speciesName: string;
  scientificName: string;
  trophicLevel: string;
  extinctionYear: number;
  geologicalDepthMeters: number; // deeper = older
  mineralizationQuality: number; // 0-1
}

export interface RuinSite {
  id: string;
  settlementId: string;
  originalName: string;
  founderCultureId: string;
  founderSpeciesId: string;
  foundedYear: number;
  collapsedYear: number;
  collapseCause: string;
  prominentStructures: string[];
  excavationLevel: number; // 0 (buried) to 1 (fully exposed)
  artifactsRemaining: string[];
  decayLevel: number; // 0 (fresh) to 1 (bare dust)
  shelteredTroglobites: boolean; // Unique ecological niche surprise!
  associatedMythIds: string[];
}

export interface Tile {
  x: number;
  y: number;
  elevation: number; // -1.0 to 1.0
  plateId: number;
  isWater: boolean;
  waterDepth: number; // 0 to 1
  baseTemp: number; // Celsius
  currentTemp: number; // modulated by season/catastrophes
  moisture: number; // 0 to 1
  rainfall: number; // 0 to 1
  soilFertility: number; // 0 to 1
  soilDepth: number; // meters
  biome: BiomeType;
  riverFlow: number; // 0 to 1 (0 = no river, >0 = river volume)
  riverDirection: number; // angle in rad or neighbor index
  isLake: boolean;
  minerals: Record<MineralType, number>; // 0 to 1 richness
  biomass: number; // 0 to 1000
  carryingCapacity: number;
  vegetationDensity: number;
  pollution: number; // 0 to 1
  erosionLevel: number; // 0 to 1
  environmentalDamage: number; // 0 to 1
  ruins: RuinSite[];
  fossils: FossilLayer[];
  // Population summary in this tile
  populationDensity: number;
  dominantSpeciesId?: string;
  dominantCultureId?: string;
  settlementId?: string;
  polityId?: string;
  activeContagionIds: string[];
  infrastructureLevel: number; // 0 = wild, 1 = trails, 2 = stone roads, 3 = aqueducts
  manaDensity?: number; // 0 to 1 (Fantasy & Ley lines)
  techArtifacts?: number; // 0 to 1 (Sci-Fi ancient machine ruins)
  isEnchanted?: boolean;
}

// Biological & Evolutionary Types
export type TrophicLevel = 'PRODUCER' | 'PRIMARY_CONSUMER' | 'SECONDARY_CONSUMER' | 'APEX_PREDATOR' | 'DECOMPOSER' | 'SCAVENGER';

export type MorphologicalGroup =
  | 'AUTOTROPH_PLANT'
  | 'AUTOTROPH_ALGAE'
  | 'FUNGUS_MYCELIUM'
  | 'INVERTEBRATE_ARTHROPOD'
  | 'INVERTEBRATE_MOLLUSK'
  | 'PISCINE'
  | 'AMPHIBIAN'
  | 'REPTILIAN'
  | 'AVIAN'
  | 'MAMMALIAN'
  | 'EXOTIC_SYMBIONT';

export type SensoryModality = 'OPTIC' | 'ECHOLOCATION' | 'ELECTRORECEPTION' | 'OLFACTORY' | 'VIBRATIONAL' | 'THERMAL';

export type ManipulationOrgan = 'OPPOSABLE_DIGITS' | 'PREHENSILE_TENTACLES' | 'MANDIBLES' | 'BEAK_TONGUE' | 'PSEUDOPODS' | 'TRUNK_PROBOSCIS';

export type LocomotionType = 'SESSILE' | 'SWIMMING' | 'CRAWLING' | 'QUADRUPEDAL' | 'BIPEDAL' | 'GLIDING' | 'WINGED_FLIGHT' | 'BURROWING';

export interface Genome {
  bodySizeMeters: number; // 0.001 to 20.0
  speedKmh: number;
  lifespanYears: number; // 0.1 to 300
  metabolismRate: number; // 0.1 to 2.0
  energyStorage: number; // 0 to 1
  fertility: number; // reproduction chance per cycle
  offspringCount: number; // 1 to 500
  maturationYears: number; // 0.1 to 30
  preferredTemp: number; // Celsius
  tempTolerance: number; // +/- tolerance
  moistureTolerance: number; // 0 to 1
  preferredElevation: number; // -1 to 1
  armor: number; // 0 to 1
  camouflage: number; // 0 to 1
  aggression: number; // 0 to 1
  socialTendency: number; // 0 = solitary, 1 = eusocial/pack
  mobility: number; // 0 to 1
  migrationTendency: number; // 0 to 1
  diseaseResistance: number; // 0 to 1
  mutationRate: number; // 0.01 to 0.15
  cognition: number; // 0 to 100
  sensoryRange: number; // 0 to 1
  sensoryModality: SensoryModality;
  manipulationOrgan: ManipulationOrgan;
  locomotion: LocomotionType;
}

export interface Species {
  id: string;
  commonName: string;
  scientificName: string;
  culturalNames: Record<string, string>; // cultureId -> name
  morphology: MorphologicalGroup;
  trophicLevel: TrophicLevel;
  diet: string[]; // dietary food sources
  genome: Genome;
  parentSpeciesId: string | null;
  divergenceYear: number;
  originTile: { x: number; y: number };
  isSapient: boolean;
  sapienceEmergenceYear?: number;
  isDomesticated: boolean;
  domesticatedByCultureId?: string;
  ancestorWildSpeciesId?: string;
  isFeral: boolean; // domesticated lineage escaped into wild!
  isExtinct: boolean;
  extinctionYear?: number;
  extinctionCause?: string;
  totalPopulation: number;
  totalBiomass: number;
  colorHex: string;
  iconSymbol: string;
  causalNodeId: string;
}

// Tile population record
export interface PopulationCluster {
  speciesId: string;
  count: number;
  health: number; // 0 to 1
  adaptation: number; // local adaptation fitness 0 to 1
}

// Language Types
export interface Language {
  id: string;
  name: string;
  familyId: string;
  parentLanguageId: string | null;
  originYear: number;
  phonemes: {
    consonants: string[];
    vowels: string[];
    syllablePatterns: string[]; // e.g. "CV", "CVC", "VCC"
  };
  vocabulary: Record<string, string>; // semanticConcept -> word
  grammarType: 'SOV' | 'SVO' | 'VSO';
  causalNodeId: string;
}

// Culture Types
export type BurialPractice = 'EARTHEN_TUMULUS' | 'SKY_BURIAL' | 'DEEP_CATACOMB' | 'CREMATION_PYRE' | 'OCEAN_CAIRN' | 'PEAT_BOG_SACRIFICE' | 'TREE_COFFIN';
export type ArchitectureTendency = 'MONOLITHIC_STONE' | 'ORGANIC_CHITIN_HIVE' | 'RIVER_CLAY_BRICK' | 'HEWN_TIMBER' | 'CLIFF_CARVED' | 'LIVING_VINE_BOWER' | 'SUBTERRANEAN_VAULT';
export type KinshipStructure = 'MATRILINEAL_CLAN' | 'PATRILINEAL_LINEAGE' | 'COMMUNAL_NURSERY' | 'BAND_EGALITARIAN' | 'ELDERS_COUNCIL' | 'CASTE_SPECIALIST';

export interface Culture {
  id: string;
  name: string;
  speciesId: string;
  languageId: string;
  originYear: number;
  kinship: KinshipStructure;
  burial: BurialPractice;
  architecture: ArchitectureTendency;
  values: {
    ecologicalHarmony: number; // 0 = exploit, 1 = venerate
    expansionism: number; // 0 = insular, 1 = imperial
    scholarlyPursuit: number; // 0 = traditional, 1 = empirical
    martialHonor: number; // 0 = pacifist, 1 = militarist
    commercialTrade: number; // 0 = autarkic, 1 = mercantile
  };
  sacredSpeciesIds: string[]; // species venerated in myths or taboos
  sacredGeographicFeatures: string[]; // names of rivers/mountains/craters
  tabooDiets: string[];
  colorHex: string;
  causalNodeId: string;
}

// Settlement & Civilization Types
export interface Settlement {
  id: string;
  name: string;
  originalLanguageName: string;
  tileX: number;
  tileY: number;
  foundedYear: number;
  population: number;
  speciesId: string;
  cultureId: string;
  polityId: string;
  tier: 'CAMP' | 'HAMLET' | 'VILLAGE' | 'TOWN' | 'CITY' | 'METROPOLIS';
  infrastructure: {
    hasWalls: boolean;
    hasGranary: boolean;
    hasHarbor: boolean;
    hasLibrary: boolean;
    hasAqueduct: boolean;
    hasSanitation: boolean;
    hasTemple: boolean;
    hasFoundry: boolean;
  };
  foodSupplyDays: number;
  waterSupply: number;
  producedResources: MineralType[];
  isAbandoned: boolean;
  abandonmentYear?: number;
  abandonmentCause?: string;
  causalNodeId: string;
}

export interface Polity {
  id: string;
  name: string;
  governmentType: 'TRIBAL_CONFEDERACY' | 'SACRED_THEOCRACY' | 'MERCHANT_LEAGUE' | 'EXPANSIONIST_EMPIRE' | 'SCHOLASTIC_SYNDICATE' | 'COMMUNAL_COUNCIL';
  primarySpeciesId: string;
  primaryCultureId: string;
  capitalSettlementId: string;
  foundedYear: number;
  isExtinct: boolean;
  dissolvedYear?: number;
  dissolutionCause?: string;
  territoryTileIndices: number[]; // spatial ownership
  allies: string[]; // polity IDs
  rivals: string[]; // polity IDs
  activeWars: Array<{ enemyPolityId: string; startYear: number; reason: string }>;
  discoveredTechIds: string[];
  colorHex: string;
  causalNodeId: string;
}

// Technology Types
export interface Technology {
  id: string;
  name: string;
  category: 'FOOD_PRODUCTION' | 'MATERIALS' | 'TRANSPORT' | 'MEDICINE' | 'NAVIGATION' | 'METALLURGY' | 'WRITING_RECORDS' | 'ASTRONOMY' | 'ENERGY_ENGINEERING';
  description: string;
  prerequisites: string[]; // tech IDs
  requiredMinerals?: MineralType[];
  requiredBiome?: BiomeType[];
  requiredManipulation?: ManipulationOrgan[];
  effects: {
    agriculturalYieldBonus?: number;
    sanitationDiseaseReduction?: number;
    navigationSpeedBonus?: number;
    militaryPowerBonus?: number;
    metalCrafting?: boolean;
    durableWriting?: boolean;
    astronomyCalculations?: boolean;
  };
}

// Disease & Epidemiology Types
export type PathogenType = 'VIRAL' | 'BACTERIAL' | 'FUNGAL_SPORE' | 'PARASITIC' | 'ZOONOTIC_PRION';
export type TransmissionMode = 'AIRBORNE' | 'WATERBORNE' | 'VECTOR_INSECT' | 'DIRECT_CONTACT';

export interface Pathogen {
  id: string;
  name: string;
  type: PathogenType;
  transmission: TransmissionMode;
  originYear: number;
  originTile: { x: number; y: number };
  reservoirSpeciesId: string;
  crossSpeciesHostIds: string[];
  virulence: number; // R0 base
  lethality: number; // 0 to 1 mortality rate
  incubationDays: number;
  environmentalPersistence: number;
  mutationCount: number;
  totalCasualtiesHistorical: number;
  isActive: boolean;
  causalNodeId: string;
}

// Myth & Cultural Memory Types
export interface CulturalMyth {
  id: string;
  title: string;
  cultureId: string;
  narrativeText: string;
  distortedEventId: string; // The genuine historical event ID it stems from!
  trueHistoricalOrigin: string; // Factual explanation
  distortionLevel: number; // 0 (eyewitness) to 1.0 (fantastical legend)
  symbolicMeaning: string;
  associatedSpeciesId?: string; // e.g. Extinct megafauna remembered as dragon/demon
  associatedLocation?: { x: number; y: number; name: string };
  creationYear: number;
  causalNodeId: string;
}

// Causal Graph Engine ("WHY?" System)
export interface CausalLink {
  targetId: string;
  targetType: 'SPECIES' | 'SETTLEMENT' | 'POLITY' | 'WAR' | 'EXTINCTION' | 'MYTH' | 'DISEASE' | 'CLIMATE_EVENT' | 'TECH_DISCOVERY' | 'RUIN' | 'INTERVENTION';
  relationship: 'CAUSED_BY' | 'LED_TO' | 'ACCELERATED_BY' | 'INFLUENCED_BY' | 'DOMESTICATED_FROM' | 'COLLAPSED_DUE_TO' | 'PRESERVED_MEMORY_OF';
  description: string;
}

export interface CausalNode {
  id: string;
  title: string;
  entityType: string;
  entityId: string;
  yearOccurred: number;
  summary: string;
  incomingCauses: CausalLink[];
  outgoingConsequences: CausalLink[];
}

// Historical Chronicle & Eras
export interface HistoricalEvent {
  id: string;
  year: number;
  title: string;
  description: string;
  category:
    | 'BIOSPHERE_GENESIS'
    | 'SPECIATION'
    | 'EXTINCTION'
    | 'SAPIENCE_EMERGENCE'
    | 'SETTLEMENT_FOUNDED'
    | 'DOMESTICATION'
    | 'WAR_DECLARED'
    | 'PEACE_TREATY'
    | 'PLAGUE_OUTBREAK'
    | 'POLITY_COLLAPSE'
    | 'CATASTROPHE'
    | 'DISCOVERY_ARCHAEOLOGY'
    | 'TECH_BREAKTHROUGH'
    | 'MYTH_BORN'
    | 'DIVINE_INTERVENTION';
  importance: 1 | 2 | 3 | 4 | 5; // 5 = Epoch defining
  tileCoordinates?: { x: number; y: number };
  relatedEntityIds: string[];
  causalNodeId: string;
}

export interface Era {
  id: string;
  name: string;
  startYear: number;
  endYear: number | null;
  dominantTheme: string;
  description: string;
  keyEventsCount: number;
}

// Emergent Discovery System (10+ Substantial Surprises)
export interface Discovery {
  id: string;
  discoveryKey: string;
  title: string;
  category: string;
  yearDiscovered: number;
  description: string;
  causalExplanation: string;
  involvedEntityIds: string[];
  tileLocation?: { x: number; y: number };
  isInspected: boolean;
}

// Alternate History Branch
export interface HistoryBranch {
  id: string;
  name: string;
  parentBranchId: string | null;
  forkYear: number;
  interventionsApplied: Array<{
    year: number;
    type: string;
    description: string;
  }>;
  snapshotState?: any;
}

// Complete Simulation State for Engine & Persistence
export interface WorldState {
  config: WorldConfig;
  currentYear: number;
  ticks: number;
  isPaused: boolean;
  simulationSpeed: number; // 1, 5, 20, 100, 1000
  grid: Tile[][];
  species: Record<string, Species>;
  languages: Record<string, Language>;
  cultures: Record<string, Culture>;
  settlements: Record<string, Settlement>;
  polities: Record<string, Polity>;
  technologies: Record<string, Technology>;
  pathogens: Record<string, Pathogen>;
  myths: Record<string, CulturalMyth>;
  ruins: Record<string, RuinSite>;
  causalGraph: Record<string, CausalNode>;
  events: HistoricalEvent[];
  eras: Era[];
  discoveries: Discovery[];
  currentBranchId: string;
  branches: Record<string, HistoryBranch>;
  // Global statistical counters
  stats: {
    totalExtinctions: number;
    totalSpeciations: number;
    peakSapientPopulation: number;
    globalAvgTemperature: number;
    forestCoverPercentage: number;
    totalBiomass: number;
  };
}

// Inspector Selection
export type SelectionType = 'TILE' | 'SPECIES' | 'SETTLEMENT' | 'POLITY' | 'CULTURE' | 'LANGUAGE' | 'RUIN' | 'MYTH' | 'DISEASE' | 'EVENT';

export interface InspectionSelection {
  type: SelectionType;
  id: string;
  secondaryId?: string;
}
