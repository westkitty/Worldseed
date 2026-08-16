// Master Simulation Engine for WORLDSEED

import { PRNG } from './math/prng';
import { SimplexNoise } from './math/noise';
import { generateTectonicElevation } from './planet/geology';
import { calculateClimate } from './planet/climate';
import { simulateHydrology } from './planet/hydrology';
import { classifyBiome, computeSoilAndCapacity, generateTileMinerals } from './planet/biomes';
import { createSpecies } from './ecology/species';
import { simulateEcologicalCycle, TilePop } from './ecology/populations';
import { checkSpeciation, handleExtinctions } from './ecology/evolution';
import { evaluateSapienceEmergence } from './cognition/intelligence';
import { generateLanguage } from './civilization/language';
import { generateCulture } from './civilization/culture';
import { createSettlement, findOptimalSettlementLocation, updateSettlement } from './civilization/settlement';
import { attemptDomestication, handleFeralEscapes } from './civilization/domestication';
import { evaluatePolityTechDiscovery, TECH_TREE } from './civilization/technology';
import { createPolity, simulateDiplomacyAndWar, updatePolityTerritories } from './civilization/politics';
import { createRuinFromSettlement, updateRuinDecayAndExcavation } from './civilization/ruins';
import { checkZoonoticSpillover, simulateEpidemicStep } from './disease/epidemiology';
import { createMythFromHistoricalEvent } from './myth/culturalMemory';
import { CausalityEngine } from './history/causality';
import { evaluateEras } from './history/chronicle';
import { scanForEmergentDiscoveries } from './history/discoveries';
import {
  HistoricalEvent,
  Species,
  Tile,
  WorldConfig,
  WorldState
} from '../types/simulation';

export class SimulationEngine {
  private prng: PRNG;
  private noise: SimplexNoise;
  private state: WorldState;
  private tilePops: Map<string, TilePop[]> = new Map();

  // Internal persistent entity counters
  private speciesCounter = { current: 0 };
  private settlementCounter = { current: 0 };
  private polityCounter = { current: 0 };
  private cultureCounter = { current: 0 };
  private languageCounter = { current: 0 };
  private pathogenCounter = { current: 0 };
  private mythCounter = { current: 0 };

  constructor(config: WorldConfig) {
    this.prng = new PRNG(config.seed);
    this.noise = new SimplexNoise(this.prng);
    this.state = this.generateWorld(config);
  }

  // Generate initial pristine planet and seed primordial life
  private generateWorld(config: WorldConfig): WorldState {
    const { width, height, seaLevel } = config;

    // 1. Planetary Geology (Tectonic plates & elevation)
    const { elevation, plateIds } = generateTectonicElevation(config, this.prng, this.noise);

    // 2. Planetary Climate (Thermal gradients & orographic rainfall)
    const { temperature, rainfall, moisture } = calculateClimate(config, elevation, seaLevel, this.prng, this.noise);

    // 3. Hydrology (Rivers & lakes)
    const { riverFlow, riverDir, isLake } = simulateHydrology(config, elevation, rainfall, seaLevel, this.prng);

    // 4. Construct Planet Tile Grid
    const grid: Tile[][] = Array.from({ length: height }, (_, y) =>
      Array.from({ length: width }, (_, x) => {
        const elev = elevation[y][x];
        const isWater = elev < seaLevel;
        const temp = temperature[y][x];
        const moist = moisture[y][x];
        const rFlow = riverFlow[y][x];
        const lake = isLake[y][x];

        const biome = classifyBiome(elev, seaLevel, temp, moist, rFlow, lake);
        const minerals = generateTileMinerals(elev, seaLevel, biome, this.prng, this.noise, x, y);
        const { soilFertility, soilDepth, carryingCapacity, biomass } = computeSoilAndCapacity(biome, temp, moist, rFlow);

        return {
          x,
          y,
          elevation: elev,
          plateId: plateIds[y][x],
          isWater,
          waterDepth: isWater ? Math.max(0, (seaLevel - elev) / (seaLevel + 1.0)) : 0,
          baseTemp: temp,
          currentTemp: temp,
          moisture: moist,
          rainfall: rainfall[y][x],
          soilFertility,
          soilDepth,
          biome,
          riverFlow: rFlow,
          riverDirection: riverDir[y][x],
          isLake: lake,
          minerals,
          biomass,
          carryingCapacity,
          vegetationDensity: Math.round(moist * 100) / 100,
          pollution: 0,
          erosionLevel: 0,
          environmentalDamage: 0,
          ruins: [],
          fossils: [],
          populationDensity: 0,
          activeContagionIds: [],
          infrastructureLevel: 0
        };
      })
    );

    // 5. Seed Primordial Biosphere Lineages
    const species: Record<string, Species> = {};
    const events: HistoricalEvent[] = [];

    const primordialTypes: Array<{ morphology: any; trophic: any; tileType: 'LAND' | 'WATER' }> = [
      { morphology: 'AUTOTROPH_ALGAE', trophic: 'PRODUCER', tileType: 'WATER' },
      { morphology: 'AUTOTROPH_PLANT', trophic: 'PRODUCER', tileType: 'LAND' },
      { morphology: 'FUNGUS_MYCELIUM', trophic: 'DECOMPOSER', tileType: 'LAND' },
      { morphology: 'INVERTEBRATE_ARTHROPOD', trophic: 'PRIMARY_CONSUMER', tileType: 'LAND' },
      { morphology: 'PISCINE', trophic: 'PRIMARY_CONSUMER', tileType: 'WATER' },
      { morphology: 'REPTILIAN', trophic: 'SECONDARY_CONSUMER', tileType: 'LAND' },
      { morphology: 'MAMMALIAN', trophic: 'PRIMARY_CONSUMER', tileType: 'LAND' },
      { morphology: 'AVIAN', trophic: 'SECONDARY_CONSUMER', tileType: 'LAND' }
    ];

    const diversityCount = Math.min(primordialTypes.length, config.initialLifeDiversity + 3);

    for (let i = 0; i < diversityCount; i++) {
      const pType = primordialTypes[i];
      this.speciesCounter.current++;
      const sId = `spec_${this.speciesCounter.current.toString().padStart(4, '0')}`;

      // Find suitable candidate seed tile
      let candidatePos = { x: Math.floor(width / 2), y: Math.floor(height / 2) };
      for (let attempt = 0; attempt < 100; attempt++) {
        const rx = this.prng.int(0, width - 1);
        const ry = this.prng.int(Math.floor(height * 0.2), Math.floor(height * 0.8));
        const t = grid[ry][rx];
        if (pType.tileType === 'WATER' && t.isWater) {
          candidatePos = { x: rx, y: ry };
          break;
        } else if (pType.tileType === 'LAND' && !t.isWater) {
          candidatePos = { x: rx, y: ry };
          break;
        }
      }

      const sp = createSpecies(sId, pType.morphology, pType.trophic, null, 0, candidatePos, this.prng);
      species[sId] = sp;

      // Seed population on tile and immediate neighbors
      for (let dy = -1; dy <= 1; dy++) {
        const ny = Math.max(0, Math.min(height - 1, candidatePos.y + dy));
        for (let dx = -1; dx <= 1; dx++) {
          const nx = (candidatePos.x + dx + width) % width;
          const key = `${nx},${ny}`;
          let pops = this.tilePops.get(key);
          if (!pops) {
            pops = [];
            this.tilePops.set(key, pops);
          }
          pops.push({ speciesId: sId, count: 400, adaptation: 0.9 });
        }
      }

      // Initial genesis event
      events.push({
        id: `evt_genesis_${sId}`,
        year: 0,
        title: `Genesis of ${sp.commonName}`,
        description: `Primordial emergence of ${sp.commonName} (${sp.scientificName}), a ${sp.trophicLevel.toLowerCase()} lineage originating in the ${grid[candidatePos.y][candidatePos.x].biome.toLowerCase().replace('_', ' ')}.`,
        category: 'BIOSPHERE_GENESIS',
        importance: 4,
        tileCoordinates: candidatePos,
        relatedEntityIds: [sId],
        causalNodeId: sp.causalNodeId
      });
    }

    // Build initial causal graph nodes for primordial species
    const causalGraph: Record<string, any> = {};
    for (const sp of Object.values(species)) {
      CausalityEngine.ensureNode(
        causalGraph,
        sp.causalNodeId,
        sp.commonName,
        'SPECIES',
        sp.id,
        0,
        `Primordial ancestral lineage of ${sp.scientificName}`
      );
    }

    const initialState: WorldState = {
      config,
      currentYear: 0,
      ticks: 0,
      isPaused: true,
      simulationSpeed: 1,
      grid,
      species,
      languages: {},
      cultures: {},
      settlements: {},
      polities: {},
      technologies: { ...TECH_TREE },
      pathogens: {},
      myths: {},
      ruins: {},
      causalGraph,
      events,
      eras: [],
      discoveries: [],
      currentBranchId: 'main_branch',
      branches: {
        main_branch: {
          id: 'main_branch',
          name: 'Prime Timeline',
          parentBranchId: null,
          forkYear: 0,
          interventionsApplied: []
        }
      },
      stats: {
        totalExtinctions: 0,
        totalSpeciations: 0,
        peakSapientPopulation: 0,
        globalAvgTemperature: 14.5,
        forestCoverPercentage: 35.0,
        totalBiomass: 100000
      }
    };

    initialState.eras = evaluateEras(initialState);
    return initialState;
  }

  // Get current state snapshot
  public getState(): WorldState {
    return this.state;
  }

  // Advance simulation by 1 or more year steps
  public step(yearsToAdvance: number = 10): WorldState {
    for (let step = 0; step < yearsToAdvance; step++) {
      this.state.currentYear += 1;
      this.state.ticks += 1;
      const year = this.state.currentYear;

      // 1. Seasonal / Orbital Temperature Modulation
      const seasonalCycle = Math.sin((year % 100) * 0.0628) * 1.5;
      for (const row of this.state.grid) {
        for (const tile of row) {
          tile.currentTemp = Math.round((tile.baseTemp + seasonalCycle) * 10) / 10;
        }
      }

      // 2. Spatial Ecological Simulation (Lotka-Volterra energy & populations)
      const { updatedTilePops, speciesTotals, extinctionCandidates } = simulateEcologicalCycle(
        this.state.grid,
        this.state.species,
        this.tilePops,
        this.state.config,
        this.prng,
        year
      );
      this.tilePops = updatedTilePops;

      // Update total populations
      for (const [sId, total] of Object.entries(speciesTotals)) {
        if (this.state.species[sId]) {
          this.state.species[sId].totalPopulation = total;
          this.state.species[sId].totalBiomass = total * this.state.species[sId].genome.bodySizeMeters;
        }
      }

      // 3. Handle Extinction Cascades
      if (extinctionCandidates.length > 0) {
        const extEvents = handleExtinctions(extinctionCandidates, this.state.species, this.state.grid, year, this.prng);
        this.state.events.push(...extEvents);
        this.state.stats.totalExtinctions += extEvents.length;

        for (const e of extEvents) {
          const s = this.state.species[e.relatedEntityIds[0]];
          if (s) {
            CausalityEngine.ensureNode(
              this.state.causalGraph,
              `ext_${s.id}`,
              `Extinction of ${s.commonName}`,
              'EXTINCTION',
              s.id,
              year,
              s.extinctionCause || 'Ecological collapse'
            );
            CausalityEngine.link(this.state.causalGraph, s.causalNodeId, `ext_${s.id}`, 'COLLAPSED_DUE_TO', s.extinctionCause || 'Niche loss');
          }
        }
      }

      // 4. Speciation & Adaptive Radiation (every ~20 years)
      if (year % 20 === 0) {
        const { newSpecies, events: specEvents } = checkSpeciation(
          this.state.species,
          this.tilePops,
          this.state.grid,
          this.state.config,
          this.prng,
          year,
          this.speciesCounter
        );

        for (const ns of newSpecies) {
          this.state.species[ns.id] = ns;
          this.state.stats.totalSpeciations++;
          CausalityEngine.ensureNode(
            this.state.causalGraph,
            ns.causalNodeId,
            ns.commonName,
            'SPECIES',
            ns.id,
            year,
            `Diverged from ${this.state.species[ns.parentSpeciesId!]?.commonName || 'ancestral stock'}`
          );
          if (ns.parentSpeciesId && this.state.species[ns.parentSpeciesId]) {
            CausalityEngine.link(
              this.state.causalGraph,
              this.state.species[ns.parentSpeciesId].causalNodeId,
              ns.causalNodeId,
              'LED_TO',
              'Geographic isolation and adaptive radiation'
            );
          }
        }
        this.state.events.push(...specEvents);
      }

      // 5. Evaluate Sapience Emergence
      if (year > 300 && year % 50 === 0) {
        const { upliftedSpecies, events: sapEvents } = evaluateSapienceEmergence(
          this.state.species,
          this.state.grid,
          this.state.config,
          this.prng,
          year
        );

        for (const us of upliftedSpecies) {
          // Generate founding language and culture for newly sapient species
          this.languageCounter.current++;
          const langId = `lang_${this.languageCounter.current.toString().padStart(3, '0')}`;
          const language = generateLanguage(langId, `fam_${langId}`, null, year, this.prng);
          this.state.languages[langId] = language;

          this.cultureCounter.current++;
          const cultId = `cult_${this.cultureCounter.current.toString().padStart(3, '0')}`;
          const culture = generateCulture(cultId, us, language, Object.values(this.state.species), year, this.prng);
          this.state.cultures[cultId] = culture;

          // Found first settlement
          const optPos = findOptimalSettlementLocation(this.state.grid, this.state.config, culture, Object.values(this.state.settlements), this.prng);
          if (optPos) {
            this.settlementCounter.current++;
            const settId = `settle_${this.settlementCounter.current.toString().padStart(3, '0')}`;
            this.polityCounter.current++;
            const polId = `polity_${this.polityCounter.current.toString().padStart(3, '0')}`;

            const settlement = createSettlement(settId, culture, language, us.id, polId, optPos, year, this.prng);
            const polity = createPolity(polId, settlement.name, us.id, culture, settlement, year, this.prng);

            this.state.settlements[settId] = settlement;
            this.state.polities[polId] = polity;
            this.state.grid[optPos.y][optPos.x].settlementId = settId;

            // Link causality
            CausalityEngine.ensureNode(this.state.causalGraph, settlement.causalNodeId, settlement.name, 'SETTLEMENT', settId, year, `Founded by the ${culture.name}`);
            CausalityEngine.link(this.state.causalGraph, us.causalNodeId, settlement.causalNodeId, 'LED_TO', 'Emergence of sapience leading to urban settlement');

            this.state.events.push({
              id: `evt_found_${settId}`,
              year,
              title: `Founding of ${settlement.name}`,
              description: `The ${culture.name} established the settlement of ${settlement.name} beside the riverbanks of tile (${optPos.x}, ${optPos.y}).`,
              category: 'SETTLEMENT_FOUNDED',
              importance: 4,
              tileCoordinates: optPos,
              relatedEntityIds: [settId, cultId, us.id],
              causalNodeId: settlement.causalNodeId
            });
          }
        }
        this.state.events.push(...sapEvents);
      }

      // 6. Civilization Progression & Technology (every year)
      for (const settlement of Object.values(this.state.settlements)) {
        if (!settlement.isAbandoned) {
          const tile = this.state.grid[settlement.tileY][settlement.tileX];
          const polity = this.state.polities[settlement.polityId];
          const techCount = polity ? polity.discoveredTechIds.length : 1;

          const { populationDelta } = updateSettlement(settlement, tile, techCount, this.prng, year);

          // Check for settlement collapse (from famine / severe population drop)
          if (settlement.population <= 15) {
            const { ruin, event: colEvent } = createRuinFromSettlement(settlement, tile, 'Demographic collapse and localized resource exhaustion', year, this.prng);
            this.state.ruins[ruin.id] = ruin;
            this.state.events.push(colEvent);
            // Handle potential feral animal escapes
            const feralEvents = handleFeralEscapes(this.state.species, true, year, this.prng);
            this.state.events.push(...feralEvents);
          }
        }
      }

      // 7. Technology Discovery & Polity Expansion
      for (const polity of Object.values(this.state.polities)) {
        if (!polity.isExtinct) {
          const territoryTiles = polity.territoryTileIndices.map(idx => {
            const y = Math.floor(idx / this.state.config.width);
            const x = idx % this.state.config.width;
            return this.state.grid[y][x];
          });

          if (year % 30 === 0) {
            const newTech = evaluatePolityTechDiscovery(polity, territoryTiles, this.prng, year);
            if (newTech) {
              this.state.events.push({
                id: `evt_tech_${polity.id}_${newTech.id}_${year}`,
                year,
                title: `Breakthrough: ${newTech.name}`,
                description: `Scholars of the ${polity.name} mastered the principles of ${newTech.name}. Effect: ${newTech.description}`,
                category: 'TECH_BREAKTHROUGH',
                importance: 3,
                relatedEntityIds: [polity.id, newTech.id],
                causalNodeId: polity.causalNodeId
              });
            }
          }
        }
      }

      // Update territorial boundaries
      updatePolityTerritories(this.state.polities, this.state.settlements, this.state.grid, this.state.config);

      // 8. Diplomacy & Warfare (every ~20 years)
      if (year % 20 === 0) {
        const dipEvents = simulateDiplomacyAndWar(this.state.polities, this.state.settlements, year, this.prng);
        this.state.events.push(...dipEvents);
      }

      // 9. Domestication Attempts (every ~40 years)
      if (year % 40 === 0) {
        for (const s of Object.values(this.state.settlements)) {
          if (!s.isAbandoned) {
            const culture = this.state.cultures[s.cultureId];
            if (culture) {
              const { domesticSpecies, event: domEvent } = attemptDomestication(
                culture,
                this.state.species,
                this.tilePops,
                { x: s.tileX, y: s.tileY },
                year,
                this.prng,
                this.speciesCounter
              );
              if (domesticSpecies && domEvent) {
                this.state.species[domesticSpecies.id] = domesticSpecies;
                this.state.events.push(domEvent);
                CausalityEngine.ensureNode(
                  this.state.causalGraph,
                  domesticSpecies.causalNodeId,
                  domesticSpecies.commonName,
                  'SPECIES',
                  domesticSpecies.id,
                  year,
                  `Domesticated by ${culture.name}`
                );
                CausalityEngine.link(
                  this.state.causalGraph,
                  culture.causalNodeId,
                  domesticSpecies.causalNodeId,
                  'DOMESTICATED_FROM',
                  'Selective breeding for food and draft labor'
                );
              }
            }
          }
        }
      }

      // 10. Disease Outbreaks & Epidemic Progression
      if (year % 50 === 0) {
        const { newPathogen, event: pEvent } = checkZoonoticSpillover(
          this.state.species,
          this.state.settlements,
          this.state.grid,
          year,
          this.prng,
          this.pathogenCounter
        );
        if (newPathogen && pEvent) {
          this.state.pathogens[newPathogen.id] = newPathogen;
          this.state.events.push(pEvent);
          CausalityEngine.ensureNode(
            this.state.causalGraph,
            newPathogen.causalNodeId,
            newPathogen.name,
            'DISEASE',
            newPathogen.id,
            year,
            `Emergence of ${newPathogen.type}`
          );
        }
      }

      const { casualties, events: epiEvents } = simulateEpidemicStep(
        this.state.pathogens,
        this.state.settlements,
        this.state.grid,
        this.state.config,
        year,
        this.prng
      );
      this.state.events.push(...epiEvents);

      // 11. Myth Crystallization (every ~100 years from major past events)
      if (year % 100 === 0 && this.state.events.length > 5) {
        const candidateEvents = this.state.events.filter(e => e.importance >= 3 && year - e.year > 200);
        const activeCultures = Object.values(this.state.cultures);
        if (candidateEvents.length > 0 && activeCultures.length > 0) {
          const pastMajorEvent = this.prng.choice(candidateEvents);
          const culture = this.prng.choice(activeCultures);
          const { myth, mythEvent } = createMythFromHistoricalEvent(pastMajorEvent, culture, year, this.prng, this.mythCounter);
          this.state.myths[myth.id] = myth;
          this.state.events.push(mythEvent);
          CausalityEngine.ensureNode(
            this.state.causalGraph,
            myth.causalNodeId,
            myth.title,
            'MYTH',
            myth.id,
            year,
            `Distorted cultural memory of Year ${pastMajorEvent.year} (${pastMajorEvent.title})`
          );
          CausalityEngine.link(
            this.state.causalGraph,
            pastMajorEvent.causalNodeId,
            myth.causalNodeId,
            'PRESERVED_MEMORY_OF',
            'Generational oral transmission and mythological distortion'
          );
        }
      }

      // 12. Scan for Emergent Discoveries (Surprises)
      if (year % 50 === 0) {
        const newDiscs = scanForEmergentDiscoveries(this.state);
        this.state.discoveries.push(...newDiscs);
      }
    }

    // Update Global Statistics & Eras
    this.state.eras = evaluateEras(this.state);
    this.updateGlobalStats();

    return this.state;
  }

  // Update global statistical counters
  private updateGlobalStats() {
    let totalBiomass = 0;
    let forestCount = 0;
    let landCount = 0;
    let tempSum = 0;
    let tileCount = 0;

    for (const row of this.state.grid) {
      for (const tile of row) {
        tileCount++;
        tempSum += tile.currentTemp;
        totalBiomass += tile.biomass;
        if (!tile.isWater) {
          landCount++;
          if (tile.biome === 'TEMPERATE_FOREST' || tile.biome === 'TROPICAL_RAINFOREST' || tile.biome === 'TAIGA') {
            forestCount++;
          }
        }
      }
    }

    let totalSapientPop = 0;
    for (const s of Object.values(this.state.settlements)) {
      if (!s.isAbandoned) totalSapientPop += s.population;
    }

    this.state.stats.globalAvgTemperature = Math.round((tempSum / tileCount) * 10) / 10;
    this.state.stats.forestCoverPercentage = landCount > 0 ? Math.round((forestCount / landCount) * 1000) / 10 : 0;
    this.state.stats.totalBiomass = Math.round(totalBiomass);
    this.state.stats.peakSapientPopulation = Math.max(this.state.stats.peakSapientPopulation, totalSapientPop);
  }

  // Interventions / World Lab (Meteor, Supervolcano, Uplift, Deluge, Plague)
  public applyIntervention(
    type: 'METEOR_STRIKE' | 'SUPERVOLCANO' | 'MEGA_DROUGHT' | 'DELUGE' | 'GENESIS_SPARK' | 'MUTATION_RAY' | 'UPLIFT_SPECIES',
    params?: { targetTile?: { x: number; y: number }; speciesId?: string }
  ): HistoricalEvent {
    const year = this.state.currentYear;
    const { width, height } = this.state.config;
    let event: HistoricalEvent;

    switch (type) {
      case 'METEOR_STRIKE': {
        const x = params?.targetTile?.x ?? this.prng.int(0, width - 1);
        const y = params?.targetTile?.y ?? this.prng.int(0, height - 1);
        const tile = this.state.grid[y][x];

        // Crater formation & local devastation
        tile.elevation = Math.max(-1.0, tile.elevation - 0.4);
        tile.biomass = Math.max(10, tile.biomass * 0.1);
        tile.environmentalDamage = 1.0;

        event = {
          id: `evt_divine_meteor_${year}`,
          year,
          title: 'Cataclysmic Meteorite Impact',
          description: `A titanic celestial bolide struck tile (${x}, ${y}), carving a vast impact crater and lofting thousands of tons of ejecta ash into the upper atmosphere.`,
          category: 'DIVINE_INTERVENTION',
          importance: 5,
          tileCoordinates: { x, y },
          relatedEntityIds: [],
          causalNodeId: `cause_divine_meteor_${year}`
        };
        break;
      }

      case 'SUPERVOLCANO': {
        const x = params?.targetTile?.x ?? this.prng.int(0, width - 1);
        const y = params?.targetTile?.y ?? this.prng.int(0, height - 1);
        const tile = this.state.grid[y][x];
        tile.biome = 'VOLCANIC_BARREN';
        tile.elevation = Math.min(1.0, tile.elevation + 0.3);

        event = {
          id: `evt_divine_volcano_${year}`,
          year,
          title: 'Supervolcanic Caldera Eruption',
          description: `A violent hydrothermal supervolcano erupted at tile (${x}, ${y}), triggering a global volcanic winter and burying surrounding biomes under basalt lava sheets.`,
          category: 'DIVINE_INTERVENTION',
          importance: 5,
          tileCoordinates: { x, y },
          relatedEntityIds: [],
          causalNodeId: `cause_divine_volcano_${year}`
        };
        break;
      }

      case 'UPLIFT_SPECIES': {
        const targetId = params?.speciesId ?? Object.keys(this.state.species)[0];
        const s = this.state.species[targetId];
        if (s) {
          s.isSapient = true;
          s.genome.cognition = 95;
          s.sapienceEmergenceYear = year;
        }

        event = {
          id: `evt_divine_uplift_${year}`,
          year,
          title: `Divine Uplift of ${s?.commonName || 'Life'}`,
          description: `Direct cognitive intervention granted symbolic abstract consciousness to ${s?.commonName || 'the lineage'}.`,
          category: 'DIVINE_INTERVENTION',
          importance: 5,
          relatedEntityIds: [targetId],
          causalNodeId: `cause_divine_uplift_${year}`
        };
        break;
      }

      default: {
        event = {
          id: `evt_divine_anomaly_${year}`,
          year,
          title: 'Planetary Climate Intervention',
          description: 'A sudden macroscopic shift in atmospheric moisture and thermal gradients was introduced.',
          category: 'DIVINE_INTERVENTION',
          importance: 4,
          relatedEntityIds: [],
          causalNodeId: `cause_divine_anomaly_${year}`
        };
      }
    }

    CausalityEngine.ensureNode(
      this.state.causalGraph,
      event.causalNodeId,
      event.title,
      'INTERVENTION',
      event.id,
      year,
      event.description
    );

    this.state.events.push(event);

    // Record intervention in current branch history
    const branch = this.state.branches[this.state.currentBranchId];
    if (branch) {
      branch.interventionsApplied.push({
        year,
        type,
        description: event.description
      });
    }

    return event;
  }

  // Fork World into an alternate history branch
  public forkBranch(branchName: string): string {
    const branchId = `branch_${Date.now()}`;
    this.state.branches[branchId] = {
      id: branchId,
      name: branchName,
      parentBranchId: this.state.currentBranchId,
      forkYear: this.state.currentYear,
      interventionsApplied: []
    };
    this.state.currentBranchId = branchId;
    return branchId;
  }
}
