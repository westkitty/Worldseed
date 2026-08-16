// Planetary climate modeling: thermal gradients, atmospheric circulation, orographic rainfall

import { PRNG } from '../math/prng';
import { SimplexNoise } from '../math/noise';
import { WorldConfig } from '../../types/simulation';

export function calculateClimate(
  config: WorldConfig,
  elevation: number[][],
  seaLevel: number,
  prng: PRNG,
  noise: SimplexNoise
): { temperature: number[][]; rainfall: number[][]; moisture: number[][] } {
  const { width, height, axialTilt } = config;

  const temperature: number[][] = Array.from({ length: height }, () => new Array(width).fill(0));
  const rainfall: number[][] = Array.from({ length: height }, () => new Array(width).fill(0));
  const moisture: number[][] = Array.from({ length: height }, () => new Array(width).fill(0));

  // 1. Calculate base temperature (latitude + elevation lapse rate + oceanic moderation)
  for (let y = 0; y < height; y++) {
    // Latitude from -90 (south pole) to +90 (north pole)
    const lat = ((y / (height - 1)) * 2 - 1) * 90;
    const absLat = Math.abs(lat);

    // Solar insolation based on latitude (Equator ~30C, Poles ~ -25C)
    const solarFactor = Math.cos((absLat * Math.PI) / 180);
    const baseLatTemp = -25 + solarFactor * 55; // -25 to +30 C

    for (let x = 0; x < width; x++) {
      const elev = elevation[y][x];
      const isWater = elev < seaLevel;

      // Environmental Lapse Rate: -6.5 C per km elevation above sea level
      let elevPenalty = 0;
      if (elev >= seaLevel) {
        const heightKm = ((elev - seaLevel) / (1.0 - seaLevel)) * 6.0; // max ~6000m
        elevPenalty = heightKm * 6.5;
      } else {
        // Ocean thermal buffering: deeper water stabilizes around 4C to 15C
        elevPenalty = 0;
      }

      // Climate noise (variability across continents)
      const nx = x / width;
      const angleX = nx * Math.PI * 2;
      const cNoise = noise.fbm(Math.cos(angleX) * 2, (y / height) * 2, 3) * 4.0;

      let temp = baseLatTemp - elevPenalty + cNoise;
      if (isWater) {
        // Moderate extreme water temps
        temp = temp * 0.7 + (baseLatTemp > 0 ? 15 : -2) * 0.3;
      }

      temperature[y][x] = Math.round(temp * 10) / 10;
    }
  }

  // 2. Prevailing Wind & Atmospheric Circulation
  // Hadley Cell (0-30 deg): Trade winds blow WEST (East -> West)
  // Ferrel Cell (30-60 deg): Westerlies blow EAST (West -> East)
  // Polar Cell (60-90 deg): Polar Easterlies blow WEST (East -> West)
  // Orographic precipitation: Moisture picked up over ocean, deposited on mountain windward slopes!

  // First pass: Calculate initial ocean evaporation into moisture parcels
  const airMoisture: number[][] = Array.from({ length: height }, () => new Array(width).fill(0));
  for (let y = 0; y < height; y++) {
    const lat = ((y / (height - 1)) * 2 - 1) * 90;
    const absLat = Math.abs(lat);
    for (let x = 0; x < width; x++) {
      const elev = elevation[y][x];
      if (elev < seaLevel) {
        // Warm oceans evaporate more moisture (ITCZ equatorial tropics highest)
        const temp = temperature[y][x];
        const evapPotential = Math.max(0.1, Math.min(1.0, (temp + 10) / 40));
        airMoisture[y][x] = evapPotential;
      }
    }
  }

  // Simulate wind moisture advection across 4 passes
  for (let pass = 0; pass < 3; pass++) {
    for (let y = 0; y < height; y++) {
      const lat = ((y / (height - 1)) * 2 - 1) * 90;
      const absLat = Math.abs(lat);

      // Wind direction: 1 = Eastward (left to right), -1 = Westward (right to left)
      let windDir = 1;
      if (absLat < 30) {
        windDir = -1; // Trade winds blow West
      } else if (absLat < 60) {
        windDir = 1; // Westerlies blow East
      } else {
        windDir = -1; // Polar Easterlies blow West
      }

      // Sweep in wind direction with toroidal wrapping
      let currentAirMoisture = 0.5;
      const step = windDir;
      for (let i = 0; i < width; i++) {
        const x = (step > 0 ? i : (width - 1 - i) + width) % width;
        const prevX = (x - step + width) % width;
        const elev = elevation[y][x];
        const prevElev = elevation[y][prevX];
        const isWater = elev < seaLevel;

        if (isWater) {
          // Re-charge moisture over ocean
          currentAirMoisture = Math.min(1.0, currentAirMoisture + 0.25);
          rainfall[y][x] = Math.min(1.0, currentAirMoisture * 0.6);
        } else {
          // Over land: if slope rises (mountain obstacle), precipitate heavily!
          const deltaElev = elev - prevElev;
          let orographicRain = 0;

          if (deltaElev > 0) {
            // Rising air cooling -> heavy precipitation
            orographicRain = currentAirMoisture * Math.min(0.8, deltaElev * 4.0 + 0.2);
          } else {
            // Flat land or leeward descent (rain shadow)
            orographicRain = currentAirMoisture * 0.08;
          }

          rainfall[y][x] += orographicRain;
          currentAirMoisture = Math.max(0.02, currentAirMoisture - orographicRain);
        }
      }
    }
  }

  // 3. Compute final soil moisture combining rainfall, temperature evaporation, and noise
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const elev = elevation[y][x];
      const isWater = elev < seaLevel;
      if (isWater) {
        moisture[y][x] = 1.0;
        rainfall[y][x] = Math.min(1.0, rainfall[y][x]);
      } else {
        // Evaporation demand based on heat
        const temp = temperature[y][x];
        const evapDemand = Math.max(0.1, (temp + 5) / 35);
        const rawRain = rainfall[y][x];
        const m = Math.max(0, Math.min(1.0, (rawRain * 1.5) / (evapDemand + 0.5)));
        moisture[y][x] = Math.round(m * 100) / 100;
        rainfall[y][x] = Math.round(Math.min(1.0, rawRain) * 100) / 100;
      }
    }
  }

  return { temperature, rainfall, moisture };
}
