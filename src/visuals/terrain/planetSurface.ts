// WORLDSEED — shared fast planetary surface compositor.
//
// One authoritative 2D surface is used by the atlas, square world and locator. The WebGL
// hero renderer now builds its own lightweight 2:1 globe texture directly from the same
// simulation state, avoiding expensive duplicate multi-map CPU work.

import { BiomeType, WorldState } from '../../types/simulation';

export type SurfaceLayer =
  | 'PHYSICAL'
  | 'BIOMES'
  | 'TEMPERATURE'
  | 'RAINFALL'
  | 'BIODIVERSITY'
  | 'POLITICAL'
  | 'SETTLEMENTS'
  | 'CULTURES'
  | 'LANGUAGES'
  | 'DISEASES'
  | 'RUINS_ARCHAEOLOGY'
  | 'ENVIRONMENTAL_SCARS';

interface RGB {
  r: number;
  g: number;
  b: number;
}

const BIOME_RGB: Record<BiomeType, RGB> = {
  DEEP_OCEAN: { r: 8, g: 28, b: 52 },
  SHALLOW_OCEAN: { r: 24, g: 92, b: 128 },
  HYDROTHERMAL_RIFT: { r: 70, g: 34, b: 48 },
  COASTAL_REEF: { r: 40, g: 128, b: 142 },
  TUNDRA: { r: 142, g: 151, b: 148 },
  TAIGA: { r: 40, g: 72, b: 59 },
  TEMPERATE_FOREST: { r: 52, g: 92, b: 48 },
  TEMPERATE_GRASSLAND: { r: 111, g: 127, b: 66 },
  TROPICAL_RAINFOREST: { r: 31, g: 78, b: 42 },
  SAVANNA: { r: 151, g: 132, b: 68 },
  HOT_DESERT: { r: 188, g: 158, b: 101 },
  COLD_DESERT: { r: 132, g: 132, b: 124 },
  WETLAND: { r: 61, g: 100, b: 79 },
  ALPINE: { r: 170, g: 176, b: 184 },
  VOLCANIC_BARREN: { r: 62, g: 53, b: 50 }
};

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const visualNoise = (seed: number, x: number, y: number, channel = 0): number => {
  let h = (seed | 0) ^ Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(channel | 0, 0x9e3779b9);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
};

const hashHue = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  return Math.abs(hash) % 360;
};

const hslToRgb = (h: number, s: number, l: number): RGB => {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = l - c / 2;
  return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) };
};

export interface PlanetSurfaceResult {
  canvas: HTMLCanvasElement;
  revision: number;
  pixelWidth: number;
  pixelHeight: number;
}

export class PlanetSurfaceCompositor {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private image: ImageData | null = null;
  private gridWidth = 0;
  private gridHeight = 0;
  private pxPerTile = 0;
  private revision = 0;
  private lastSignature = '';
  private lastLayer: SurfaceLayer | null = null;
  private lastPaintAt = -Infinity;

  private elevation = new Float32Array(0);
  private temperature = new Float32Array(0);
  private moisture = new Float32Array(0);
  private vegetation = new Float32Array(0);
  private damage = new Float32Array(0);
  private shade = new Float32Array(0);

  constructor(private readonly quality: number = 10) {}

  public getRevision(): number {
    return this.revision;
  }

  public compose(state: WorldState, layer: SurfaceLayer, signature: string): PlanetSurfaceResult {
    const { width, height } = state.config;
    // The simulation contains 64x48 authoritative cells by default. Beyond seven display
    // pixels per cell the old compositor was mostly spending CPU on invented micro-detail.
    const pxPerTile = Math.max(3, Math.min(this.quality, 7));

    if (!this.canvas || width !== this.gridWidth || height !== this.gridHeight || pxPerTile !== this.pxPerTile) {
      this.allocate(width, height, pxPerTile);
      this.lastSignature = '';
      this.lastLayer = null;
    }

    const normalized = this.normalizeSignature(signature);
    const fullSignature = `${layer}|${normalized}`;
    const layerChanged = layer !== this.lastLayer;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();

    // Layer changes are immediate. Simulation-driven texture changes are capped at four
    // refreshes per second, and the five-year counter itself is ignored by normalizeSignature.
    if (fullSignature !== this.lastSignature && (layerChanged || now - this.lastPaintAt >= 250)) {
      this.paint(state, layer);
      this.lastSignature = fullSignature;
      this.lastLayer = layer;
      this.lastPaintAt = now;
      this.revision++;
    }

    return {
      canvas: this.canvas!,
      revision: this.revision,
      pixelWidth: this.canvas!.width,
      pixelHeight: this.canvas!.height
    };
  }

  public dispose() {
    this.canvas = null;
    this.ctx = null;
    this.image = null;
    this.elevation = new Float32Array(0);
    this.temperature = new Float32Array(0);
    this.moisture = new Float32Array(0);
    this.vegetation = new Float32Array(0);
    this.damage = new Float32Array(0);
    this.shade = new Float32Array(0);
    this.lastSignature = '';
    this.lastLayer = null;
  }

  private normalizeSignature(signature: string): string {
    // WorldCanvas historically inserted floor(currentYear/5) as field two, forcing a full
    // raster rebuild every five simulated years even when the visible world had not changed.
    // Keep the meaningful visual buckets and discard that clock-only field.
    const parts = signature.split(':');
    if (parts.length >= 7) return [parts[0], parts[2], parts[3], parts[4], parts[5], parts[6]].join(':');
    return signature;
  }

  private allocate(width: number, height: number, pxPerTile: number) {
    const canvas = document.createElement('canvas');
    canvas.width = width * pxPerTile;
    canvas.height = height * pxPerTile;
    const ctx = canvas.getContext('2d', { willReadFrequently: false });
    if (!ctx) throw new Error('WORLDSEED could not allocate the planetary surface canvas.');
    this.canvas = canvas;
    this.ctx = ctx;
    this.image = ctx.createImageData(canvas.width, canvas.height);
    this.gridWidth = width;
    this.gridHeight = height;
    this.pxPerTile = pxPerTile;
    const cells = width * height;
    this.elevation = new Float32Array(cells);
    this.temperature = new Float32Array(cells);
    this.moisture = new Float32Array(cells);
    this.vegetation = new Float32Array(cells);
    this.damage = new Float32Array(cells);
    this.shade = new Float32Array(cells);
  }

  private readFields(state: WorldState) {
    const { width, height } = state.config;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tile = state.grid[y][x];
        const i = y * width + x;
        this.elevation[i] = tile.elevation;
        this.temperature[i] = tile.currentTemp;
        this.moisture[i] = tile.moisture;
        this.vegetation[i] = tile.vegetationDensity;
        this.damage[i] = Math.max(tile.environmentalDamage, tile.pollution, tile.erosionLevel);
      }
    }

    for (let y = 0; y < height; y++) {
      const ym = Math.max(0, y - 1);
      const yp = Math.min(height - 1, y + 1);
      for (let x = 0; x < width; x++) {
        const xm = (x - 1 + width) % width;
        const xp = (x + 1) % width;
        const dx = this.elevation[y * width + xm] - this.elevation[y * width + xp];
        const dy = this.elevation[ym * width + x] - this.elevation[yp * width + x];
        this.shade[y * width + x] = clamp(0.98 + dx * 1.35 + dy * 1.05, 0.72, 1.2);
      }
    }
  }

  private sample(field: Float32Array, tx: number, ty: number): number {
    const w = this.gridWidth;
    const h = this.gridHeight;
    const fx = tx - 0.5;
    const fy = clamp(ty - 0.5, 0, h - 1);
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const dx = fx - x0;
    const dy = fy - y0;
    const xa = ((x0 % w) + w) % w;
    const xb = ((x0 + 1) % w + w) % w;
    const ya = clamp(y0, 0, h - 1);
    const yb = clamp(y0 + 1, 0, h - 1);
    const a = field[ya * w + xa];
    const b = field[ya * w + xb];
    const c = field[yb * w + xa];
    const d = field[yb * w + xb];
    return lerp(lerp(a, b, dx), lerp(c, d, dx), dy);
  }

  private tileAt(state: WorldState, tx: number, ty: number) {
    const x = ((Math.floor(tx) % this.gridWidth) + this.gridWidth) % this.gridWidth;
    const y = clamp(Math.floor(ty), 0, this.gridHeight - 1);
    return state.grid[y][x];
  }

  private thematicColor(state: WorldState, tx: number, ty: number, layer: SurfaceLayer): RGB | null {
    const tile = this.tileAt(state, tx, ty);
    switch (layer) {
      case 'BIOMES':
        return BIOME_RGB[tile.biome];
      case 'TEMPERATURE': {
        const t = clamp01((this.sample(this.temperature, tx, ty) + 35) / 85);
        return hslToRgb(226 - t * 220, 0.72, 0.3 + t * 0.18);
      }
      case 'RAINFALL': {
        const r = clamp01(tile.rainfall);
        return hslToRgb(214 - r * 38, 0.72, 0.22 + r * 0.34);
      }
      case 'BIODIVERSITY': {
        const activity = clamp01((tile.biomass / 1000 + this.sample(this.vegetation, tx, ty)) * 0.5);
        return hslToRgb(30 + activity * 105, 0.62, 0.24 + activity * 0.22);
      }
      case 'POLITICAL':
        return tile.polityId ? hslToRgb(hashHue(tile.polityId), 0.56, 0.46) : null;
      case 'SETTLEMENTS':
        return tile.settlementId ? { r: 239, g: 176, b: 84 } : tile.infrastructureLevel > 0 ? { r: 145, g: 108, b: 65 } : null;
      case 'CULTURES':
        return tile.dominantCultureId ? hslToRgb(hashHue(tile.dominantCultureId), 0.55, 0.46) : null;
      case 'LANGUAGES': {
        const culture = tile.dominantCultureId ? state.cultures[tile.dominantCultureId] : undefined;
        return culture?.languageId ? hslToRgb(hashHue(culture.languageId), 0.58, 0.47) : null;
      }
      case 'DISEASES':
        return tile.activeContagionIds.length > 0 ? { r: 218, g: 73, b: 68 } : null;
      case 'RUINS_ARCHAEOLOGY':
        return tile.ruins.length > 0 ? { r: 176, g: 126, b: 236 } : tile.fossils.length > 0 ? { r: 120, g: 95, b: 168 } : null;
      case 'ENVIRONMENTAL_SCARS': {
        const d = clamp01(this.sample(this.damage, tx, ty));
        return d > 0.03 ? hslToRgb(46 - d * 44, 0.7, 0.48 - d * 0.18) : null;
      }
      default:
        return null;
    }
  }

  private paint(state: WorldState, layer: SurfaceLayer) {
    const ctx = this.ctx!;
    const image = this.image!;
    const data = image.data;
    const pw = this.canvas!.width;
    const ph = this.canvas!.height;
    const px = this.pxPerTile;
    const sea = state.config.seaLevel;
    const seed = state.config.seed | 0;
    const physical = layer === 'PHYSICAL';

    this.readFields(state);

    for (let y = 0; y < ph; y++) {
      const ty = (y + 0.5) / px;
      for (let x = 0; x < pw; x++) {
        const tx = (x + 0.5) / px;
        const i = (y * pw + x) * 4;
        const e = this.sample(this.elevation, tx, ty);
        const coastNoise = (visualNoise(seed, x, y, 7) - 0.5) * 0.014;
        const water = e + coastNoise < sea;
        let r: number;
        let g: number;
        let b: number;

        if (water) {
          const depth = clamp01((sea - e) / Math.max(0.25, sea + 0.35));
          const ripple = (visualNoise(seed, x >> 1, y >> 1, 11) - 0.5) * 4;
          r = lerp(29, 7, depth) + ripple;
          g = lerp(102, 27, depth) + ripple;
          b = lerp(135, 50, depth) + ripple;
        } else {
          const tile = this.tileAt(state, tx, ty);
          const base = BIOME_RGB[tile.biome] ?? BIOME_RGB.TEMPERATE_GRASSLAND;
          const shade = this.sample(this.shade, tx, ty);
          const elev = clamp01((e - sea) / Math.max(0.1, 1 - sea));
          const grain = (visualNoise(seed, x, y, 17) - 0.5) * 0.075;
          const vegetation = clamp01(this.sample(this.vegetation, tx, ty));
          const factor = shade * (1 + grain + (elev > 0.7 ? (elev - 0.7) * 0.24 : 0) - vegetation * 0.045);
          r = base.r * factor;
          g = base.g * factor;
          b = base.b * factor;

          if (Math.abs(e - sea) < 0.025) {
            r = lerp(r, 176, 0.22);
            g = lerp(g, 154, 0.22);
            b = lerp(b, 104, 0.22);
          }
          const temp = this.sample(this.temperature, tx, ty);
          if (elev > 0.82 || temp < -8) {
            const snow = clamp01((elev - 0.78) * 4 + (-8 - temp) / 35);
            r = lerp(r, 214, snow * 0.62);
            g = lerp(g, 220, snow * 0.62);
            b = lerp(b, 224, snow * 0.62);
          }
        }

        if (!physical) {
          const thematic = this.thematicColor(state, tx, ty, layer);
          if (thematic) {
            r = lerp(r, thematic.r, 0.84);
            g = lerp(g, thematic.g, 0.84);
            b = lerp(b, thematic.b, 0.84);
          } else {
            r *= 0.62;
            g *= 0.62;
            b *= 0.62;
          }
        }

        data[i] = clamp(Math.round(r), 0, 255);
        data[i + 1] = clamp(Math.round(g), 0, 255);
        data[i + 2] = clamp(Math.round(b), 0, 255);
        data[i + 3] = 255;
      }
    }

    ctx.putImageData(image, 0, 0);
    this.paintHydrologyAndPlaces(state, layer);
  }

  private paintHydrologyAndPlaces(state: WorldState, layer: SurfaceLayer) {
    const ctx = this.ctx!;
    const px = this.pxPerTile;
    const showPhysicalDetail = layer === 'PHYSICAL' || layer === 'BIOMES';

    if (showPhysicalDetail) {
      ctx.save();
      ctx.lineCap = 'round';
      for (let y = 0; y < state.config.height; y++) {
        for (let x = 0; x < state.config.width; x++) {
          const tile = state.grid[y][x];
          const cx = (x + 0.5) * px;
          const cy = (y + 0.5) * px;
          if (tile.isLake) {
            ctx.fillStyle = 'rgba(31, 111, 149, 0.9)';
            ctx.beginPath();
            ctx.ellipse(cx, cy, px * 0.34, px * 0.25, 0, 0, Math.PI * 2);
            ctx.fill();
          }
          if (tile.riverFlow > 0.035) {
            const angle = Number.isFinite(tile.riverDirection) ? tile.riverDirection : 0;
            const len = px * (0.28 + Math.min(0.42, tile.riverFlow * 0.7));
            ctx.strokeStyle = `rgba(78, 165, 202, ${0.38 + Math.min(0.42, tile.riverFlow)})`;
            ctx.lineWidth = Math.max(0.7, Math.min(2.1, 0.65 + tile.riverFlow * 1.8));
            ctx.beginPath();
            ctx.moveTo(cx - Math.cos(angle) * len * 0.45, cy - Math.sin(angle) * len * 0.45);
            ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
            ctx.stroke();
          }
        }
      }
      ctx.restore();
    }

    ctx.save();
    for (let y = 0; y < state.config.height; y++) {
      for (let x = 0; x < state.config.width; x++) {
        const tile = state.grid[y][x];
        const cx = (x + 0.5) * px;
        const cy = (y + 0.5) * px;
        if (tile.settlementId) {
          ctx.fillStyle = 'rgba(245, 190, 91, 0.92)';
          ctx.beginPath();
          ctx.arc(cx, cy, Math.max(1, px * 0.18), 0, Math.PI * 2);
          ctx.fill();
        }
        if (tile.ruins.length > 0 && (layer === 'PHYSICAL' || layer === 'RUINS_ARCHAEOLOGY')) {
          ctx.strokeStyle = 'rgba(186, 145, 238, 0.8)';
          ctx.lineWidth = 1;
          const s = Math.max(1.5, px * 0.2);
          ctx.beginPath();
          ctx.moveTo(cx - s, cy - s);
          ctx.lineTo(cx + s, cy + s);
          ctx.moveTo(cx + s, cy - s);
          ctx.lineTo(cx - s, cy + s);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }
}
