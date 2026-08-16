// Biome classification, mineral distribution, and soil characteristics

import { PRNG } from '../math/prng';
import { SimplexNoise } from '../math/noise';
import { BiomeType, MineralType, Tile } from '../../types/simulation';

export function classifyBiome(
  elevation: number,
  seaLevel: number,
  temperature: number,
  moisture: number,
  riverFlow: number,
  isLake: boolean
): BiomeType {
  // Oceanic biomes
  if (elevation < seaLevel) {
    const depth = (seaLevel - elevation) / (seaLevel + 1.0);
    if (depth > 0.6) {
      // Very deep rift zones
      return 'DEEP_OCEAN';
    } else if (depth > 0.35) {
      return 'SHALLOW_OCEAN';
    } else {
      // Warm shallow coastal waters form coral reefs
      if (temperature > 18) return 'COASTAL_REEF';
      return 'SHALLOW_OCEAN';
    }
  }

  // Extreme alpine peaks
  if (elevation > seaLevel + 0.5) {
    return 'ALPINE';
  }

  // Wetland from major river deltas or low flat high-moisture zones
  if ((riverFlow > 0.6 && elevation < seaLevel + 0.15) || isLake) {
    return 'WETLAND';
  }

  // Terrestrial Whittaker Biome Matrix
  if (temperature < -8) {
    return 'TUNDRA';
  } else if (temperature < 5) {
    if (moisture < 0.25) return 'COLD_DESERT';
    if (moisture < 0.5) return 'TUNDRA';
    return 'TAIGA';
  } else if (temperature < 18) {
    if (moisture < 0.2) return 'HOT_DESERT';
    if (moisture < 0.45) return 'TEMPERATE_GRASSLAND';
    return 'TEMPERATE_FOREST';
  } else {
    // Warm / Tropical zones (temp >= 18)
    if (moisture < 0.18) return 'HOT_DESERT';
    if (moisture < 0.45) return 'SAVANNA';
    return 'TROPICAL_RAINFOREST';
  }
}

export function generateTileMinerals(
  elevation: number,
  seaLevel: number,
  biome: BiomeType,
  prng: PRNG,
  noise: SimplexNoise,
  x: number,
  y: number
): Record<MineralType, number> {
  const minerals: Record<MineralType, number> = {
    STONE: 0.5,
    CLAY: 0.1,
    COPPER: 0,
    TIN: 0,
    IRON: 0,
    COAL: 0,
    GOLD: 0,
    OBSIDIAN: 0,
    GEMS: 0,
    RARE_EARTHS: 0
  };

  const nx = x / 64;
  const ny = y / 64;

  // Mountain & tectonic uplift exposes rich metals & obsidian
  const isHighland = elevation > seaLevel + 0.25;
  const isLowland = elevation >= seaLevel && elevation <= seaLevel + 0.2;

  // Stone & Clay
  minerals.STONE = isHighland ? Math.min(1.0, 0.6 + prng.float(0.1, 0.4)) : 0.4;
  minerals.CLAY = (isLowland || biome === 'WETLAND') ? Math.min(1.0, 0.5 + prng.float(0.2, 0.5)) : 0.15;

  // Vein noise
  const metalNoise1 = noise.noise2D(nx * 8.0, ny * 8.0);
  const metalNoise2 = noise.noise2D(nx * 12.0 + 10, ny * 12.0 + 10);
  const deepVein = noise.noise2D(nx * 16.0 + 40, ny * 16.0 + 40);

  // Copper & Tin (Bronze Age essentials)
  if (metalNoise1 > 0.4 && isHighland) {
    minerals.COPPER = Math.round((metalNoise1 - 0.4) * 1.6 * 100) / 100;
  }
  if (metalNoise2 > 0.5 && isHighland) {
    minerals.TIN = Math.round((metalNoise2 - 0.5) * 1.8 * 100) / 100;
  }

  // Iron (Found in ancient banded iron formations and highlands)
  if (metalNoise1 > 0.35) {
    minerals.IRON = Math.round((metalNoise1 - 0.35) * 1.5 * 100) / 100;
  }

  // Coal (Ancient compressed swamp forests)
  if (biome === 'TEMPERATE_FOREST' || biome === 'TAIGA' || biome === 'WETLAND') {
    if (metalNoise2 > 0.3) {
      minerals.COAL = Math.round((metalNoise2 - 0.3) * 1.4 * 100) / 100;
    }
  }

  // Gold & Gemstones (Rare hydrothermal veins)
  if (deepVein > 0.7 && isHighland) {
    minerals.GOLD = Math.round((deepVein - 0.7) * 2.5 * 100) / 100;
    minerals.GEMS = Math.round((deepVein - 0.68) * 2.0 * 100) / 100;
  }

  // Obsidian (Volcanic & alpine zones)
  if (elevation > seaLevel + 0.4 && prng.next() < 0.15) {
    minerals.OBSIDIAN = Math.round(prng.float(0.4, 0.9) * 100) / 100;
  }

  // Rare Earths (Deep subterranean rifts)
  if (deepVein > 0.85) {
    minerals.RARE_EARTHS = Math.round((deepVein - 0.85) * 4.0 * 100) / 100;
  }

  return minerals;
}

export function computeSoilAndCapacity(
  biome: BiomeType,
  temperature: number,
  moisture: number,
  riverFlow: number
): { soilFertility: number; soilDepth: number; carryingCapacity: number; biomass: number } {
  let fertility = 0.5;
  let depth = 1.0; // meters
  let capacity = 500; // base population support

  switch (biome) {
    case 'TROPICAL_RAINFOREST':
      fertility = 0.85;
      depth = 2.5;
      capacity = 1200;
      break;
    case 'TEMPERATE_FOREST':
      fertility = 0.8;
      depth = 2.0;
      capacity = 1000;
      break;
    case 'TEMPERATE_GRASSLAND':
      fertility = 0.95; // Chernozem rich black soil
      depth = 1.8;
      capacity = 900;
      break;
    case 'SAVANNA':
      fertility = 0.6;
      depth = 1.2;
      capacity = 700;
      break;
    case 'WETLAND':
      fertility = 0.9;
      depth = 3.0;
      capacity = 850;
      break;
    case 'TAIGA':
      fertility = 0.4;
      depth = 0.8;
      capacity = 350;
      break;
    case 'TUNDRA':
      fertility = 0.15;
      depth = 0.3;
      capacity = 120;
      break;
    case 'HOT_DESERT':
      fertility = 0.08;
      depth = 0.2;
      capacity = 40;
      break;
    case 'COLD_DESERT':
      fertility = 0.05;
      depth = 0.1;
      capacity = 20;
      break;
    case 'ALPINE':
      fertility = 0.1;
      depth = 0.2;
      capacity = 50;
      break;
    case 'COASTAL_REEF':
      fertility = 0.9;
      depth = 1.0;
      capacity = 950;
      break;
    case 'SHALLOW_OCEAN':
      fertility = 0.6;
      depth = 1.0;
      capacity = 500;
      break;
    case 'DEEP_OCEAN':
      fertility = 0.2;
      depth = 0.5;
      capacity = 150;
      break;
    default:
      fertility = 0.3;
      depth = 0.5;
      capacity = 200;
  }

  // Major river irrigation increases fertility dramatically!
  if (riverFlow > 0.1) {
    fertility = Math.min(1.0, fertility + riverFlow * 0.3);
    capacity = Math.round(capacity * (1.0 + riverFlow * 0.5));
  }

  const biomass = Math.round(capacity * (0.8 + moisture * 0.4));

  return {
    soilFertility: Math.round(fertility * 100) / 100,
    soilDepth: Math.round(depth * 10) / 10,
    carryingCapacity: capacity,
    biomass
  };
}
