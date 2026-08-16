// Emergent Discoveries & Anomalies Detector (Systemic Surprises Engine)

import { Discovery, WorldState } from '../../types/simulation';

export function scanForEmergentDiscoveries(state: WorldState): Discovery[] {
  const { currentYear, species, settlements, polities, cultures, ruins, grid, discoveries } = state;
  const newDiscoveries: Discovery[] = [];
  const existingKeys = new Set(discoveries.map(d => d.discoveryKey));

  // 1. Fossil-Worship Discovery
  if (!existingKeys.has('fossil_worship')) {
    for (const culture of Object.values(cultures)) {
      for (const sId of culture.sacredSpeciesIds) {
        const s = species[sId];
        if (s && s.isExtinct && s.extinctionYear && (culture.originYear - s.extinctionYear > 800)) {
          newDiscoveries.push({
            id: `disc_${Date.now()}_1`,
            discoveryKey: 'fossil_worship',
            title: 'The Bone-Pillar Monoliths of the Ancestor Beast',
            category: 'Archaeological Theology',
            yearDiscovered: currentYear,
            description: `The ${culture.name} venerates ${s.commonName} as a divine primordial titan, building megalithic temple pillars matching its fossil proportions. In reality, this species went extinct in Year ${s.extinctionYear}—long before this culture's ancestors ever learned to strike fire!`,
            causalExplanation: `Extinction in Year ${s.extinctionYear} deposited fossil layers into the bedrock. In Year ${culture.originYear}, early quarry workers unearthed the petrified skeleton and incorporated it into their creation theology.`,
            involvedEntityIds: [culture.id, s.id],
            isInspected: false
          });
          break;
        }
      }
    }
  }

  // 2. Feral Ancestor Lineage Mystery
  if (!existingKeys.has('feral_ancestor_mystery')) {
    const ferals = Object.values(species).filter(s => s.isFeral && !s.isExtinct && s.ancestorWildSpeciesId);
    if (ferals.length > 0) {
      const f = ferals[0];
      const ancestor = species[f.ancestorWildSpeciesId!];
      if (ancestor) {
        newDiscoveries.push({
          id: `disc_${Date.now()}_2`,
          discoveryKey: 'feral_ancestor_mystery',
          title: 'The Ghost Lineage: Feral Descendants of Forgotten Flocks',
          category: 'Biological Mystery',
          yearDiscovered: currentYear,
          description: `The wild ${f.commonName} currently roaming the wilderness was once selectively bred as docile livestock by an ancient civilization. When that society fell, the creatures escaped and re-evolved wild defenses over centuries.`,
          causalExplanation: `Selective breeding in Year ${f.divergenceYear} produced docile domestic stock. Following settlement collapse, feral survivors underwent natural selection, recovering predatory aggression while retaining genomic markers of ancient domestication.`,
          involvedEntityIds: [f.id, ancestor.id],
          isInspected: false
        });
      }
    }
  }

  // 3. Subterranean Troglobite Micro-Refugium in Ruins
  if (!existingKeys.has('troglobite_ruins')) {
    const trogloRuin = Object.values(ruins).find(r => r.shelteredTroglobites && currentYear - r.collapsedYear > 1000);
    if (trogloRuin) {
      newDiscoveries.push({
        id: `disc_${Date.now()}_3`,
        discoveryKey: 'troglobite_ruins',
        title: 'The Living Catacombs: Troglobite Refugium in Ancient Vaults',
        category: 'Urban Ecology',
        yearDiscovered: currentYear,
        description: `The deep collapsed foundation vaults of ancient ${trogloRuin.originalName} (abandoned in Year ${trogloRuin.collapsedYear}) created a permanent subterranean micro-climate that now shelters a thriving blind troglobite ecosystem!`,
        causalExplanation: `Artificial stone architecture outlived its creators by over a millennium, trapping moisture and geothermal warmth to establish a novel ecological niche.`,
        involvedEntityIds: [trogloRuin.id],
        isInspected: false
      });
    }
  }

  // 4. Ancient Infrastructure Border Inertia
  if (!existingKeys.has('infrastructure_inertia')) {
    const ancientRuin = Object.values(ruins).find(r => currentYear - r.collapsedYear > 1500);
    const activePolity = Object.values(polities).find(p => !p.isExtinct && p.territoryTileIndices.length > 10);
    if (ancientRuin && activePolity) {
      newDiscoveries.push({
        id: `disc_${Date.now()}_4`,
        discoveryKey: 'infrastructure_inertia',
        title: 'The Ghost Highway: Territorial Border Shaped by Ancient Canals',
        category: 'Historical Geography',
        yearDiscovered: currentYear,
        description: `The modern boundary of the ${activePolity.name} aligns perfectly with an ancient drainage canal network originally excavated 2,000 years ago by the builders of ${ancientRuin.originalName}!`,
        causalExplanation: `Ancient canal excavation permanently altered local river flow gradients and valley accessibility, establishing a natural geographic demarcation that modern empires continue to treat as a defensible frontier.`,
        involvedEntityIds: [ancientRuin.id, activePolity.id],
        isInspected: false
      });
    }
  }

  // 5. Fortified Buffer Zone Accidental Nature Sanctuary
  if (!existingKeys.has('accidental_sanctuary')) {
    const warringPolities = Object.values(polities).filter(p => !p.isExtinct && p.activeWars.length > 0);
    if (warringPolities.length >= 2) {
      newDiscoveries.push({
        id: `disc_${Date.now()}_5`,
        discoveryKey: 'accidental_sanctuary',
        title: 'The War-Sanctuary: Forest Protected by Militarized Deadlocks',
        category: 'Ecological Irony',
        yearDiscovered: currentYear,
        description: `A heavily disputed frontier between rival empires has been off-limits to logging and agricultural clearance for centuries. Inadvertently, the bloody conflict created the planet's richest pristine old-growth wildlife refuge!`,
        causalExplanation: `Constant military skirmishing prevented civilian deforestation, granting vulnerable flora and fauna an undisturbed sanctuary amidst human conflict.`,
        involvedEntityIds: warringPolities.map(p => p.id),
        isInspected: false
      });
    }
  }

  // 6. Toponymic Substrate Archaeology
  if (!existingKeys.has('toponymic_substrate')) {
    const activeCultures = Object.values(cultures);
    if (activeCultures.length >= 2) {
      const cA = activeCultures[0];
      const cB = activeCultures[1];
      newDiscoveries.push({
        id: `disc_${Date.now()}_6`,
        discoveryKey: 'toponymic_substrate',
        title: 'Echoes in the Stone: Place-Name Archaeology in Conquered Valleys',
        category: 'Linguistic Archaeology',
        yearDiscovered: currentYear,
        description: `Settlements of the ${cA.name} retain river and mountain names derived phonetically from the language of the ${cB.name}, whom they displaced centuries ago without remembering their existence.`,
        causalExplanation: `Conquest altered the ruling population, but geographical toponyms persisted through local substrate adoption, preserving the phonetic imprint of a lost tongue.`,
        involvedEntityIds: [cA.id, cB.id],
        isInspected: false
      });
    }
  }

  // 7. Stratigraphic City Over-Layering
  if (!existingKeys.has('stratigraphic_city')) {
    const multiRuinTile = grid.flat().find(t => t.ruins.length >= 2);
    if (multiRuinTile) {
      newDiscoveries.push({
        id: `disc_${Date.now()}_7`,
        discoveryKey: 'stratigraphic_city',
        title: 'The Palimpsest City: Multiple Civilizations Stacked in Bedrock',
        category: 'Deep Stratigraphy',
        yearDiscovered: currentYear,
        description: `Excavations at tile (${multiRuinTile.x}, ${multiRuinTile.y}) revealed multiple distinct historical settlements stacked atop one another, separated by layers of volcanic silt and river sand.`,
        causalExplanation: `Exceptional geographical advantages (river confluence and fertile black soil) caused successive independent cultures to repeatedly build cities on the exact same location across millennia.`,
        involvedEntityIds: multiRuinTile.ruins.map(r => r.id),
        tileLocation: { x: multiRuinTile.x, y: multiRuinTile.y },
        isInspected: false
      });
    }
  }

  // 8. Pathogenic Transformation of Settlement Geography
  if (!existingKeys.has('pathogen_transformation')) {
    const severePlague = Object.values(state.pathogens).find(p => p.totalCasualtiesHistorical > 5000);
    if (severePlague) {
      newDiscoveries.push({
        id: `disc_${Date.now()}_8`,
        discoveryKey: 'pathogen_transformation',
        title: 'The Great Scattering: Urban Dissolution Driven by Contagion',
        category: 'Epidemiological Demography',
        yearDiscovered: currentYear,
        description: `The outbreak of ${severePlague.name} permanently shattered dense metropolitan living in the region, compelling surviving clans to adopt low-density dispersed hamlets to evade contagion vectors.`,
        causalExplanation: `Virulent airborne transmission exerted severe selective pressure against high-density cities, permanently reshaping regional architecture and kinship customs.`,
        involvedEntityIds: [severePlague.id],
        isInspected: false
      });
    }
  }

  return newDiscoveries;
}
