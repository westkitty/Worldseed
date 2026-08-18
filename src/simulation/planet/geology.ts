// Tectonic plate generation, elevation modeling, and geological processes

import { PRNG } from '../math/prng';
import { SimplexNoise } from '../math/noise';
import { WorldConfig } from '../../types/simulation';

export interface Plate {
  id: number;
  centerX: number;
  centerY: number;
  isOceanic: boolean;
  driftX: number; // velocity vector
  driftY: number;
  elevationBias: number;
}

export function generateTectonicElevation(
  config: WorldConfig,
  prng: PRNG,
  noise: SimplexNoise
): { elevation: number[][]; plateIds: number[][]; plates: Plate[] } {
  const { width, height, tectonicPlatesCount, seaLevel, volcanism } = config;

  // 1. Generate tectonic plate centroids
  const plates: Plate[] = [];
  const oceanicRatio = 0.6; // ~60% oceanic plates
  for (let i = 0; i < tectonicPlatesCount; i++) {
    const isOceanic = prng.next() < oceanicRatio;
    const angle = prng.float(0, Math.PI * 2);
    const speed = prng.float(0.2, 1.0);
    plates.push({
      id: i,
      centerX: prng.float(0, width),
      centerY: prng.float(0, height),
      isOceanic,
      driftX: Math.cos(angle) * speed,
      driftY: Math.sin(angle) * speed,
      elevationBias: isOceanic ? prng.float(-0.7, -0.3) : prng.float(0.1, 0.5)
    });
  }

  const elevation: number[][] = Array.from({ length: height }, () => new Array(width).fill(0));
  const plateIds: number[][] = Array.from({ length: height }, () => new Array(width).fill(0));

  // 2. Assign each tile to nearest plate (Voronoi with toroidal wrapping on X)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let minDist = Infinity;
      let closestPlate = plates[0];

      for (const plate of plates) {
        // Toroidal distance on X
        let dx = Math.abs(x - plate.centerX);
        if (dx > width / 2) dx = width - dx;
        const dy = y - plate.centerY;
        const dist = dx * dx + dy * dy;

        if (dist < minDist) {
          minDist = dist;
          closestPlate = plate;
        }
      }

      plateIds[y][x] = closestPlate.id;
    }
  }

  // 3. Compute plate boundary stresses (convergent = mountains, divergent = rifts)
  const boundaryStress: number[][] = Array.from({ length: height }, () => new Array(width).fill(0));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const currentPlateId = plateIds[y][x];
      const currentPlate = plates[currentPlateId];

      // Check 4-neighbors
      const neighbors = [
        [(x + 1) % width, y],
        [(x - 1 + width) % width, y],
        [x, Math.min(height - 1, y + 1)],
        [x, Math.max(0, y - 1)]
      ];

      for (const [nx, ny] of neighbors) {
        const neighborPlateId = plateIds[ny][nx];
        if (neighborPlateId !== currentPlateId) {
          const nPlate = plates[neighborPlateId];
          // Relative velocity dot product
          const relDx = currentPlate.driftX - nPlate.driftX;
          const relDy = currentPlate.driftY - nPlate.driftY;
          // Vector from neighbor to current
          let dirX = x - nx;
          if (dirX > width / 2) dirX -= width;
          if (dirX < -width / 2) dirX += width;
          const dirY = y - ny;
          const len = Math.sqrt(dirX * dirX + dirY * dirY) || 1;

          const dot = (relDx * (dirX / len) + relDy * (dirY / len));
          // Positive dot = convergent (collision -> mountain orogeny)
          // Negative dot = divergent (rift -> deep ocean trench)
          boundaryStress[y][x] += dot * 0.45;
        }
      }
    }
  }

  // 4. Combine plate base elevation + boundary orogeny + noise octaves
  for (let y = 0; y < height; y++) {
    const ny = y / height;
    for (let x = 0; x < width; x++) {
      const nx = x / width;
      const plate = plates[plateIds[y][x]];

      // Seamless cylindrical noise.
      //
      // The previous field sampled only cos(longitude), which is symmetric about the prime
      // meridian — so every world came out mirrored east-to-west and its structure varied
      // almost entirely with latitude, producing banded, pole-hugging continents. Sampling
      // the ring's cosine and sine components on two different planes and summing them keeps
      // the field seamless at the date line while giving longitude genuine, asymmetric
      // structure.
      const angleX = nx * Math.PI * 2;
      const ringC = Math.cos(angleX);
      const ringS = Math.sin(angleX);

      const continentNoise =
        noise.fbm(ringC * 1.6, ny * 2.6, 5, 0.5, 2.0) * 0.55 +
        noise.fbm(ringS * 1.6 + 37.1, ny * 2.6 + 13.7, 5, 0.5, 2.0) * 0.55;
      const detailNoise =
        noise.fbm(ringC * 5.0, ny * 7.0, 4, 0.4, 2.2) * 0.5 +
        noise.fbm(ringS * 5.0 + 71.3, ny * 7.0 + 29.1, 4, 0.4, 2.2) * 0.5;
      const ridge =
        noise.ridgeNoise(ringC * 3.0, ny * 3.6, 4) * 0.5 +
        noise.ridgeNoise(ringS * 3.0 + 53.9, ny * 3.6 + 7.5, 4) * 0.5;

      let elev = plate.elevationBias + continentNoise * 0.45 + detailNoise * 0.2;

      // Add boundary mountain uplift
      const stress = boundaryStress[y][x];
      if (stress > 0) {
        elev += stress * 0.8 + ridge * 0.4;
      } else if (stress < 0) {
        elev += stress * 0.5; // rift depression
      }

      // Add volcanic hotspot bumps if enabled
      if (volcanism > 0.2) {
        const volcanoNoise = noise.noise2D(ringC * 8.0, ny * 10.0);
        if (volcanoNoise > 0.75) {
          elev += (volcanoNoise - 0.75) * 1.5 * volcanism;
        }
      }

      // Continental shelves shallow slightly toward the poles, but the poles are not given
      // a systematic elevation advantage — that previously made every world a polar-cap world
      // once elevations were normalised against sea level.
      const poleDist = Math.abs(ny - 0.5) * 2; // 0 at equator, 1 at poles
      if (poleDist > 0.92) {
        elev += (poleDist - 0.92) * 0.12;
      }

      elevation[y][x] = elev;
    }
  }

  applyHypsometricNormalization(elevation, width, height, seaLevel);

  return { elevation, plateIds, plates };
}


/**
 * Remaps raw tectonic+noise output onto a predictable hypsometric curve.
 *
 * Why this exists: the raw field is the sum of a plate bias and several noise octaves, so
 * its absolute range drifts with plate count, volcanism and seed. Against a fixed `seaLevel`
 * threshold that produced wildly inconsistent worlds — the default configuration yielded
 * about 6% land, no continental drainage basins, and therefore no rivers or lakes anywhere.
 *
 * The transform is a strictly monotonic rank remap, so it preserves every ordering the
 * geology produced (mountains stay the highest ground, rifts stay the deepest) while making
 * `seaLevel` mean what it says: the fraction of the surface that ends up underwater. Land is
 * then shaped so most of it is lowland and high peaks stay rare, which is what gives rivers
 * long continental paths to run down.
 */
function applyHypsometricNormalization(
  elevation: number[][],
  width: number,
  height: number,
  seaLevel: number
): void {
  const count = width * height;
  const flat: Array<{ v: number; x: number; y: number }> = new Array(count);
  let i = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      flat[i++] = { v: elevation[y][x], x, y };
    }
  }
  flat.sort((a, b) => a.v - b.v);

  // Ocean fraction follows directly from the configured sea level, so the same setting means
  // the same kind of world regardless of the other geology parameters.
  const oceanFraction = Math.max(0.05, Math.min(0.95, (seaLevel + 1) / 2));
  const oceanCells = Math.round(count * oceanFraction);
  const floor = -1.0;
  const ceiling = 1.0;

  for (let rank = 0; rank < count; rank++) {
    const cell = flat[rank];
    let mapped: number;

    if (rank < oceanCells) {
      // Depth curve: broad abyssal plains, a shorter continental shelf near the coast.
      const t = oceanCells <= 1 ? 1 : rank / (oceanCells - 1); // 0 = deepest
      const shaped = Math.pow(t, 0.75);
      mapped = floor + (seaLevel - floor) * shaped;
    } else {
      // Land curve: most ground is low, peaks are rare.
      const landCells = count - oceanCells;
      const t = landCells <= 1 ? 0 : (rank - oceanCells) / (landCells - 1); // 0 = coast
      const shaped = Math.pow(t, 1.7);
      mapped = seaLevel + (ceiling - seaLevel) * shaped;
    }

    elevation[cell.y][cell.x] = Math.max(-1, Math.min(1, mapped));
  }
}
