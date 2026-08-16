// Mathematical Projections & Raycasting for 6 World Presentation Modes

import { WorldViewMode, WorldState, Tile } from '../../types/simulation';

export interface Camera3D {
  x: number;
  y: number;
  zoom: number;
  rotX: number; // Pitch in radians
  rotY: number; // Yaw / Orbit in radians
}

export class WorldProjectionEngine {
  // Convert 2D screen click (cx, cy) to grid coordinate (gx, gy) for any projection mode
  public static screenToGrid(
    screenX: number,
    screenY: number,
    canvasWidth: number,
    canvasHeight: number,
    camera: Camera3D,
    viewMode: WorldViewMode,
    gridWidth: number,
    gridHeight: number
  ): { x: number; y: number } | null {
    const centerCanvasX = canvasWidth / 2 + camera.x;
    const centerCanvasY = canvasHeight / 2 + camera.y;

    if (viewMode === 'FLAT_ATLAS' || viewMode === 'SQUARE_TILE') {
      const tileSize = (Math.min(canvasWidth, canvasHeight) / gridHeight) * camera.zoom;
      const originX = centerCanvasX - (gridWidth * tileSize) / 2;
      const originY = centerCanvasY - (gridHeight * tileSize) / 2;

      const gx = Math.floor((screenX - originX) / tileSize);
      const gy = Math.floor((screenY - originY) / tileSize);

      if (gx >= 0 && gx < gridWidth && gy >= 0 && gy < gridHeight) {
        return { x: gx, y: gy };
      }
      return null;
    }

    if (viewMode === 'GLOBE' || viewMode === 'SNOW_GLOBE' || viewMode === 'ORBITAL_VIEW') {
      const radius = (Math.min(canvasWidth, canvasHeight) * 0.38) * camera.zoom;
      const dx = screenX - centerCanvasX;
      const dy = screenY - centerCanvasY;
      const dist2 = dx * dx + dy * dy;

      if (dist2 > radius * radius) {
        return null; // Clicked outside the sphere
      }

      // Orthographic sphere raycast: calculate normal (nx, ny, nz)
      const nx = dx / radius;
      const ny = dy / radius;
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));

      // Apply camera rotation (rotY = yaw, rotX = pitch)
      const cosY = Math.cos(camera.rotY);
      const sinY = Math.sin(camera.rotY);
      const cosX = Math.cos(camera.rotX);
      const sinX = Math.sin(camera.rotX);

      // Pitch rotation
      const py = ny * cosX - nz * sinX;
      const pz = ny * sinX + nz * cosX;

      // Yaw rotation
      const px = nx * cosY + pz * sinY;
      const pz2 = -nx * sinY + pz * cosY;

      // Spherical coordinates
      const lat = Math.asin(Math.max(-1, Math.min(1, py)));
      const lon = Math.atan2(px, pz2);

      // Map latitude & longitude to grid
      const u = (lon + Math.PI) / (Math.PI * 2);
      const v = (lat + Math.PI / 2) / Math.PI;

      const gx = Math.floor(u * gridWidth) % gridWidth;
      const gy = Math.floor((1 - v) * gridHeight);

      if (gx >= 0 && gx < gridWidth && gy >= 0 && gy < gridHeight) {
        return { x: gx, y: gy };
      }
      return null;
    }

    if (viewMode === 'RELIEF_DIORAMA') {
      // Isometric projection raycast
      const isoTileW = 28 * camera.zoom;
      const isoTileH = 14 * camera.zoom;
      const dx = screenX - centerCanvasX;
      const dy = screenY - centerCanvasY + (gridHeight * isoTileH) / 4;

      const gx = Math.floor((dx / (isoTileW / 2) + dy / (isoTileH / 2)) / 2);
      const gy = Math.floor((dy / (isoTileH / 2) - dx / (isoTileW / 2)) / 2);

      if (gx >= 0 && gx < gridWidth && gy >= 0 && gy < gridHeight) {
        return { x: gx, y: gy };
      }
      return null;
    }

    return null;
  }
}
