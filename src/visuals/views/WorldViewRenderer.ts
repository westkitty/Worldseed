// Master 6-Mode World View Presentation Renderer (CC0-1.0)

import { WorldViewMode, WorldState, Tile } from '../../types/simulation';
import { Camera3D } from './projections';
import { BiomeTilesetEngine } from '../sprites/biomeTileset';
import { CivilizationSpriteEngine } from '../sprites/civilizationSprites';

export class WorldViewRenderer {
  public static renderView(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    state: WorldState,
    viewMode: WorldViewMode,
    camera: Camera3D,
    hoveredTile: { x: number; y: number } | null,
    time: number
  ) {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    switch (viewMode) {
      case 'FLAT_ATLAS':
        this.renderFlatAtlas(ctx, canvasWidth, canvasHeight, state, camera, hoveredTile);
        break;

      case 'SQUARE_TILE':
        this.renderSquareBoard(ctx, canvasWidth, canvasHeight, state, camera, hoveredTile);
        break;

      case 'GLOBE':
        this.renderGlobe(ctx, canvasWidth, canvasHeight, state, camera, hoveredTile, false, time);
        break;

      case 'SNOW_GLOBE':
        this.renderGlobe(ctx, canvasWidth, canvasHeight, state, camera, hoveredTile, true, time);
        break;

      case 'RELIEF_DIORAMA':
        this.renderReliefDiorama(ctx, canvasWidth, canvasHeight, state, camera, hoveredTile);
        break;

      case 'ORBITAL_VIEW':
        this.renderOrbitalView(ctx, canvasWidth, canvasHeight, state, camera, hoveredTile, time);
        break;
    }
  }

  // 1. FLAT ATLAS
  private static renderFlatAtlas(
    ctx: CanvasRenderingContext2D,
    cw: number,
    ch: number,
    state: WorldState,
    camera: Camera3D,
    hoveredTile: { x: number; y: number } | null
  ) {
    const { grid, config } = state;
    const { width, height } = config;
    const tileSize = (Math.min(cw, ch) / height) * camera.zoom;
    const originX = (cw - width * tileSize) / 2 + camera.x;
    const originY = (ch - height * tileSize) / 2 + camera.y;

    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, cw, ch);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tile = grid[y][x];
        const px = originX + x * tileSize;
        const py = originY + y * tileSize;

        if (px + tileSize < 0 || px > cw || py + tileSize < 0 || py > ch) continue;

        if (tileSize > 8) {
          const tileImg = BiomeTilesetEngine.getTileCanvas(tile.biome, x + y * width, x % 4);
          ctx.drawImage(tileImg, px, py, tileSize + 0.5, tileSize + 0.5);
        } else {
          ctx.fillStyle = this.getTileColor(tile);
          ctx.fillRect(px, py, tileSize + 0.5, tileSize + 0.5);
        }

        // River flow
        if (tile.riverFlow > 0.1 && !tile.isWater) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = Math.max(1.5, tileSize * tile.riverFlow * 0.35);
          ctx.beginPath();
          ctx.moveTo(px + tileSize / 2, py + tileSize / 2);
          ctx.lineTo(
            px + tileSize / 2 + Math.cos(tile.riverDirection) * (tileSize / 2),
            py + tileSize / 2 + Math.sin(tile.riverDirection) * (tileSize / 2)
          );
          ctx.stroke();
        }

        // Settlement
        if (tile.settlementId && state.settlements[tile.settlementId]) {
          const sett = state.settlements[tile.settlementId];
          const settCanvas = CivilizationSpriteEngine.getSettlementCanvas(sett, 32);
          const spriteSize = Math.max(8, tileSize * 0.85);
          ctx.drawImage(settCanvas, px + (tileSize - spriteSize) / 2, py + (tileSize - spriteSize) / 2, spriteSize, spriteSize);
        }
      }
    }

    if (hoveredTile) {
      const hpx = originX + hoveredTile.x * tileSize;
      const hpy = originY + hoveredTile.y * tileSize;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.strokeRect(hpx, hpy, tileSize, tileSize);
    }

    // Outer frame
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(originX, originY, width * tileSize, height * tileSize);
  }

  // 2. SQUARE BOARD
  private static renderSquareBoard(
    ctx: CanvasRenderingContext2D,
    cw: number,
    ch: number,
    state: WorldState,
    camera: Camera3D,
    hoveredTile: { x: number; y: number } | null
  ) {
    const { grid, config } = state;
    const { width, height } = config;
    const tileSize = (Math.min(cw, ch) / height) * camera.zoom;
    const originX = (cw - width * tileSize) / 2 + camera.x;
    const originY = (ch - height * tileSize) / 2 + camera.y;

    // Dark tabletop surface
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, cw, ch);

    // Beveled wood/metal board slab shadow & border
    const boardPadding = 16;
    ctx.fillStyle = '#0f172a';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 15;
    ctx.fillRect(originX - boardPadding, originY - boardPadding, width * tileSize + boardPadding * 2, height * tileSize + boardPadding * 2 + 10);
    ctx.shadowColor = 'transparent';

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 4;
    ctx.strokeRect(originX - boardPadding, originY - boardPadding, width * tileSize + boardPadding * 2, height * tileSize + boardPadding * 2);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tile = grid[y][x];
        const px = originX + x * tileSize;
        const py = originY + y * tileSize;

        const tileImg = BiomeTilesetEngine.getTileCanvas(tile.biome, x + y * width, x % 4);
        ctx.drawImage(tileImg, px, py, tileSize + 0.5, tileSize + 0.5);

        if (tile.settlementId && state.settlements[tile.settlementId]) {
          const sett = state.settlements[tile.settlementId];
          const settCanvas = CivilizationSpriteEngine.getSettlementCanvas(sett, 32);
          const spriteSize = Math.max(8, tileSize * 0.85);
          ctx.drawImage(settCanvas, px + (tileSize - spriteSize) / 2, py + (tileSize - spriteSize) / 2, spriteSize, spriteSize);
        }
      }
    }
  }

  // 3 & 4. GLOBE & SNOW GLOBE
  private static renderGlobe(
    ctx: CanvasRenderingContext2D,
    cw: number,
    ch: number,
    state: WorldState,
    camera: Camera3D,
    hoveredTile: { x: number; y: number } | null,
    isSnowGlobe: boolean,
    time: number
  ) {
    const { grid, config } = state;
    const { width, height } = config;
    const centerCanvasX = cw / 2 + camera.x;
    const centerCanvasY = ch / 2 + camera.y;
    const radius = (Math.min(cw, ch) * 0.38) * camera.zoom;

    // Deep space
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, cw, ch);

    // Snow Globe Pedestal Base
    if (isSnowGlobe) {
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.ellipse(centerCanvasX, centerCanvasY + radius + 15, radius * 0.8, 25, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d97706'; // Gold rim
      ctx.beginPath();
      ctx.ellipse(centerCanvasX, centerCanvasY + radius + 5, radius * 0.75, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Globe clip circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerCanvasX, centerCanvasY, radius, 0, Math.PI * 2);
    ctx.clip();

    // Ocean deep base fill
    ctx.fillStyle = '#0f2744';
    ctx.fillRect(centerCanvasX - radius, centerCanvasY - radius, radius * 2, radius * 2);

    // Render spherical latitude/longitude grid samples
    const samples = 90;
    const cosY = Math.cos(camera.rotY);
    const sinY = Math.sin(camera.rotY);
    const cosX = Math.cos(camera.rotX);
    const sinX = Math.sin(camera.rotX);

    for (let sy = 0; sy < samples; sy++) {
      const v = sy / samples;
      const lat = (v - 0.5) * Math.PI;
      const cosLat = Math.cos(lat);
      const sinLat = Math.sin(lat);

      for (let sx = 0; sx < samples; sx++) {
        const u = sx / samples;
        const lon = (u - 0.5) * (Math.PI * 2);

        // 3D Sphere point
        const px = cosLat * Math.sin(lon);
        const py = sinLat;
        const pz = cosLat * Math.cos(lon);

        // Apply pitch (rotX) and yaw (rotY)
        const rx1 = px * cosY - pz * sinY;
        const rz1 = px * sinY + pz * cosY;
        const ry2 = py * cosX - rz1 * sinX;
        const rz2 = py * sinX + rz1 * cosX;

        // Only draw visible hemisphere facing camera (rz2 > 0)
        if (rz2 > 0) {
          const screenX = centerCanvasX + rx1 * radius;
          const screenY = centerCanvasY - ry2 * radius;

          const gx = Math.floor(u * width) % width;
          const gy = Math.floor((1 - v) * height);
          const tile = grid[gy]?.[gx];

          if (tile) {
            // Spherical pixel dot with shading
            const lumShade = Math.max(0.4, rz2);
            ctx.fillStyle = this.getTileColorShaded(tile, lumShade);
            const dotSize = Math.max(2.5, (radius / samples) * 2.2);
            ctx.fillRect(screenX - dotSize / 2, screenY - dotSize / 2, dotSize, dotSize);
          }
        }
      }
    }

    // Atmospheric rim glow & limb darkening
    const rimGrad = ctx.createRadialGradient(centerCanvasX, centerCanvasY, radius * 0.7, centerCanvasX, centerCanvasY, radius);
    rimGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
    rimGrad.addColorStop(0.85, 'rgba(56, 189, 248, 0.25)');
    rimGrad.addColorStop(1, 'rgba(14, 165, 233, 0.6)');
    ctx.fillStyle = rimGrad;
    ctx.fillRect(centerCanvasX - radius, centerCanvasY - radius, radius * 2, radius * 2);

    // Snow Globe Floating Magic Particles
    if (isSnowGlobe) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      for (let i = 0; i < 35; i++) {
        const flakeX = centerCanvasX + Math.sin(time + i * 2.5) * (radius * 0.75);
        const flakeY = centerCanvasY + ((time * 20 + i * 18) % (radius * 1.6)) - radius * 0.8;
        ctx.beginPath();
        ctx.arc(flakeX, flakeY, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();

    // Snow Globe Glass Dome Highlight & Reflection
    if (isSnowGlobe) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(centerCanvasX, centerCanvasY, radius, 0, Math.PI * 2);
      ctx.stroke();

      // Curved glass reflection arc
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(centerCanvasX, centerCanvasY, radius * 0.92, -Math.PI * 0.75, -Math.PI * 0.35);
      ctx.stroke();
    }
  }

  // 5. RELIEF / DIORAMA SLAB
  private static renderReliefDiorama(
    ctx: CanvasRenderingContext2D,
    cw: number,
    ch: number,
    state: WorldState,
    camera: Camera3D,
    hoveredTile: { x: number; y: number } | null
  ) {
    const { grid, config } = state;
    const { width, height } = config;
    const centerCanvasX = cw / 2 + camera.x;
    const centerCanvasY = ch / 2 + camera.y;

    ctx.fillStyle = '#060a12';
    ctx.fillRect(0, 0, cw, ch);

    const isoW = 28 * camera.zoom;
    const isoH = 14 * camera.zoom;

    // Draw isometric tiles sorted back-to-front (y from 0 to height, x from 0 to width)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tile = grid[y][x];
        const screenX = centerCanvasX + (x - y) * (isoW / 2);
        const elevOffset = tile.isWater ? 0 : Math.round(tile.elevation * 45 * camera.zoom);
        const screenY = centerCanvasY + (x + y) * (isoH / 2) - elevOffset - (height * isoH) / 4;

        if (screenX + isoW < 0 || screenX - isoW > cw || screenY + isoH < 0 || screenY - isoH > ch) continue;

        // Extruded vertical slab walls
        if (elevOffset > 0) {
          ctx.fillStyle = '#334155';
          ctx.beginPath();
          ctx.moveTo(screenX - isoW / 2, screenY + isoH / 2);
          ctx.lineTo(screenX, screenY + isoH);
          ctx.lineTo(screenX, screenY + isoH + elevOffset);
          ctx.lineTo(screenX - isoW / 2, screenY + isoH / 2 + elevOffset);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = '#1e293b';
          ctx.beginPath();
          ctx.moveTo(screenX, screenY + isoH);
          ctx.lineTo(screenX + isoW / 2, screenY + isoH / 2);
          ctx.lineTo(screenX + isoW / 2, screenY + isoH / 2 + elevOffset);
          ctx.lineTo(screenX, screenY + isoH + elevOffset);
          ctx.closePath();
          ctx.fill();
        }

        // Diamond top face
        ctx.fillStyle = this.getTileColor(tile);
        ctx.beginPath();
        ctx.moveTo(screenX, screenY);
        ctx.lineTo(screenX + isoW / 2, screenY + isoH / 2);
        ctx.lineTo(screenX, screenY + isoH);
        ctx.lineTo(screenX - isoW / 2, screenY + isoH / 2);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Settlement marker on isometric top
        if (tile.settlementId && state.settlements[tile.settlementId]) {
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(screenX, screenY + isoH / 2 - 4, 4 * camera.zoom, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  // 6. ORBITAL VIEW
  private static renderOrbitalView(
    ctx: CanvasRenderingContext2D,
    cw: number,
    ch: number,
    state: WorldState,
    camera: Camera3D,
    hoveredTile: { x: number; y: number } | null,
    time: number
  ) {
    // Render deep starfield background
    ctx.fillStyle = '#010409';
    ctx.fillRect(0, 0, cw, ch);

    // Random sparkling stars
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 80; i++) {
      const sx = ((i * 137.5) % cw);
      const sy = ((i * 293.3) % ch);
      const size = (i % 3 === 0) ? 1.8 : 1.0;
      ctx.fillRect(sx, sy, size, size);
    }

    // Render planet sphere via globe engine
    this.renderGlobe(ctx, cw, ch, state, camera, hoveredTile, false, time);

    // Render Orbiting Moon
    const centerCanvasX = cw / 2 + camera.x;
    const centerCanvasY = ch / 2 + camera.y;
    const radius = (Math.min(cw, ch) * 0.38) * camera.zoom;
    const moonAngle = time * 0.5;
    const moonDist = radius * 1.5;
    const moonX = centerCanvasX + Math.cos(moonAngle) * moonDist;
    const moonY = centerCanvasY + Math.sin(moonAngle) * (moonDist * 0.35);

    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.arc(moonX, moonY, Math.max(4, 7 * camera.zoom), 0, Math.PI * 2);
    ctx.fill();
  }

  private static getTileColor(tile: Tile): string {
    if (tile.isWater) {
      const depthLum = Math.max(10, Math.min(30, 25 - tile.waterDepth * 20));
      return `hsl(215, 85%, ${depthLum}%)`;
    }
    const elevLum = Math.max(20, Math.min(85, 30 + tile.elevation * 50));
    const greenSat = Math.max(10, Math.min(60, tile.moisture * 60));
    return `hsl(95, ${greenSat}%, ${elevLum}%)`;
  }

  private static getTileColorShaded(tile: Tile, shade: number): string {
    if (tile.isWater) {
      const depthLum = Math.max(6, Math.min(35, (25 - tile.waterDepth * 20) * shade));
      return `hsl(215, 85%, ${depthLum}%)`;
    }
    const elevLum = Math.max(10, Math.min(90, (30 + tile.elevation * 50) * shade));
    const greenSat = Math.max(10, Math.min(60, tile.moisture * 60));
    return `hsl(95, ${greenSat}%, ${elevLum}%)`;
  }
}
