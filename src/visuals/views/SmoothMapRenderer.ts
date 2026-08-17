import { WorldState, Tile, WorldViewMode } from '../../types/simulation';
import { Camera3D } from './projections';

const BIOME_COLORS: Record<string, string> = {
  DEEP_OCEAN: '#082a43',
  SHALLOW_OCEAN: '#176b87',
  HYDROTHERMAL_RIFT: '#4b3435',
  COASTAL_REEF: '#258b8c',
  TUNDRA: '#a2aaa8',
  TAIGA: '#315447',
  TEMPERATE_FOREST: '#3a6944',
  TEMPERATE_GRASSLAND: '#74874d',
  TROPICAL_RAINFOREST: '#265b3a',
  SAVANNA: '#8c783f',
  HOT_DESERT: '#b08b57',
  COLD_DESERT: '#898982',
  WETLAND: '#347362',
  ALPINE: '#c7cbc7',
  VOLCANIC_BARREN: '#574843'
};

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));

export class SmoothMapRenderer {
  private static cachedState: WorldState | null = null;
  private static cachedSurface: HTMLCanvasElement | null = null;

  private static tileColor(tile: Tile): string {
    const base = BIOME_COLORS[tile.biome] || '#4d6849';
    const color = document.createElement('canvas').getContext('2d');
    // Canvas color parsing is more expensive than simple HSL composition here, so use
    // biome hue plus bounded physical shading through an overlay in buildSurface().
    void color;
    return base;
  }

  private static buildSurface(state: WorldState): HTMLCanvasElement {
    const { width, height } = state.config;
    const low = document.createElement('canvas');
    low.width = width;
    low.height = height;
    const lowCtx = low.getContext('2d');
    if (!lowCtx) throw new Error('WORLDSEED could not create atlas source canvas.');

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tile = state.grid[y][x];
        lowCtx.fillStyle = this.tileColor(tile);
        lowCtx.fillRect(x, y, 1, 1);
      }
    }

    const scale = 18;
    const surface = document.createElement('canvas');
    surface.width = width * scale;
    surface.height = height * scale;
    const ctx = surface.getContext('2d');
    if (!ctx) throw new Error('WORLDSEED could not create atlas render canvas.');

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(low, 0, 0, surface.width, surface.height);

    const sx = surface.width / width;
    const sy = surface.height / height;

    // Broad physical shading and a restrained paper-like terrain texture.
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tile = state.grid[y][x];
        const px = x * sx;
        const py = y * sy;
        const elevation = clamp((tile.elevation + 0.35) / 1.35);
        const moisture = clamp(tile.rainfall);
        const lightness = tile.isWater
          ? 0.04 + (1 - clamp(tile.waterDepth)) * 0.06
          : (elevation - 0.45) * 0.18 + (moisture - 0.5) * 0.035;
        ctx.fillStyle = lightness >= 0
          ? `rgba(255,255,255,${Math.min(0.12, lightness)})`
          : `rgba(0,0,0,${Math.min(0.14, Math.abs(lightness))})`;
        ctx.fillRect(px, py, sx + 1, sy + 1);
      }
    }
    ctx.restore();

    // Coastlines are meaningful geography, not tile borders.
    ctx.save();
    ctx.strokeStyle = 'rgba(206, 231, 221, 0.24)';
    ctx.lineWidth = Math.max(1, scale * 0.055);
    ctx.lineJoin = 'round';
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tile = state.grid[y][x];
        if (tile.isWater) continue;
        const px = x * sx;
        const py = y * sy;
        if (state.grid[y - 1]?.[x]?.isWater) { ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + sx, py); ctx.stroke(); }
        if (state.grid[y + 1]?.[x]?.isWater) { ctx.beginPath(); ctx.moveTo(px, py + sy); ctx.lineTo(px + sx, py + sy); ctx.stroke(); }
        if (state.grid[y]?.[x - 1]?.isWater) { ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + sy); ctx.stroke(); }
        if (state.grid[y]?.[x + 1]?.isWater) { ctx.beginPath(); ctx.moveTo(px + sx, py); ctx.lineTo(px + sx, py + sy); ctx.stroke(); }
      }
    }
    ctx.restore();

    // Rivers are intentionally thin so they read as geography rather than UI marks.
    ctx.save();
    ctx.strokeStyle = 'rgba(91, 196, 222, 0.72)';
    ctx.lineCap = 'round';
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tile = state.grid[y][x];
        if (tile.isWater || tile.riverFlow <= 0.1) continue;
        const cx = (x + 0.5) * sx;
        const cy = (y + 0.5) * sy;
        ctx.lineWidth = Math.max(0.8, scale * (0.025 + tile.riverFlow * 0.035));
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(
          cx + Math.cos(tile.riverDirection) * sx * 0.58,
          cy + Math.sin(tile.riverDirection) * sy * 0.58
        );
        ctx.stroke();
      }
    }
    ctx.restore();

    return surface;
  }

  private static surface(state: WorldState) {
    if (this.cachedState !== state || !this.cachedSurface) {
      this.cachedState = state;
      this.cachedSurface = this.buildSurface(state);
    }
    return this.cachedSurface;
  }

  public static render(
    ctx: CanvasRenderingContext2D,
    cw: number,
    ch: number,
    state: WorldState,
    viewMode: Extract<WorldViewMode, 'FLAT_ATLAS' | 'SQUARE_TILE'>,
    camera: Camera3D,
    hoveredTile: { x: number; y: number } | null
  ) {
    const { width, height } = state.config;
    const tileSize = (Math.min(cw, ch) / height) * camera.zoom;
    const mapWidth = width * tileSize;
    const mapHeight = height * tileSize;
    const originX = (cw - mapWidth) / 2 + camera.x;
    const originY = (ch - mapHeight) / 2 + camera.y;

    const background = ctx.createRadialGradient(cw * 0.5, ch * 0.42, 20, cw * 0.5, ch * 0.5, Math.max(cw, ch) * 0.72);
    background.addColorStop(0, '#0a1720');
    background.addColorStop(0.55, '#040b12');
    background.addColorStop(1, '#02060b');
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, cw, ch);

    const boardPadding = viewMode === 'SQUARE_TILE' ? 22 : 0;
    if (viewMode === 'SQUARE_TILE') {
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.72)';
      ctx.shadowBlur = 42;
      ctx.shadowOffsetY = 18;
      ctx.fillStyle = '#11181c';
      ctx.beginPath();
      ctx.roundRect(originX - boardPadding, originY - boardPadding, mapWidth + boardPadding * 2, mapHeight + boardPadding * 2, 20);
      ctx.fill();
      ctx.restore();

      ctx.strokeStyle = 'rgba(210, 190, 144, 0.18)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(originX - boardPadding, originY - boardPadding, mapWidth + boardPadding * 2, mapHeight + boardPadding * 2, 20);
      ctx.stroke();
    }

    ctx.save();
    if (viewMode === 'SQUARE_TILE') {
      ctx.beginPath();
      ctx.roundRect(originX, originY, mapWidth, mapHeight, 10);
      ctx.clip();
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(this.surface(state), originX, originY, mapWidth, mapHeight);

    const edgeShade = ctx.createLinearGradient(originX, originY, originX, originY + mapHeight);
    edgeShade.addColorStop(0, 'rgba(255,255,255,0.035)');
    edgeShade.addColorStop(0.5, 'rgba(255,255,255,0)');
    edgeShade.addColorStop(1, 'rgba(0,0,0,0.08)');
    ctx.fillStyle = edgeShade;
    ctx.fillRect(originX, originY, mapWidth, mapHeight);
    ctx.restore();

    // Civilization and archaeology appear as restrained physical marks.
    for (const settlement of Object.values(state.settlements)) {
      const x = originX + (settlement.tileX + 0.5) * tileSize;
      const y = originY + (settlement.tileY + 0.5) * tileSize;
      if (x < originX || y < originY || x > originX + mapWidth || y > originY + mapHeight) continue;
      const radius = Math.max(2.3, Math.min(6.5, tileSize * (settlement.tier === 'METROPOLIS' ? 0.28 : settlement.tier === 'CITY' ? 0.22 : 0.17)));
      ctx.beginPath();
      ctx.arc(x, y, radius + 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(227, 183, 92, 0.12)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#e0b45a';
      ctx.fill();
    }

    for (const row of state.grid) {
      for (const tile of row) {
        if (tile.ruins.length === 0) continue;
        const x = originX + (tile.x + 0.5) * tileSize;
        const y = originY + (tile.y + 0.5) * tileSize;
        const r = Math.max(2.2, Math.min(5, tileSize * 0.16));
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = 'rgba(174, 144, 204, 0.82)';
        ctx.fillRect(-r, -r, r * 2, r * 2);
        ctx.restore();
      }
    }

    if (hoveredTile) {
      const x = originX + (hoveredTile.x + 0.5) * tileSize;
      const y = originY + (hoveredTile.y + 0.5) * tileSize;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(5, tileSize * 0.38), 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(125, 211, 252, 0.9)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    if (viewMode === 'FLAT_ATLAS') {
      ctx.strokeStyle = 'rgba(148, 184, 198, 0.14)';
      ctx.lineWidth = 1;
      ctx.strokeRect(originX, originY, mapWidth, mapHeight);
    }
  }
}
