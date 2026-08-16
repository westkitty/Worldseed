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

      // Multi-frequency noise (toroidal in X)
      const angleX = nx * Math.PI * 2;
      const noiseX = Math.cos(angleX);
      const noiseZ = Math.sin(angleX);

      const continentNoise = noise.fbm(noiseX * 1.5, ny * 3.0, 5, 0.5, 2.0);
      const detailNoise = noise.fbm(noiseX * 5.0, ny * 8.0, 4, 0.4, 2.2);
      const ridge = noise.ridgeNoise(noiseX * 3.0, ny * 4.0, 4);

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
        const volcanoNoise = noise.noise2D(noiseX * 8.0, ny * 10.0);
        if (volcanoNoise > 0.75) {
          elev += (volcanoNoise - 0.75) * 1.5 * volcanism;
        }
      }

      // Smooth polar shelf tapering
      const poleDist = Math.abs(ny - 0.5) * 2; // 0 at equator, 1 at poles
      if (poleDist > 0.85) {
        elev += (poleDist - 0.85) * 0.3; // Polar icecap/land elevation
      }

      // Normalize elevation to [-1, 1]
      elevation[y][x] = Math.max(-1.0, Math.min(1.0, elev));
    }
  }

  return { elevation, plateIds, plates };
}
