// WORLDSEED — 2D cartographic presentation renderer
//
// Draws the shared planetary surface image (see visuals/terrain/planetSurface.ts) with
// per-mode cartographic treatment. Terrain, hydrology, coastlines and settlement
// footprints all come from that one composited image, so the flat views and the WebGL
// hero views are unmistakably the same planet.

import { WorldViewMode, WorldState } from '../../types/simulation';
import { Camera3D, WorldProjectionEngine } from './projections';

export interface SurfaceDrawContext {
  surface: HTMLCanvasElement | null;
  selectedTile: { x: number; y: number } | null;
}

interface Frame {
  originX: number;
  originY: number;
  tileSize: number;
}

const SETTLEMENT_TIER_RANK: Record<string, number> = {
  CAMP: 0,
  HAMLET: 1,
  VILLAGE: 2,
  TOWN: 3,
  CITY: 4,
  METROPOLIS: 5,
  MEGALOPOLIS: 6
};

export class WorldViewRenderer {
  public static renderView(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    state: WorldState,
    viewMode: WorldViewMode,
    camera: Camera3D,
    hoveredTile: { x: number; y: number } | null,
    time: number,
    draw: SurfaceDrawContext = { surface: null, selectedTile: null }
  ) {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    switch (viewMode) {
      case 'SQUARE_TILE':
        this.renderSquareWorld(ctx, canvasWidth, canvasHeight, state, camera, hoveredTile, draw);
        break;
      case 'GLOBE':
      case 'SNOW_GLOBE':
      case 'ORBITAL_VIEW':
        this.renderSphereFallback(ctx, canvasWidth, canvasHeight, state, camera, draw, time);
        break;
      default:
        this.renderFlatAtlas(ctx, canvasWidth, canvasHeight, state, camera, hoveredTile, draw);
        break;
    }
  }

  private static frameFor(cw: number, ch: number, state: WorldState, camera: Camera3D): Frame {
    // Shared with the hit test and the minimap so what is drawn is exactly what is clickable.
    return WorldProjectionEngine.frame(cw, ch, state.config.width, state.config.height, camera);
  }

  public static frameMetrics(cw: number, ch: number, state: WorldState, camera: Camera3D): Frame {
    return this.frameFor(cw, ch, state, camera);
  }

  // ---------------------------------------------------------------- FLAT ATLAS

  private static renderFlatAtlas(
    ctx: CanvasRenderingContext2D,
    cw: number,
    ch: number,
    state: WorldState,
    camera: Camera3D,
    hoveredTile: { x: number; y: number } | null,
    draw: SurfaceDrawContext
  ) {
    const { width, height } = state.config;
    const { tileSize, originX, originY } = this.frameFor(cw, ch, state, camera);
    const mapW = width * tileSize;
    const mapH = height * tileSize;

    this.paintVoid(ctx, cw, ch);

    if (draw.surface) {
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      // Soft cast shadow so the chart reads as a sheet lying over the void.
      ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
      ctx.shadowBlur = 34;
      ctx.shadowOffsetY = 10;
      ctx.drawImage(draw.surface, originX, originY, mapW, mapH);
      ctx.restore();
    }

    this.paintGraticule(ctx, originX, originY, mapW, mapH, tileSize, state);
    this.paintPlaces(ctx, state, { originX, originY, tileSize }, cw, ch);
    this.paintTileMarkers(ctx, state, { originX, originY, tileSize }, hoveredTile, draw.selectedTile);

    // Neat map border keeps the atlas feeling like a chart, not a bleeding texture.
    ctx.strokeStyle = 'rgba(150, 180, 214, 0.28)';
    ctx.lineWidth = 1;
    ctx.strokeRect(originX + 0.5, originY + 0.5, mapW - 1, mapH - 1);

    this.paintVignette(ctx, cw, ch);
  }

  // ---------------------------------------------------------------- SQUARE WORLD

  private static renderSquareWorld(
    ctx: CanvasRenderingContext2D,
    cw: number,
    ch: number,
    state: WorldState,
    camera: Camera3D,
    hoveredTile: { x: number; y: number } | null,
    draw: SurfaceDrawContext
  ) {
    const { width, height } = state.config;
    const { tileSize, originX, originY } = this.frameFor(cw, ch, state, camera);
    const mapW = width * tileSize;
    const mapH = height * tileSize;

    // Tabletop backdrop: warmer and closer than deep space, because a bounded square world
    // is an object you look down at rather than a body you orbit.
    const table = ctx.createRadialGradient(cw / 2, ch * 0.42, Math.min(cw, ch) * 0.1, cw / 2, ch / 2, Math.max(cw, ch) * 0.8);
    table.addColorStop(0, '#171a22');
    table.addColorStop(1, '#07090e');
    ctx.fillStyle = table;
    ctx.fillRect(0, 0, cw, ch);

    const bevel = Math.max(10, tileSize * 0.75);

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
    ctx.shadowBlur = 46;
    ctx.shadowOffsetY = 22;
    ctx.fillStyle = '#2c2114';
    this.roundRect(ctx, originX - bevel, originY - bevel, mapW + bevel * 2, mapH + bevel * 2, bevel * 0.5);
    ctx.fill();
    ctx.restore();

    // Brass frame edge.
    const rim = ctx.createLinearGradient(originX, originY - bevel, originX, originY + mapH + bevel);
    rim.addColorStop(0, 'rgba(214, 176, 108, 0.85)');
    rim.addColorStop(0.5, 'rgba(126, 98, 58, 0.7)');
    rim.addColorStop(1, 'rgba(78, 58, 32, 0.9)');
    ctx.strokeStyle = rim;
    ctx.lineWidth = Math.max(2, bevel * 0.16);
    this.roundRect(ctx, originX - bevel * 0.5, originY - bevel * 0.5, mapW + bevel, mapH + bevel, bevel * 0.3);
    ctx.stroke();

    if (draw.surface) {
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(draw.surface, originX, originY, mapW, mapH);
      ctx.restore();
    }

    // Board grid: this world genuinely has hard edges, so the grid is meaningful here.
    ctx.strokeStyle = 'rgba(12, 16, 22, 0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const gridStep = Math.max(1, Math.round(8 / Math.max(0.35, camera.zoom)));
    for (let x = 0; x <= width; x += gridStep) {
      ctx.moveTo(originX + x * tileSize, originY);
      ctx.lineTo(originX + x * tileSize, originY + mapH);
    }
    for (let y = 0; y <= height; y += gridStep) {
      ctx.moveTo(originX, originY + y * tileSize);
      ctx.lineTo(originX + mapW, originY + y * tileSize);
    }
    ctx.stroke();

    // Edge-of-world falloff: a bounded slab literally ends.
    const edge = ctx.createLinearGradient(originX, originY, originX, originY + mapH);
    edge.addColorStop(0, 'rgba(6, 9, 14, 0.55)');
    edge.addColorStop(0.12, 'rgba(6, 9, 14, 0)');
    edge.addColorStop(0.88, 'rgba(6, 9, 14, 0)');
    edge.addColorStop(1, 'rgba(6, 9, 14, 0.55)');
    ctx.fillStyle = edge;
    ctx.fillRect(originX, originY, mapW, mapH);

    this.paintPlaces(ctx, state, { originX, originY, tileSize }, cw, ch);
    this.paintTileMarkers(ctx, state, { originX, originY, tileSize }, hoveredTile, draw.selectedTile);
    this.paintVignette(ctx, cw, ch);
  }

  // ---------------------------------------------------------------- SPHERE FALLBACK

  /**
   * Software sphere used only when WebGL is unavailable. It warps the shared surface image
   * into an orthographic globe so the product still shows a planet rather than an error.
   */
  private static renderSphereFallback(
    ctx: CanvasRenderingContext2D,
    cw: number,
    ch: number,
    state: WorldState,
    camera: Camera3D,
    draw: SurfaceDrawContext,
    time: number
  ) {
    this.paintVoid(ctx, cw, ch);
    if (!draw.surface) return;

    const cx = cw / 2 + camera.x;
    const cy = ch / 2 + camera.y;
    const radius = Math.min(cw, ch) * 0.4 * camera.zoom;
    const src = draw.surface;
    const columns = Math.max(64, Math.floor(radius));

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();

    const yawOffset = ((camera.rotY / (Math.PI * 2)) % 1 + 1) % 1;
    for (let i = 0; i < columns; i++) {
      const t = i / columns;
      const lon = (t - 0.5) * Math.PI;
      const screenX = cx + Math.sin(lon) * radius;
      const nextX = cx + Math.sin(((i + 1) / columns - 0.5) * Math.PI) * radius;
      const colW = Math.max(1, nextX - screenX);
      const srcX = ((t + yawOffset) % 1) * src.width;
      ctx.drawImage(src, srcX, 0, Math.max(1, src.width / columns), src.height, screenX, cy - radius, colW + 1, radius * 2);
    }

    // Spherical shading and limb darkening.
    const shade = ctx.createRadialGradient(cx - radius * 0.4, cy - radius * 0.4, radius * 0.1, cx, cy, radius);
    shade.addColorStop(0, 'rgba(255, 246, 226, 0.22)');
    shade.addColorStop(0.55, 'rgba(0, 0, 0, 0)');
    shade.addColorStop(1, 'rgba(0, 0, 0, 0.75)');
    ctx.fillStyle = shade;
    ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
    ctx.restore();

    const atmo = ctx.createRadialGradient(cx, cy, radius * 0.94, cx, cy, radius * 1.1);
    atmo.addColorStop(0, 'rgba(111, 208, 255, 0.35)');
    atmo.addColorStop(1, 'rgba(111, 208, 255, 0)');
    ctx.fillStyle = atmo;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 1.1, 0, Math.PI * 2);
    ctx.fill();
    void time;
  }

  // ---------------------------------------------------------------- SHARED PARTS

  private static paintVoid(ctx: CanvasRenderingContext2D, cw: number, ch: number) {
    const bg = ctx.createRadialGradient(cw / 2, ch * 0.45, 0, cw / 2, ch / 2, Math.max(cw, ch) * 0.75);
    bg.addColorStop(0, '#0a1018');
    bg.addColorStop(1, '#04060b');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, cw, ch);
  }

  private static paintVignette(ctx: CanvasRenderingContext2D, cw: number, ch: number) {
    const v = ctx.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * 0.35, cw / 2, ch / 2, Math.max(cw, ch) * 0.75);
    v.addColorStop(0, 'rgba(0, 0, 0, 0)');
    v.addColorStop(1, 'rgba(0, 0, 0, 0.42)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, cw, ch);
  }

  /** Latitude/longitude reference lines, spaced so they never crowd the terrain. */
  private static paintGraticule(
    ctx: CanvasRenderingContext2D,
    originX: number,
    originY: number,
    mapW: number,
    mapH: number,
    tileSize: number,
    state: WorldState
  ) {
    const { width, height } = state.config;
    const step = Math.max(4, Math.round(12 / Math.max(0.4, tileSize / 14)));
    ctx.save();
    ctx.strokeStyle = 'rgba(180, 205, 235, 0.09)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = step; x < width; x += step) {
      ctx.moveTo(originX + x * tileSize, originY);
      ctx.lineTo(originX + x * tileSize, originY + mapH);
    }
    for (let y = step; y < height; y += step) {
      ctx.moveTo(originX, originY + y * tileSize);
      ctx.lineTo(originX + mapW, originY + y * tileSize);
    }
    ctx.stroke();

    // The equator is the one line worth emphasising on a spherical world.
    if (state.config.topology !== 'PLANAR_BOUNDED') {
      ctx.strokeStyle = 'rgba(226, 196, 132, 0.24)';
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(originX, originY + mapH / 2);
      ctx.lineTo(originX + mapW, originY + mapH / 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }

  /**
   * Settlement, ruin and capital symbols. One vocabulary: a filled core sized by real
   * population, a ring for polity capitals, a broken glyph for ruins. Labels appear only
   * when there is room for them.
   */
  private static paintPlaces(
    ctx: CanvasRenderingContext2D,
    state: WorldState,
    frame: Frame,
    cw: number,
    ch: number
  ) {
    const { originX, originY, tileSize } = frame;
    const showLabels = tileSize > 15;

    ctx.save();
    ctx.lineJoin = 'round';

    // Ruins first, so living settlements always draw over their own past.
    for (let y = 0; y < state.config.height; y++) {
      for (let x = 0; x < state.config.width; x++) {
        const tile = state.grid[y][x];
        if (tile.ruins.length === 0) continue;
        const px = originX + (x + 0.5) * tileSize;
        const py = originY + (y + 0.5) * tileSize;
        if (px < -40 || px > cw + 40 || py < -40 || py > ch + 40) continue;
        const s = Math.max(3.5, tileSize * 0.26);
        ctx.strokeStyle = 'rgba(183, 155, 255, 0.9)';
        ctx.lineWidth = Math.max(1.2, s * 0.22);
        ctx.beginPath();
        ctx.moveTo(px - s, py + s * 0.7);
        ctx.lineTo(px - s * 0.35, py - s * 0.5);
        ctx.moveTo(px + s * 0.1, py + s * 0.7);
        ctx.lineTo(px + s * 0.1, py - s * 0.2);
        ctx.moveTo(px + s * 0.75, py + s * 0.7);
        ctx.lineTo(px + s * 0.75, py - s * 0.6);
        ctx.stroke();
      }
    }

    const settlements = Object.values(state.settlements);
    for (const s of settlements) {
      const px = originX + (s.tileX + 0.5) * tileSize;
      const py = originY + (s.tileY + 0.5) * tileSize;
      if (px < -60 || px > cw + 60 || py < -60 || py > ch + 60) continue;

      const rank = SETTLEMENT_TIER_RANK[s.tier] ?? 2;
      const r = Math.max(2.6, tileSize * (0.14 + rank * 0.045));
      const polity = state.polities[s.polityId];
      const isCapital = polity?.capitalSettlementId === s.id;

      if (s.isAbandoned) {
        ctx.strokeStyle = 'rgba(150, 148, 160, 0.75)';
        ctx.lineWidth = Math.max(1, r * 0.3);
        ctx.beginPath();
        ctx.arc(px, py, r * 0.8, 0, Math.PI * 2);
        ctx.stroke();
        continue;
      }

      ctx.beginPath();
      ctx.arc(px, py, r * 1.9, 0, Math.PI * 2);
      const glow = ctx.createRadialGradient(px, py, 0, px, py, r * 1.9);
      glow.addColorStop(0, 'rgba(255, 206, 138, 0.5)');
      glow.addColorStop(1, 'rgba(255, 206, 138, 0)');
      ctx.fillStyle = glow;
      ctx.fill();

      ctx.fillStyle = '#f7d9a4';
      ctx.strokeStyle = 'rgba(28, 20, 10, 0.85)';
      ctx.lineWidth = Math.max(0.8, r * 0.25);
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (isCapital) {
        ctx.strokeStyle = 'rgba(255, 226, 168, 0.95)';
        ctx.lineWidth = Math.max(1, r * 0.24);
        ctx.beginPath();
        ctx.arc(px, py, r * 1.75, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (showLabels && rank >= 2) {
        const label = s.name;
        ctx.font = `${Math.max(10, Math.min(15, tileSize * 0.52))}px ui-serif, Georgia, serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(4, 7, 12, 0.9)';
        ctx.strokeText(label, px, py - r * 1.9);
        ctx.fillStyle = 'rgba(248, 236, 214, 0.95)';
        ctx.fillText(label, px, py - r * 1.9);
      }
    }
    ctx.restore();
  }

  private static paintTileMarkers(
    ctx: CanvasRenderingContext2D,
    state: WorldState,
    frame: Frame,
    hoveredTile: { x: number; y: number } | null,
    selectedTile: { x: number; y: number } | null
  ) {
    const { originX, originY, tileSize } = frame;
    void state;

    if (hoveredTile) {
      ctx.strokeStyle = 'rgba(180, 224, 255, 0.55)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(originX + hoveredTile.x * tileSize, originY + hoveredTile.y * tileSize, tileSize, tileSize);
    }

    if (selectedTile) {
      const px = originX + selectedTile.x * tileSize;
      const py = originY + selectedTile.y * tileSize;
      const pad = Math.max(3, tileSize * 0.3);
      ctx.strokeStyle = '#6fd0ff';
      ctx.lineWidth = 2;
      // Corner brackets read as "this is under inspection" without hiding the terrain.
      ctx.beginPath();
      ctx.moveTo(px - 2, py + pad);
      ctx.lineTo(px - 2, py - 2);
      ctx.lineTo(px + pad, py - 2);
      ctx.moveTo(px + tileSize - pad, py - 2);
      ctx.lineTo(px + tileSize + 2, py - 2);
      ctx.lineTo(px + tileSize + 2, py + pad);
      ctx.moveTo(px + tileSize + 2, py + tileSize - pad);
      ctx.lineTo(px + tileSize + 2, py + tileSize + 2);
      ctx.lineTo(px + tileSize - pad, py + tileSize + 2);
      ctx.moveTo(px + pad, py + tileSize + 2);
      ctx.lineTo(px - 2, py + tileSize + 2);
      ctx.lineTo(px - 2, py + tileSize - pad);
      ctx.stroke();
    }
  }

  private static roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }
}
