// Hydrology: river generation, flow accumulation, lake formation, and drainage basins

import { PRNG } from '../math/prng';
import { WorldConfig } from '../../types/simulation';
import { stepCoordinate } from './topology';

export interface RiverTile {
  flow: number; // 0 to 1
  downhillX: number;
  downhillY: number;
  isSource: boolean;
}

export function simulateHydrology(
  config: WorldConfig,
  elevation: number[][],
  rainfall: number[][],
  seaLevel: number,
  prng: PRNG
): { riverFlow: number[][]; riverDir: number[][]; isLake: boolean[][] } {
  const { width, height } = config;

  const riverFlow: number[][] = Array.from({ length: height }, () => new Array(width).fill(0));
  const riverDir: number[][] = Array.from({ length: height }, () => new Array(width).fill(0));
  const isLake: boolean[][] = Array.from({ length: height }, () => new Array(width).fill(false));

  // Water accumulation matrix
  const waterVolume: number[][] = Array.from({ length: height }, () => new Array(width).fill(0));

  // 1. Initialize precipitation per land cell
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (elevation[y][x] >= seaLevel) {
        // High mountains with rainfall become major water collection sources
        const elev = elevation[y][x];
        const rain = rainfall[y][x];
        waterVolume[y][x] = Math.max(0.05, rain * (1.0 + elev * 0.5));
      }
    }
  }

  // 2. Sort all land cells by elevation descending (highest mountain down to coast)
  const cells: Array<{ x: number; y: number; elev: number }> = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (elevation[y][x] >= seaLevel) {
        cells.push({ x, y, elev: elevation[y][x] });
      }
    }
  }
  cells.sort((a, b) => b.elev - a.elev);

  // 3. Flow water downhill from highest to lowest
  for (const cell of cells) {
    const { x, y, elev } = cell;
    const vol = waterVolume[y][x];

    // Find the steepest downhill neighbour under this world's actual adjacency rules.
    let minElev = elev;
    let targetX = -1;
    let targetY = -1;
    let drainsOffWorld = false;

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const next = stepCoordinate(x, y, dx, dy, width, height, config.topology);
        if (!next) {
          // On a bounded slab, a sky archipelago or a cavern system, downhill at the rim
          // means over the rim: the water is gone rather than dammed by the array bounds.
          drainsOffWorld = true;
          continue;
        }
        const nElev = elevation[next.y][next.x];
        if (nElev < minElev) {
          minElev = nElev;
          targetX = next.x;
          targetY = next.y;
        }
      }
    }

    if (targetX !== -1 && targetY !== -1) {
      // Transfer water downhill
      waterVolume[targetY][targetX] += vol;
      // Store flow direction angle in radians
      let dx = targetX - x;
      if (dx > width / 2) dx -= width;
      if (dx < -width / 2) dx += width;
      const dy = targetY - y;
      riverDir[y][x] = Math.atan2(dy, dx);
    } else if (!drainsOffWorld) {
      // Endorheic local depression -> becomes an inland Lake if high water accumulation
      if (vol > 2.5) {
        isLake[y][x] = true;
      }
    }
  }

  // 4. Normalize river flow threshold (rivers appear where waterVolume >= threshold)
  const riverThreshold = 3.5;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (elevation[y][x] >= seaLevel) {
        const vol = waterVolume[y][x];
        if (vol >= riverThreshold) {
          // Logarithmic scaling of river flow
          const normalizedFlow = Math.min(1.0, Math.log(vol - riverThreshold + 1) / 4.0);
          riverFlow[y][x] = Math.round(normalizedFlow * 100) / 100;
        }
      }
    }
  }

  return { riverFlow, riverDir, isLake };
}
