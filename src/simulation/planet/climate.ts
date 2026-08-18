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
        // Altitude rises non-linearly with normalised elevation: most land is lowland and
        // only the top few percent is genuinely alpine. Treating the normalised value as a
        // linear 0-6 km ramp previously put median land near 1,900 m and froze every
        // continent into tundra.
        const above = (elev - seaLevel) / (1.0 - seaLevel);
        const heightKm = Math.pow(above, 2.0) * 7.5; // sea level to ~7,500 m at the summits
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

  // 2b. Latitudinal circulation. Rising air at the ITCZ and the polar front produces rain;
  //     the descending limb of the Hadley cell at roughly 25-30 degrees produces the world's
  //     desert belts. Without this the model had no latitudinal banding at all, so every
  //     continent received the same (near-zero) interior rainfall.
  const convergenceAt = (absLat: number): number => {
    const itcz = Math.exp(-Math.pow(absLat / 11, 2)) * 1.0; // equatorial rain belt
    const subtropicalHigh = -Math.exp(-Math.pow((absLat - 27) / 12, 2)) * 0.55; // desert belt
    const polarFront = Math.exp(-Math.pow((absLat - 55) / 14, 2)) * 0.45; // mid-latitude storms
    const polarDry = -Math.exp(-Math.pow((absLat - 88) / 12, 2)) * 0.3;
    return Math.max(0.12, 0.55 + itcz + subtropicalHigh + polarFront + polarDry);
  };

  // Advect moisture along each latitude band under its prevailing wind.
  //
  // Two laps are made per row: the first only conditions the air column so that a wrapping
  // world does not start every sweep from an arbitrary guess, and the second writes the
  // precipitation. Over land a share of what falls is returned to the air as
  // evapotranspiration, which is what actually keeps continental interiors from drying to
  // nothing a few tiles inland.
  // Over a 64-wide world each tile spans hundreds of kilometres, so most of what falls
  // inland is returned to the air by evapotranspiration before the parcel moves on.
  const LAND_RECYCLE = 0.8;

  for (let y = 0; y < height; y++) {
    const lat = ((y / (height - 1)) * 2 - 1) * 90;
    const absLat = Math.abs(lat);
    const convergence = convergenceAt(absLat);

    // Hadley / Ferrel / polar cells: trades and polar easterlies blow west, westerlies east.
    const windDir = absLat < 30 ? -1 : absLat < 60 ? 1 : -1;
    const step = windDir;

    // Warmer air holds more water, so the ceiling follows the band's own temperature.
    let bandTemp = 0;
    for (let x = 0; x < width; x++) bandTemp += temperature[y][x];
    bandTemp /= width;
    const capacity = Math.max(0.18, Math.min(1.0, (bandTemp + 12) / 42));

    let air = capacity * 0.6;

    for (let lap = 0; lap < 2; lap++) {
      const writing = lap === 1;
      for (let i = 0; i < width; i++) {
        const x = ((step > 0 ? i : width - 1 - i) % width + width) % width;
        const prevX = ((x - step) % width + width) % width;
        const elev = elevation[y][x];
        const prevElev = elevation[y][prevX];

        // Convective baseline: wherever the circulation is rising and the air is warm,
        // it rains regardless of what the terrain upwind is doing. This is what produces
        // the equatorial rain belt and, by its absence, the subtropical deserts.
        const convective = capacity * convergence * 0.55;

        if (elev < seaLevel) {
          // Over water the column recharges toward its temperature-limited capacity.
          air = Math.min(capacity, air + (capacity - air) * 0.6 + 0.1);
          if (writing) rainfall[y][x] = Math.min(1, Math.max(convective, air * 0.6 * convergence));
          continue;
        }

        // Over land: orographic lift on windward slopes, weaker rain on flats and lee sides.
        const deltaElev = elev - prevElev;
        const lift = deltaElev > 0 ? Math.min(0.9, 0.3 + deltaElev * 3.2) : 0.26;
        const removed = air * lift;
        const advected = removed * convergence * 1.8;

        if (writing) rainfall[y][x] = Math.min(1, Math.max(convective, advected));
        // Evapotranspiration returns most of the rainfall to the air column.
        air = Math.max(0.04, air - removed * (1 - LAND_RECYCLE));
      }
    }
  }

  // 2c. Meridional smoothing. Storm tracks are not confined to a single row of tiles, so a
  //     light vertical blur keeps rain belts continuous instead of striped.
  const smoothed: number[][] = rainfall.map(row => row.slice());
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const up = rainfall[Math.max(0, y - 1)][x];
      const down = rainfall[Math.min(height - 1, y + 1)][x];
      smoothed[y][x] = rainfall[y][x] * 0.6 + (up + down) * 0.2;
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // A little deterministic variation so rain belts are not perfectly zonal.
      const angleX = (x / width) * Math.PI * 2;
      const variation = noise.fbm(Math.cos(angleX) * 2.4, (y / height) * 3.2, 3) * 0.12;
      rainfall[y][x] = Math.max(0, Math.min(1, smoothed[y][x] + variation));
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
        const m = Math.max(0, Math.min(1.0, (rawRain * 1.6) / (evapDemand + 0.6)));
        moisture[y][x] = Math.round(m * 100) / 100;
        rainfall[y][x] = Math.round(Math.min(1.0, rawRain) * 100) / 100;
      }
    }
  }

  return { temperature, rainfall, moisture };
}
