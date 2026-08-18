// WORLDSEED — shared 2D planetary surface compositor.
//
// The authoritative simulation grid is intentionally coarse. This compositor therefore
// renders it like a deliberate physical atlas: continuous elevation/climate colour and real
// hydrology, with biome classes used as a restrained tint instead of giant rectangular paint
// swatches. It reuses its raster and never recomputes just because five simulated years passed
// in Physical/Biome view.

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
  DEEP_OCEAN: { r: 8, g: 29, b: 52 },
  SHALLOW_OCEAN: { r: 27, g: 91, b: 121 },
  HYDROTHERMAL_RIFT: { r: 74, g: 38, b: 49 },
  COASTAL_REEF: { r: 48, g: 121, b: 127 },
  TUNDRA: { r: 134, g: 143, b: 140 },
  TAIGA: { r: 47, g: 74, b: 60 },
  TEMPERATE_FOREST: { r: 54, g: 91, b: 49 },
  TEMPERATE_GRASSLAND: { r: 111, g: 125, b: 69 },
  TROPICAL_RAINFOREST: { r: 38, g: 82, b: 43 },
  SAVANNA: { r: 150, g: 130, b: 72 },
  HOT_DESERT: { r: 182, g: 151, b: 99 },
  COLD_DESERT: { r: 128, g: 130, b: 124 },
  WETLAND: { r: 64, g: 99, b: 79 },
  ALPINE: { r: 162, g: 168, b: 174 },
  VOLCANIC_BARREN: { r: 67, g: 58, b: 54 }
};

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const smoothstep = (a: number, b: number, x: number): number => {
  const t = clamp01((x - a) / Math.max(1e-6, b - a));
  return t * t * (3 - 2 * t);
};

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
  private biomass = new Float32Array(0);
  private damage = new Float32Array(0);
  private shade = new Float32Array(0);

  constructor(private readonly quality: number = 10) {}

  public getRevision(): number {
    return this.revision;
  }

  public compose(state: WorldState, layer: SurfaceLayer, signature: string): PlanetSurfaceResult {
    const { width, height } = state.config;
    const pxPerTile = Math.max(4, Math.min(this.quality, 8));
    if (!this.canvas || width !== this.gridWidth || height !== this.gridHeight || pxPerTile !== this.pxPerTile) {
      this.allocate(width, height, pxPerTile);
      this.lastSignature = '';
      this.lastLayer = null;
    }

    const physicalLike = layer === 'PHYSICAL' || layer === 'BIOMES';
    const normalized = physicalLike ? this.normalizeSignature(signature) : signature;
    const fullSignature = `${layer}|${normalized}`;
    const layerChanged = layer !== this.lastLayer;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();

    // Dynamic thematic layers can follow simulation time, but never repaint faster than 4 Hz.
    // Physical/Biome views ignore the clock-only five-year bucket entirely.
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
    this.biomass = new Float32Array(0);
    this.damage = new Float32Array(0);
    this.shade = new Float32Array(0);
    this.lastSignature = '';
    this.lastLayer = null;
  }

  private normalizeSignature(signature: string): string {
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
    const count = width * height;
    this.elevation = new Float32Array(count);
    this.temperature = new Float32Array(count);
    this.moisture = new Float32Array(count);
    this.vegetation = new Float32Array(count);
    this.biomass = new Float32Array(count);
    this.damage = new Float32Array(count);
    this.shade = new Float32Array(count);
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
        this.biomass[i] = tile.biomass;
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
        this.shade[y * width + x] = clamp(0.99 + dx * 1.0 + dy * 0.82, 0.8, 1.14);
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
    return lerp(
      lerp(field[ya * w + xa], field[ya * w + xb], dx),
      lerp(field[yb * w + xa], field[yb * w + xb], dx),
      dy
    );
  }

  private tileAt(state: WorldState, tx: number, ty: number) {
    const x = ((Math.floor(tx) % this.gridWidth) + this.gridWidth) % this.gridWidth;
    const y = clamp(Math.floor(ty), 0, this.gridHeight - 1);
    return state.grid[y][x];
  }

  private blendedLandBiome(state: WorldState, tx: number, ty: number): RGB {
    const w = this.gridWidth;
    const h = this.gridHeight;
    const fx = tx - 0.5;
    const fy = clamp(ty - 0.5, 0, h - 1);
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const dx = fx - x0;
    const dy = fy - y0;
    const points = [
      [((x0 % w) + w) % w, clamp(y0, 0, h - 1), (1 - dx) * (1 - dy)],
      [((x0 + 1) % w + w) % w, clamp(y0, 0, h - 1), dx * (1 - dy)],
      [((x0 % w) + w) % w, clamp(y0 + 1, 0, h - 1), (1 - dx) * dy],
      [((x0 + 1) % w + w) % w, clamp(y0 + 1, 0, h - 1), dx * dy]
    ] as const;
    let r = 0;
    let g = 0;
    let b = 0;
    let weight = 0;
    for (const [x, y, rawWeight] of points) {
      const tile = state.grid[y][x];
      if (tile.isWater) continue;
      const c = BIOME_RGB[tile.biome] ?? BIOME_RGB.TEMPERATE_GRASSLAND;
      r += c.r * rawWeight;
      g += c.g * rawWeight;
      b += c.b * rawWeight;
      weight += rawWeight;
    }
    if (weight < 0.001) return BIOME_RGB[this.tileAt(state, tx, ty).biome] ?? BIOME_RGB.TEMPERATE_GRASSLAND;
    return { r: r / weight, g: g / weight, b: b / weight };
  }

  private physicalColor(state: WorldState, tx: number, ty: number, x: number, y: number): RGB {
    const sea = state.config.seaLevel;
    const e = this.sample(this.elevation, tx, ty);
    if (e < sea) {
      const depth = clamp01((sea - e) / Math.max(0.24, sea + 0.28));
      const t = smoothstep(0.04, 0.72, depth);
      const grain = (visualNoise(state.config.seed, x >> 1, y >> 1, 13) - 0.5) * 3;
      return {
        r: lerp(33, 7, t) + grain,
        g: lerp(104, 29, t) + grain,
        b: lerp(130, 53, t) + grain
      };
    }

    const temp = this.sample(this.temperature, tx, ty);
    const moisture = clamp01(this.sample(this.moisture, tx, ty));
    const vegetation = clamp01(this.sample(this.vegetation, tx, ty));
    const elevation01 = clamp01((e - sea) / Math.max(0.08, 1 - sea));
    const lush = clamp01(vegetation * 0.72 + moisture * 0.42);
    const cold = clamp01((7 - temp) / 34);
    const high = smoothstep(0.48, 0.88, elevation01);
    const snow = clamp01(smoothstep(0.8, 0.98, elevation01) + smoothstep(-7, -24, temp));
    const biome = this.blendedLandBiome(state, tx, ty);

    let r = lerp(161, 49, lush);
    let g = lerp(137, 91, lush);
    let b = lerp(89, 55, lush);
    r = lerp(r, 106, cold * 0.7);
    g = lerp(g, 118, cold * 0.7);
    b = lerp(b, 116, cold * 0.7);
    r = lerp(r, 121, high * 0.64);
    g = lerp(g, 119, high * 0.64);
    b = lerp(b, 112, high * 0.64);
    r = lerp(r, biome.r, 0.24);
    g = lerp(g, biome.g, 0.24);
    b = lerp(b, biome.b, 0.24);
    r = lerp(r, 211, snow * 0.74);
    g = lerp(g, 217, snow * 0.74);
    b = lerp(b, 220, snow * 0.74);

    const shade = this.sample(this.shade, tx, ty);
    const grain = (visualNoise(state.config.seed, x, y, 17) - 0.5) * 0.035;
    const contourPhase = Math.abs((((e - sea) * 15) % 1 + 1) % 1 - 0.5);
    const contour = contourPhase > 0.47 && elevation01 > 0.08 ? 0.95 : 1;
    const factor = shade * (1 + grain) * contour;
    r *= factor;
    g *= factor;
    b *= factor;

    const coastBand = 1 - smoothstep(0.006, 0.028, Math.abs(e - sea));
    if (coastBand > 0) {
      r = lerp(r, 177, coastBand * 0.28);
      g = lerp(g, 154, coastBand * 0.28);
      b = lerp(b, 105, coastBand * 0.28);
    }
    return { r, g, b };
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
        const wet = clamp01(this.sample(this.moisture, tx, ty));
        return hslToRgb(214 - wet * 38, 0.7, 0.22 + wet * 0.34);
      }
      case 'BIODIVERSITY': {
        const activity = clamp01((this.sample(this.biomass, tx, ty) / 1000 + this.sample(this.vegetation, tx, ty)) * 0.5);
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
    const physical = layer === 'PHYSICAL';
    this.readFields(state);

    for (let y = 0; y < ph; y++) {
      const ty = (y + 0.5) / px;
      for (let x = 0; x < pw; x++) {
        const tx = (x + 0.5) / px;
        const i = (y * pw + x) * 4;
        const base = this.physicalColor(state, tx, ty, x, y);
        const thematic = physical ? null : this.thematicColor(state, tx, ty, layer);
        const blend = thematic ? (layer === 'BIOMES' ? 0.74 : 0.85) : 0;
        const dim = !physical && !thematic ? 0.58 : 1;
        data[i] = clamp(Math.round(lerp(base.r, thematic?.r ?? base.r, blend) * dim), 0, 255);
        data[i + 1] = clamp(Math.round(lerp(base.g, thematic?.g ?? base.g, blend) * dim), 0, 255);
        data[i + 2] = clamp(Math.round(lerp(base.b, thematic?.b ?? base.b, blend) * dim), 0, 255);
        data[i + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);
    this.paintHydrologyAndPlaces(state, layer);
  }

  private paintHydrologyAndPlaces(state: WorldState, layer: SurfaceLayer) {
    const ctx = this.ctx!;
    const px = this.pxPerTile;
    const physicalDetail = layer === 'PHYSICAL' || layer === 'BIOMES';
    if (physicalDetail) {
      ctx.save();
      ctx.lineCap = 'round';
      for (let y = 0; y < state.config.height; y++) {
        for (let x = 0; x < state.config.width; x++) {
          const tile = state.grid[y][x];
          const cx = (x + 0.5) * px;
          const cy = (y + 0.5) * px;
          if (tile.isLake) {
            ctx.fillStyle = 'rgba(44, 119, 145, 0.82)';
            ctx.beginPath();
            ctx.ellipse(cx, cy, px * 0.32, px * 0.23, 0, 0, Math.PI * 2);
            ctx.fill();
          }
          if (tile.riverFlow > 0.035) {
            const angle = Number.isFinite(tile.riverDirection) ? tile.riverDirection : 0;
            const len = px * (0.28 + Math.min(0.42, tile.riverFlow * 0.7));
            ctx.strokeStyle = `rgba(77, 159, 185, ${0.42 + Math.min(0.35, tile.riverFlow)})`;
            ctx.lineWidth = Math.max(0.7, Math.min(1.8, 0.65 + tile.riverFlow * 1.5));
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
          ctx.fillStyle = 'rgba(235, 178, 88, 0.92)';
          ctx.beginPath();
          ctx.arc(cx, cy, Math.max(1, px * 0.16), 0, Math.PI * 2);
          ctx.fill();
        }
        if (tile.ruins.length > 0 && (layer === 'PHYSICAL' || layer === 'RUINS_ARCHAEOLOGY')) {
          ctx.strokeStyle = 'rgba(178, 145, 224, 0.8)';
          ctx.lineWidth = 1;
          const s = Math.max(1.4, px * 0.18);
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
