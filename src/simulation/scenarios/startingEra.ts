// WORLDSEED — Starting-era bootstrap
//
// A named starting era is a promise about the state of the world, not a label. This module
// keeps that promise by:
//   1. running real deterministic simulation from year 0, so geology, climate, ancestry and
//      the causal graph are genuinely produced rather than asserted; then
//   2. consolidating the era's defining structures (sapience, cities, technology, ruins,
//      fossils, industrial scarring, collapse) using the same entity factories the live
//      simulation uses, each with a dated historical event and causal links; then
//   3. running a further settling period so the consolidated world has actually been
//      simulated forward and its derived state (territories, myths, populations, disease)
//      is emergent rather than hand-placed.
//
// Everything here draws from the engine's own PRNG, so a seed always produces the same
// starting world and save/load determinism is unaffected.

import { PRNG } from '../math/prng';
import {
  FossilLayer,
  HistoricalEvent,
  Settlement,
  StartingEra,
  WorldState
} from '../../types/simulation';
import { generateLanguage } from '../civilization/language';
import { generateCulture } from '../civilization/culture';
import { createSettlement, findOptimalSettlementLocation } from '../civilization/settlement';
import { createPolity } from '../civilization/politics';
import { createRuinFromSettlement } from '../civilization/ruins';
import { TECH_TREE } from '../civilization/technology';
import { CausalityEngine } from '../history/causality';

export interface EraProfile {
  id: StartingEra;
  /** Human-facing summary of what the era guarantees. Shown in the world wizard. */
  summary: string;
  /** Deterministic history simulated before consolidation. */
  simulatedYears: number;
  /** Further simulated years after consolidation, so the era state is lived-in. */
  settleYears: number;
  requiresSapience: boolean;
  /** Living settlements the era should have. */
  settlements: number;
  /** Settlements founded and lost before the start date. */
  predecessorRuins: number;
  /** Population of the largest settlement at the start. */
  flagshipPopulation: number;
  /** How deep into the technology graph the leading polity has reached. */
  techDepth: number;
  /** Baseline worked-land level radiating from settlements. */
  infrastructure: number;
  /** Industrial-scale environmental load, 0..1. */
  industrialLoad: number;
  /** Whether the era begins after a civilisation-wide collapse. */
  collapsed: boolean;
}

export const ERA_PROFILES: Record<StartingEra, EraProfile> = {
  PREBIOTIC: {
    id: 'PREBIOTIC',
    summary: 'A sterile, freshly cooled planet. No biosphere yet — you watch life begin.',
    simulatedYears: 0,
    settleYears: 0,
    requiresSapience: false,
    settlements: 0,
    predecessorRuins: 0,
    flagshipPopulation: 0,
    techDepth: 0,
    infrastructure: 0,
    industrialLoad: 0,
    collapsed: false
  },
  MICROBIAL: {
    id: 'MICROBIAL',
    summary: 'Single-celled and colonial life has taken hold; oxygen is beginning to accumulate.',
    simulatedYears: 180,
    settleYears: 20,
    requiresSapience: false,
    settlements: 0,
    predecessorRuins: 0,
    flagshipPopulation: 0,
    techDepth: 0,
    infrastructure: 0,
    industrialLoad: 0,
    collapsed: false
  },
  COMPLEX_LIFE: {
    id: 'COMPLEX_LIFE',
    summary: 'Multicellular body plans have radiated across seas and shorelines.',
    simulatedYears: 620,
    settleYears: 40,
    requiresSapience: false,
    settlements: 0,
    predecessorRuins: 0,
    flagshipPopulation: 0,
    techDepth: 0,
    infrastructure: 0,
    industrialLoad: 0,
    collapsed: false
  },
  MATURE_BIOSPHERE: {
    id: 'MATURE_BIOSPHERE',
    summary: 'Deep food webs, megafauna and layered fossil strata — but no minds yet.',
    simulatedYears: 1450,
    settleYears: 60,
    requiresSapience: false,
    settlements: 0,
    predecessorRuins: 0,
    flagshipPopulation: 0,
    techDepth: 0,
    infrastructure: 0,
    industrialLoad: 0,
    collapsed: false
  },
  SAPIENCE_DAWN: {
    id: 'SAPIENCE_DAWN',
    summary: 'A lineage has crossed into symbolic thought. Fire, language and the first camps.',
    simulatedYears: 1700,
    settleYears: 80,
    requiresSapience: true,
    settlements: 1,
    predecessorRuins: 0,
    flagshipPopulation: 320,
    techDepth: 1,
    infrastructure: 1,
    industrialLoad: 0,
    collapsed: false
  },
  FIRST_CITIES: {
    id: 'FIRST_CITIES',
    summary: 'River-valley city-states with granaries, writing and irrigated floodplains.',
    simulatedYears: 1900,
    settleYears: 120,
    requiresSapience: true,
    settlements: 3,
    predecessorRuins: 1,
    flagshipPopulation: 4200,
    techDepth: 3,
    infrastructure: 2,
    industrialLoad: 0.04,
    collapsed: false
  },
  MEDIEVAL: {
    id: 'MEDIEVAL',
    summary: 'Walled cities, iron, long trade roads and the ruins of an earlier age underfoot.',
    simulatedYears: 2100,
    settleYears: 160,
    requiresSapience: true,
    settlements: 5,
    predecessorRuins: 2,
    flagshipPopulation: 16000,
    techDepth: 6,
    infrastructure: 2,
    industrialLoad: 0.1,
    collapsed: false
  },
  INDUSTRIAL: {
    id: 'INDUSTRIAL',
    summary: 'Coal, foundries and rail. Population surges while the biosphere starts to pay.',
    simulatedYears: 2200,
    settleYears: 180,
    requiresSapience: true,
    settlements: 7,
    predecessorRuins: 3,
    flagshipPopulation: 90000,
    techDepth: 9,
    infrastructure: 3,
    industrialLoad: 0.42,
    collapsed: false
  },
  SPACEFARING: {
    id: 'SPACEFARING',
    summary: 'A planet-spanning technological civilisation looking outward — and its scars.',
    simulatedYears: 2300,
    settleYears: 200,
    requiresSapience: true,
    settlements: 9,
    predecessorRuins: 4,
    flagshipPopulation: 420000,
    techDepth: 14,
    infrastructure: 3,
    industrialLoad: 0.6,
    collapsed: false
  },
  POST_COLLAPSE: {
    id: 'POST_COLLAPSE',
    summary: 'Something great fell. Survivors live among the ruins of their own ancestors.',
    simulatedYears: 2200,
    settleYears: 220,
    requiresSapience: true,
    settlements: 2,
    predecessorRuins: 6,
    flagshipPopulation: 900,
    techDepth: 4,
    infrastructure: 1,
    industrialLoad: 0.28,
    collapsed: true
  }
};

export interface EraCounters {
  species: { current: number };
  settlement: { current: number };
  polity: { current: number };
  culture: { current: number };
  language: { current: number };
}

export interface EraBootstrapContext {
  state: WorldState;
  prng: PRNG;
  counters: EraCounters;
  /** Runs the authoritative simulation forward. */
  advance: (years: number) => void;
}

const TIER_FOR_POPULATION = (p: number): Settlement['tier'] =>
  p < 500 ? 'HAMLET' : p < 2000 ? 'VILLAGE' : p < 8000 ? 'TOWN' : p < 25000 ? 'CITY' : 'METROPOLIS';

/** Technology graph walked in dependency order so granted tech is never orphaned. */
const orderedTechIds = (): string[] => {
  const remaining = Object.values(TECH_TREE);
  const granted: string[] = [];
  const grantedSet = new Set<string>();
  let guard = remaining.length * remaining.length + 8;

  while (remaining.length > 0 && guard-- > 0) {
    const index = remaining.findIndex(tech => tech.prerequisites.every(p => grantedSet.has(p)));
    if (index < 0) break;
    const [tech] = remaining.splice(index, 1);
    granted.push(tech.id);
    grantedSet.add(tech.id);
  }
  return granted;
};

export function applyStartingEra(ctx: EraBootstrapContext): void {
  const era = ctx.state.config.startingEra || 'PREBIOTIC';
  const profile = ERA_PROFILES[era] ?? ERA_PROFILES.PREBIOTIC;

  if (profile.simulatedYears <= 0) return;

  // 1. Genuine deep-time history. Everything after this point builds on real ancestry,
  //    real extinctions and a real causal graph.
  ctx.advance(profile.simulatedYears);

  if (profile.requiresSapience) {
    consolidateCivilization(ctx, profile);
  }

  depositFossilRecord(ctx, profile);

  if (profile.collapsed) {
    stageCollapse(ctx, profile);
  }

  // 2. Let the era actually be lived in, so populations, territories, myths, disease and
  //    ecology are simulation output rather than assignments.
  if (profile.settleYears > 0) ctx.advance(profile.settleYears);

  ctx.state.events.sort((a, b) => a.year - b.year);
}

// ---------------------------------------------------------------- civilisation

function consolidateCivilization(ctx: EraBootstrapContext, profile: EraProfile) {
  const { state, prng, counters } = ctx;
  const year = state.currentYear;

  let sapient = Object.values(state.species).find(s => s.isSapient && !s.isExtinct);

  if (!sapient) {
    // No lineage crossed the threshold on its own within the pregenerated history. Promote
    // the most cognitively capable surviving lineage and record why it happened, rather than
    // conjuring a species that has no ancestry.
    const candidates = Object.values(state.species)
      .filter(
        s =>
          !s.isExtinct &&
          s.morphology !== 'AUTOTROPH_PLANT' &&
          s.morphology !== 'AUTOTROPH_ALGAE' &&
          s.morphology !== 'FUNGUS_MYCELIUM'
      )
      .sort(
        (a, b) =>
          b.genome.cognition + b.genome.socialTendency * 40 - (a.genome.cognition + a.genome.socialTendency * 40)
      );

    sapient = candidates[0];
    if (!sapient) return;

    const emergenceYear = Math.max(1, year - Math.round(profile.simulatedYears * 0.18));
    sapient.isSapient = true;
    sapient.sapienceEmergenceYear = emergenceYear;
    sapient.genome.cognition = Math.max(86, sapient.genome.cognition);

    pushEvent(state, {
      id: `evt_era_sapience_${sapient.id}`,
      year: emergenceYear,
      title: `Awakening of Sapience in ${sapient.commonName}`,
      description: `Sustained social foraging and tool use pushed ${sapient.commonName} (${sapient.scientificName}) across the threshold into symbolic thought. Their descendants carried fire, grammar and memory into every habitable basin of the planet.`,
      category: 'SAPIENCE_EMERGENCE',
      importance: 5,
      tileCoordinates: sapient.originTile,
      relatedEntityIds: [sapient.id],
      causalNodeId: sapient.causalNodeId
    });
  }

  // Language and culture: reuse whatever the simulation already produced.
  let language = Object.values(state.languages)[0];
  if (!language) {
    counters.language.current++;
    const langId = `lang_${counters.language.current.toString().padStart(3, '0')}`;
    language = generateLanguage(langId, `fam_${langId}`, null, sapient.sapienceEmergenceYear ?? year, prng);
    state.languages[langId] = language;
  }

  let culture = Object.values(state.cultures)[0];
  if (!culture) {
    counters.culture.current++;
    const cultId = `cult_${counters.culture.current.toString().padStart(3, '0')}`;
    culture = generateCulture(cultId, sapient, language, Object.values(state.species), sapient.sapienceEmergenceYear ?? year, prng);
    state.cultures[cultId] = culture;
    CausalityEngine.ensureNode(
      state.causalGraph,
      culture.causalNodeId,
      culture.name,
      'CULTURE',
      cultId,
      culture.originYear ?? year,
      `Kinship, burial and craft traditions of the ${sapient.commonName}`
    );
    CausalityEngine.link(state.causalGraph, sapient.causalNodeId, culture.causalNodeId, 'LED_TO', 'Symbolic thought crystallising into shared tradition');
  }

  // Predecessor civilisations: founded and lost strictly before the start date, so the ruins
  // the player finds have a real founder, a real cause of death and a real date.
  for (let i = 0; i < profile.predecessorRuins; i++) {
    const foundedYear = Math.max(2, year - Math.round(profile.simulatedYears * (0.5 - i * 0.06)));
    const collapsedYear = Math.max(foundedYear + 20, year - Math.round(profile.simulatedYears * (0.22 - i * 0.02)));
    const pos = findOptimalSettlementLocation(state.grid, state.config, culture, Object.values(state.settlements), prng);
    if (!pos) break;

    counters.settlement.current++;
    const settId = `settle_${counters.settlement.current.toString().padStart(3, '0')}`;
    const lost = createSettlement(settId, culture, language, sapient.id, 'polity_lost', pos, foundedYear, prng);
    lost.population = 1200 + prng.int(0, 5200);
    lost.tier = TIER_FOR_POPULATION(lost.population);
    lost.infrastructure.hasGranary = true;
    lost.infrastructure.hasWalls = lost.population > 2500;
    lost.infrastructure.hasTemple = lost.population > 3200;
    state.settlements[settId] = lost;

    const cause = prng.choice([
      'Prolonged drought collapsing the irrigation basin',
      'Siege and sack by a rival confederacy',
      'Epidemic sweeping the granary districts',
      'Salinisation of the floodplain and famine',
      'Volcanic ashfall burying the terraces'
    ]);

    const tile = state.grid[pos.y][pos.x];
    const { ruin, event } = createRuinFromSettlement(lost, tile, cause, collapsedYear, prng);
    state.ruins[ruin.id] = ruin;
    ruin.decayLevel = Math.min(0.92, (year - collapsedYear) / Math.max(1, profile.simulatedYears));
    ruin.excavationLevel = 0.05;
    pushEvent(state, event);

    CausalityEngine.ensureNode(state.causalGraph, lost.causalNodeId, lost.name, 'SETTLEMENT', settId, foundedYear, `Founded by the ${culture.name}`);
    CausalityEngine.ensureNode(state.causalGraph, `ruin_${settId}`, `Ruins of ${lost.name}`, 'RUIN', ruin.id, collapsedYear, cause);
    CausalityEngine.link(state.causalGraph, lost.causalNodeId, `ruin_${settId}`, 'COLLAPSED_DUE_TO', cause);
    CausalityEngine.link(state.causalGraph, culture.causalNodeId, lost.causalNodeId, 'LED_TO', 'Settled agriculture along a perennial watercourse');
  }

  // The living civilisation of this era.
  let polityId: string | null = null;
  let capitalId: string | null = null;
  const livingSettlements: Settlement[] = [];

  for (let i = 0; i < profile.settlements; i++) {
    const pos = findOptimalSettlementLocation(state.grid, state.config, culture, Object.values(state.settlements), prng);
    if (!pos) break;

    counters.settlement.current++;
    const settId = `settle_${counters.settlement.current.toString().padStart(3, '0')}`;

    if (!polityId) {
      counters.polity.current++;
      polityId = `polity_${counters.polity.current.toString().padStart(3, '0')}`;
    }

    const foundedYear = Math.max(2, year - Math.round(profile.simulatedYears * (0.3 - i * 0.02)));
    const settlement = createSettlement(settId, culture, language, sapient.id, polityId, pos, foundedYear, prng);
    // Population falls off from the flagship so the map has an actual urban hierarchy.
    settlement.population = Math.max(60, Math.round(profile.flagshipPopulation / Math.pow(1.9, i)));
    settlement.tier = TIER_FOR_POPULATION(settlement.population);

    const tile = state.grid[pos.y][pos.x];
    settlement.infrastructure.hasGranary = profile.techDepth >= 2;
    settlement.infrastructure.hasWalls = profile.techDepth >= 4;
    settlement.infrastructure.hasTemple = profile.techDepth >= 3;
    settlement.infrastructure.hasLibrary = profile.techDepth >= 5;
    settlement.infrastructure.hasAqueduct = profile.techDepth >= 6 && tile.riverFlow > 0.1;
    settlement.infrastructure.hasSanitation = profile.techDepth >= 8;
    settlement.infrastructure.hasFoundry = profile.techDepth >= 7;
    settlement.infrastructure.hasHarbor = neighbourIsWater(state, pos.x, pos.y);

    state.settlements[settId] = settlement;
    tile.settlementId = settId;
    tile.dominantCultureId = culture.id;
    tile.dominantSpeciesId = sapient.id;
    livingSettlements.push(settlement);
    if (!capitalId) capitalId = settId;

    spreadInfrastructure(state, pos.x, pos.y, profile.infrastructure);

    CausalityEngine.ensureNode(state.causalGraph, settlement.causalNodeId, settlement.name, 'SETTLEMENT', settId, foundedYear, `Founded by the ${culture.name}`);
    CausalityEngine.link(state.causalGraph, culture.causalNodeId, settlement.causalNodeId, 'LED_TO', 'Surplus agriculture concentrating population');

    pushEvent(state, {
      id: `evt_era_found_${settId}`,
      year: foundedYear,
      title: `Founding of ${settlement.name}`,
      description: `The ${culture.name} raised ${settlement.name} at (${pos.x}, ${pos.y}), on ${tile.riverFlow > 0.1 ? 'a perennial watercourse' : 'fertile open ground'} in the ${tile.biome.toLowerCase().replace(/_/g, ' ')}.`,
      category: 'SETTLEMENT_FOUNDED',
      importance: 4,
      tileCoordinates: pos,
      relatedEntityIds: [settId, culture.id, sapient.id],
      causalNodeId: settlement.causalNodeId
    });
  }

  if (polityId && capitalId && livingSettlements.length > 0) {
    const capital = state.settlements[capitalId];
    const polity = createPolity(polityId, capital.name, sapient.id, culture, capital, capital.foundedYear, prng);
    state.polities[polityId] = polity;
    for (const s of livingSettlements) state.grid[s.tileY][s.tileX].polityId = polityId;

    CausalityEngine.ensureNode(state.causalGraph, polity.causalNodeId, polity.name, 'POLITY', polityId, capital.foundedYear, `Confederated from ${livingSettlements.length} settlements of the ${culture.name}`);
    CausalityEngine.link(state.causalGraph, capital.causalNodeId, polity.causalNodeId, 'LED_TO', 'A dominant centre binding neighbouring settlements under one authority');

    grantTechnology(ctx, profile, polityId);
  }

  applyIndustrialLoad(ctx, profile, livingSettlements);
}

function neighbourIsWater(state: WorldState, x: number, y: number): boolean {
  const { width, height } = state.config;
  return [
    [(x + 1) % width, y],
    [(x - 1 + width) % width, y],
    [x, Math.min(height - 1, y + 1)],
    [x, Math.max(0, y - 1)]
  ].some(([nx, ny]) => state.grid[ny][nx].isWater);
}

function spreadInfrastructure(state: WorldState, cx: number, cy: number, level: number) {
  if (level <= 0) return;
  const { width, height } = state.config;
  const radius = level + 1;
  for (let dy = -radius; dy <= radius; dy++) {
    const ny = cy + dy;
    if (ny < 0 || ny >= height) continue;
    for (let dx = -radius; dx <= radius; dx++) {
      const nx = (cx + dx + width) % width;
      const tile = state.grid[ny][nx];
      if (tile.isWater) continue;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > radius) continue;
      tile.infrastructureLevel = Math.max(tile.infrastructureLevel, Math.max(1, Math.round(level - dist * 0.6)));
    }
  }
}

function grantTechnology(ctx: EraBootstrapContext, profile: EraProfile, polityId: string) {
  const { state } = ctx;
  const polity = state.polities[polityId];
  if (!polity) return;

  const ordered = orderedTechIds();
  const depth = Math.min(profile.techDepth, ordered.length);
  const year = state.currentYear;

  for (let i = 0; i < depth; i++) {
    const techId = ordered[i];
    if (polity.discoveredTechIds.includes(techId)) continue;
    polity.discoveredTechIds.push(techId);

    const tech = TECH_TREE[techId];
    // Breakthroughs are dated across the pregenerated history in the order they depend on
    // each other, so the Chronicle reads as a real technological sequence.
    const discoveredYear = Math.max(2, year - Math.round((profile.simulatedYears * 0.28 * (depth - i)) / depth));
    pushEvent(state, {
      id: `evt_era_tech_${polityId}_${techId}`,
      year: discoveredYear,
      title: `Breakthrough: ${tech.name}`,
      description: `Artisans of the ${polity.name} mastered ${tech.name}. ${tech.description}`,
      category: 'TECH_BREAKTHROUGH',
      importance: 3,
      relatedEntityIds: [polityId, techId],
      causalNodeId: polity.causalNodeId
    });
  }
}

function applyIndustrialLoad(ctx: EraBootstrapContext, profile: EraProfile, settlements: Settlement[]) {
  if (profile.industrialLoad <= 0 || settlements.length === 0) return;
  const { state } = ctx;
  const { width, height } = state.config;
  const radius = 2 + Math.round(profile.industrialLoad * 4);

  for (const s of settlements) {
    for (let dy = -radius; dy <= radius; dy++) {
      const ny = s.tileY + dy;
      if (ny < 0 || ny >= height) continue;
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = (s.tileX + dx + width) % width;
        const tile = state.grid[ny][nx];
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > radius) continue;
        const falloff = 1 - dist / (radius + 1);
        tile.pollution = Math.min(1, tile.pollution + profile.industrialLoad * falloff);
        tile.environmentalDamage = Math.min(1, tile.environmentalDamage + profile.industrialLoad * falloff * 0.8);
        if (!tile.isWater) tile.biomass = Math.max(20, tile.biomass * (1 - profile.industrialLoad * falloff * 0.5));
      }
    }
  }

  const flagship = settlements[0];
  pushEvent(state, {
    id: `evt_era_industrial_${flagship.id}`,
    year: Math.max(2, state.currentYear - Math.round(profile.simulatedYears * 0.08)),
    title: 'The Smokestack Century',
    description: `Foundries, mines and mills around ${flagship.name} multiplied output and population, at the cost of poisoned watersheds and stripped forest within days' travel of every major centre.`,
    category: 'CATASTROPHE',
    importance: 4,
    tileCoordinates: { x: flagship.tileX, y: flagship.tileY },
    relatedEntityIds: [flagship.id],
    causalNodeId: `cause_era_industrial_${flagship.id}`
  });

  CausalityEngine.ensureNode(
    state.causalGraph,
    `cause_era_industrial_${flagship.id}`,
    'Industrial expansion',
    'CLIMATE_EVENT',
    flagship.id,
    state.currentYear,
    'Mechanised extraction outpacing ecological recovery'
  );
  CausalityEngine.link(state.causalGraph, flagship.causalNodeId, `cause_era_industrial_${flagship.id}`, 'LED_TO', 'Concentrated fuel demand and waste');
}

// ---------------------------------------------------------------- deep time record

/**
 * Buries genuinely extinct lineages into the strata beneath their historical range. Depth is
 * proportional to how long ago they died, so digging always tells a true story.
 */
function depositFossilRecord(ctx: EraBootstrapContext, profile: EraProfile) {
  const { state, prng } = ctx;
  const year = state.currentYear;
  const extinct = Object.values(state.species).filter(s => s.isExtinct && s.extinctionYear !== undefined);
  if (extinct.length === 0) return;

  const { width, height } = state.config;
  const budget = Math.min(extinct.length, 24);

  for (let i = 0; i < budget; i++) {
    const species = extinct[Math.floor((i / budget) * extinct.length)];
    const age = Math.max(1, year - (species.extinctionYear ?? 0));
    const origin = species.originTile;

    for (let n = 0; n < 2; n++) {
      const nx = (origin.x + prng.int(-2, 2) + width) % width;
      const ny = Math.max(0, Math.min(height - 1, origin.y + prng.int(-2, 2)));
      const tile = state.grid[ny][nx];
      if (tile.fossils.some(f => f.speciesId === species.id)) continue;

      const fossil: FossilLayer = {
        speciesId: species.id,
        speciesName: species.commonName,
        scientificName: species.scientificName,
        trophicLevel: species.trophicLevel,
        extinctionYear: species.extinctionYear ?? 0,
        geologicalDepthMeters: Math.round((age / Math.max(1, profile.simulatedYears)) * 220 + prng.float(0, 12)),
        mineralizationQuality: Math.max(0.05, Math.min(1, age / Math.max(1, profile.simulatedYears)))
      };
      tile.fossils.push(fossil);
    }
  }
}

// ---------------------------------------------------------------- collapse

/**
 * Post-collapse worlds keep only their survivors. The fall is a dated, caused event and the
 * abandoned cities become the ruins the survivors live among.
 */
function stageCollapse(ctx: EraBootstrapContext, profile: EraProfile) {
  const { state, prng } = ctx;
  const year = state.currentYear;
  const collapseYear = Math.max(2, year - Math.round(profile.settleYears * 1.5 + 40));

  const living = Object.values(state.settlements).filter(s => !s.isAbandoned);
  if (living.length === 0) return;

  const survivors = Math.max(1, Math.min(profile.settlements, living.length - 1));
  const doomed = living.slice(survivors);
  if (doomed.length === 0) return;

  const cause = prng.choice([
    'Cascading crop failure after a decade of ash-dimmed summers',
    'A pandemic that outran every quarantine road',
    'Total war between the great leagues, ending in mutual exhaustion',
    'Collapse of the irrigation network and the salting of the heartland'
  ]);

  for (const settlement of doomed) {
    const tile = state.grid[settlement.tileY][settlement.tileX];
    const { ruin, event } = createRuinFromSettlement(settlement, tile, cause, collapseYear, prng);
    state.ruins[ruin.id] = ruin;
    ruin.decayLevel = Math.min(0.7, (year - collapseYear) / 400);
    pushEvent(state, event);
    CausalityEngine.ensureNode(state.causalGraph, `ruin_${settlement.id}`, `Ruins of ${settlement.name}`, 'RUIN', ruin.id, collapseYear, cause);
    CausalityEngine.link(state.causalGraph, settlement.causalNodeId, `ruin_${settlement.id}`, 'COLLAPSED_DUE_TO', cause);
  }

  for (let i = 0; i < survivors; i++) {
    const s = living[i];
    s.population = Math.max(80, Math.round(s.population * 0.06));
    s.tier = TIER_FOR_POPULATION(s.population);
    s.infrastructure.hasLibrary = false;
    s.infrastructure.hasSanitation = false;
    s.infrastructure.hasFoundry = false;
  }

  pushEvent(state, {
    id: `evt_era_collapse_${collapseYear}`,
    year: collapseYear,
    title: 'The Collapse',
    description: `${doomed.length} of the great centres fell within a single lifetime. ${cause}. What survived kept the roads but lost the archives, and now farms among its own monuments.`,
    category: 'POLITY_COLLAPSE',
    importance: 5,
    relatedEntityIds: doomed.map(s => s.id),
    causalNodeId: `cause_era_collapse_${collapseYear}`
  });

  CausalityEngine.ensureNode(
    state.causalGraph,
    `cause_era_collapse_${collapseYear}`,
    'The Collapse',
    'POLITY',
    `collapse_${collapseYear}`,
    collapseYear,
    cause
  );
}

function pushEvent(state: WorldState, event: HistoricalEvent) {
  if (state.events.some(e => e.id === event.id)) return;
  state.events.push(event);
}
