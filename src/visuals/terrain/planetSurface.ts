// WORLDSEED — Shared Planetary Surface Compositor
//
// One authoritative image of the planet, consumed by BOTH the 2D cartographic views and
// the Three.js hero views, so every presentation mode reads as the same world.
//
// Rules this module obeys:
//  * It never mutates simulation state and never touches the simulation PRNG. All visual
//    variation comes from `visualNoise`, a pure integer hash of (worldSeed, x, y, channel).
//  * It never invents facts. Micro-detail modulates brightness/roughness only; rivers,
//    coastlines, ice, settlements and damage are drawn strictly from tile fields.
//  * It reuses one canvas + one ImageData buffer per instance. Nothing is reallocated on a
//    simulation tick.

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
  DEEP_OCEAN: { r: 12, g: 34, b: 66 },
  SHALLOW_OCEAN: { r: 26, g: 78, b: 128 },
  HYDROTHERMAL_RIFT: { r: 58, g: 24, b: 44 },
  COASTAL_REEF: { r: 40, g: 122, b: 142 },
  TUNDRA: { r: 150, g: 158, b: 152 },
  TAIGA: { r: 46, g: 76, b: 64 },
  TEMPERATE_FOREST: { r: 58, g: 96, b: 52 },
  TEMPERATE_GRASSLAND: { r: 118, g: 132, b: 70 },
  TROPICAL_RAINFOREST: { r: 38, g: 84, b: 44 },
  SAVANNA: { r: 155, g: 136, b: 72 },
  HOT_DESERT: { r: 190, g: 164, b: 108 },
  COLD_DESERT: { r: 138, g: 138, b: 128 },
  WETLAND: { r: 68, g: 104, b: 84 },
  ALPINE: { r: 176, g: 180, b: 188 },
  VOLCANIC_BARREN: { r: 62, g: 54, b: 52 }
};

/**
 * Physically-informed roughness per biome, 0..1. Feeds the generated roughness map so land
 * materials respond to light differently instead of sharing one plastic finish. Values are
 * baseline estimates that the paint loop further modulates by altitude, snow, wetness and
 * damage.
 */
const BIOME_ROUGHNESS: Record<BiomeType, number> = {
  DEEP_OCEAN: 0.1,
  SHALLOW_OCEAN: 0.12,
  HYDROTHERMAL_RIFT: 0.22,
  COASTAL_REEF: 0.2,
  TUNDRA: 0.74,
  TAIGA: 0.66,
  TEMPERATE_FOREST: 0.6,
  TEMPERATE_GRASSLAND: 0.56,
  TROPICAL_RAINFOREST: 0.58,
  SAVANNA: 0.62,
  HOT_DESERT: 0.88,
  COLD_DESERT: 0.82,
  WETLAND: 0.46,
  ALPINE: 0.68,
  VOLCANIC_BARREN: 0.8
};

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);
const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = clamp01((x - edge0) / (edge1 - edge0 || 1e-6));
  return t * t * (3 - 2 * t);
};

/**
 * Deterministic visual hash. Pure function of the world seed and a coordinate — it is
 * repeatable across reloads, saves and machines, and is completely isolated from the
 * simulation's PRNG stream.
 */
const visualNoise = (seed: number, x: number, y: number, channel: number): number => {
  let h = (seed | 0) ^ Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(channel | 0, 0x9e3779b9);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
};

/** Smooth value noise built from the deterministic hash (no allocation, no PRNG). */
const valueNoise = (seed: number, x: number, y: number, channel: number): number => {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const n00 = visualNoise(seed, xi, yi, channel);
  const n10 = visualNoise(seed, xi + 1, yi, channel);
  const n01 = visualNoise(seed, xi, yi + 1, channel);
  const n11 = visualNoise(seed, xi + 1, yi + 1, channel);
  return (n00 * (1 - u) + n10 * u) * (1 - v) + (n01 * (1 - u) + n11 * u) * v;
};

const fbm = (seed: number, x: number, y: number, channel: number, octaves: number): number => {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += valueNoise(seed, x * freq, y * freq, channel + o) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2.07;
  }
  return sum / (norm || 1);
};

const hexToRgb = (hex: string): RGB => {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
  const int = parseInt(full.slice(0, 6), 16);
  if (Number.isNaN(int)) return { r: 128, g: 128, b: 128 };
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
};

const hslToRgb = (h: number, s: number, l: number): RGB => {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = ((h % 360) + 360) % 360 / 60;
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

const hashHue = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  return Math.abs(hash) % 360;
};

export interface PlanetSurfaceResult {
  /** Albedo — biome colour, hydrology, infrastructure, settlements. */
  canvas: HTMLCanvasElement;
  /** Deterministic elevation/height texture, independent of albedo. */
  heightCanvas: HTMLCanvasElement;
  /** Tangent-space normal map derived from the height field plus sub-tile detail. */
  normalCanvas: HTMLCanvasElement;
  /** Biome/altitude/wetness/damage-informed roughness. */
  roughnessCanvas: HTMLCanvasElement;
  /** Near-zero on land, raised on open water — drives specular/Fresnel response. */
  metalnessCanvas: HTMLCanvasElement;
  /** Zero on land, raised on open water — drives the ocean's clearcoat highlight. */
  clearcoatCanvas: HTMLCanvasElement;
  /** Climate-derived cloud alpha (white RGB, density in alpha). */
  cloudCanvas: HTMLCanvasElement;
  /** Increments whenever pixels actually changed, so consumers know when to re-upload. */
  revision: number;
  pixelWidth: number;
  pixelHeight: number;
}

/** One reusable raster layer: a canvas, its 2D context and its backing ImageData buffer. */
interface RasterLayer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  image: ImageData;
}

const makeLayer = (width: number, height: number): RasterLayer => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: false });
  if (!ctx) throw new Error('WORLDSEED could not allocate a planetary surface layer canvas.');
  return { canvas, ctx, image: ctx.createImageData(width, height) };
};

/**
 * Composites the world grid into a smooth, hill-shaded planetary surface image, plus the
 * companion height, normal, roughness, metalness, clearcoat and cloud layers the hero 3D
 * views need for physically-varied materials. Instances are cheap to hold; a single instance
 * reuses its canvases for the app lifetime.
 */
export class PlanetSurfaceCompositor {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private image: ImageData | null = null;

  private height: RasterLayer | null = null;
  private normal: RasterLayer | null = null;
  private roughness: RasterLayer | null = null;
  private metalness: RasterLayer | null = null;
  private clearcoat: RasterLayer | null = null;
  private cloud: RasterLayer | null = null;

  private gridWidth = 0;
  private gridHeight = 0;
  private pxPerTile = 0;
  private revision = 0;
  private lastSignature = '';

  // Interpolation source fields, rebuilt only when the grid actually changes.
  private elevation: Float32Array = new Float32Array(0);
  private temperature: Float32Array = new Float32Array(0);
  private moisture: Float32Array = new Float32Array(0);
  private vegetation: Float32Array = new Float32Array(0);
  private damage: Float32Array = new Float32Array(0);

  constructor(private readonly quality: number = 10) {}

  public getRevision(): number {
    return this.revision;
  }

  /**
   * Returns the composited surface. Recomposites only when the signature changes, so a
   * simulation tick that did not alter anything visible costs nothing.
   */
  public compose(state: WorldState, layer: SurfaceLayer, signature: string): PlanetSurfaceResult {
    const { width, height } = state.config;
    const pxPerTile = this.quality;

    if (!this.canvas || this.gridWidth !== width || this.gridHeight !== height || this.pxPerTile !== pxPerTile) {
      this.allocate(width, height, pxPerTile);
      this.lastSignature = '';
    }

    const fullSignature = `${layer}|${signature}`;
    if (fullSignature !== this.lastSignature) {
      this.lastSignature = fullSignature;
      this.paint(state, layer);
      this.revision++;
    }

    return {
      canvas: this.canvas!,
      heightCanvas: this.height!.canvas,
      normalCanvas: this.normal!.canvas,
      roughnessCanvas: this.roughness!.canvas,
      metalnessCanvas: this.metalness!.canvas,
      clearcoatCanvas: this.clearcoat!.canvas,
      cloudCanvas: this.cloud!.canvas,
      revision: this.revision,
      pixelWidth: this.canvas!.width,
      pixelHeight: this.canvas!.height
    };
  }

  public dispose() {
    this.canvas = null;
    this.ctx = null;
    this.image = null;
    this.height = null;
    this.normal = null;
    this.roughness = null;
    this.metalness = null;
    this.clearcoat = null;
    this.cloud = null;
    this.elevation = new Float32Array(0);
    this.temperature = new Float32Array(0);
    this.moisture = new Float32Array(0);
    this.vegetation = new Float32Array(0);
    this.damage = new Float32Array(0);
    this.lastSignature = '';
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
    this.height = makeLayer(canvas.width, canvas.height);
    this.normal = makeLayer(canvas.width, canvas.height);
    this.roughness = makeLayer(canvas.width, canvas.height);
    this.metalness = makeLayer(canvas.width, canvas.height);
    this.clearcoat = makeLayer(canvas.width, canvas.height);
    // Clouds are generated at a lower resolution than terrain — they are soft, broken shapes,
    // not something that needs texel-accurate alignment with the surface below.
    this.cloud = makeLayer(Math.max(64, canvas.width >> 1), Math.max(32, canvas.height >> 1));
    this.gridWidth = width;
    this.gridHeight = height;
    this.pxPerTile = pxPerTile;

    const cells = width * height;
    this.elevation = new Float32Array(cells);
    this.temperature = new Float32Array(cells);
    this.moisture = new Float32Array(cells);
    this.vegetation = new Float32Array(cells);
    this.damage = new Float32Array(cells);
  }

  private readFields(state: WorldState) {
    const { width, height } = state.config;
    for (let y = 0; y < height; y++) {
      const row = state.grid[y];
      for (let x = 0; x < width; x++) {
        const t = row[x];
        const i = y * width + x;
        this.elevation[i] = t.elevation;
        this.temperature[i] = t.currentTemp;
        this.moisture[i] = t.moisture;
        this.vegetation[i] = t.vegetationDensity;
        this.damage[i] = Math.max(t.environmentalDamage, t.pollution, t.erosionLevel);
      }
    }
  }

  /** Bilinear sample in tile space. X wraps (equirectangular), Y clamps at the poles. */
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
    const v00 = field[ya * w + xa];
    const v10 = field[ya * w + xb];
    const v01 = field[yb * w + xa];
    const v11 = field[yb * w + xb];
    return (v00 * (1 - dx) + v10 * dx) * (1 - dy) + (v01 * (1 - dx) + v11 * dx) * dy;
  }

  private tileAt(state: WorldState, tx: number, ty: number) {
    const w = this.gridWidth;
    const h = this.gridHeight;
    const x = ((Math.floor(tx) % w) + w) % w;
    const y = clamp(Math.floor(ty), 0, h - 1);
    return state.grid[y][x];
  }

  /** Blended biome colour from the four surrounding tiles — removes the blocky grid. */
  private blendedBiome(state: WorldState, tx: number, ty: number): RGB {
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

    const c00 = BIOME_RGB[state.grid[ya][xa].biome] || BIOME_RGB.TEMPERATE_FOREST;
    const c10 = BIOME_RGB[state.grid[ya][xb].biome] || BIOME_RGB.TEMPERATE_FOREST;
    const c01 = BIOME_RGB[state.grid[yb][xa].biome] || BIOME_RGB.TEMPERATE_FOREST;
    const c11 = BIOME_RGB[state.grid[yb][xb].biome] || BIOME_RGB.TEMPERATE_FOREST;

    const wa = (1 - dx) * (1 - dy);
    const wb = dx * (1 - dy);
    const wc = (1 - dx) * dy;
    const wd = dx * dy;

    return {
      r: c00.r * wa + c10.r * wb + c01.r * wc + c11.r * wd,
      g: c00.g * wa + c10.g * wb + c01.g * wc + c11.g * wd,
      b: c00.b * wa + c10.b * wb + c01.b * wc + c11.b * wd
    };
  }

  private thematicColor(state: WorldState, tx: number, ty: number, layer: SurfaceLayer): RGB | null {
    const tile = this.tileAt(state, tx, ty);
    switch (layer) {
      case 'TEMPERATURE': {
        const t = clamp01((this.sample(this.temperature, tx, ty) + 35) / 85);
        return hslToRgb(228 - t * 228, 0.72, 0.24 + t * 0.3);
      }
      case 'RAINFALL': {
        const r = clamp01(this.sample(this.moisture, tx, ty));
        return hslToRgb(206 - r * 26, 0.7, 0.18 + r * 0.42);
      }
      case 'BIODIVERSITY': {
        const activity = clamp01((tile.biomass / 1000 + this.sample(this.vegetation, tx, ty)) / 2);
        return hslToRgb(28 + activity * 112, 0.6, 0.18 + activity * 0.34);
      }
      case 'POLITICAL':
        return tile.polityId ? hslToRgb(hashHue(tile.polityId), 0.55, 0.44) : null;
      case 'SETTLEMENTS':
        if (tile.settlementId) return { r: 244, g: 178, b: 92 };
        if (tile.infrastructureLevel > 0) return { r: 150, g: 108, b: 58 };
        return null;
      case 'CULTURES': {
        if (!tile.dominantCultureId) return null;
        const culture = state.cultures[tile.dominantCultureId];
        return culture?.colorHex ? hexToRgb(culture.colorHex) : hslToRgb(hashHue(tile.dominantCultureId), 0.5, 0.45);
      }
      case 'LANGUAGES': {
        const languageId = tile.dominantCultureId ? state.cultures[tile.dominantCultureId]?.languageId : undefined;
        return languageId ? hslToRgb(hashHue(languageId), 0.55, 0.46) : null;
      }
      case 'DISEASES':
        return tile.activeContagionIds.length > 0 ? { r: 226, g: 84, b: 74 } : null;
      case 'RUINS_ARCHAEOLOGY':
        return tile.ruins.length > 0 ? { r: 176, g: 132, b: 246 } : tile.fossils.length > 0 ? { r: 120, g: 96, b: 168 } : null;
      case 'ENVIRONMENTAL_SCARS': {
        const d = clamp01(this.sample(this.damage, tx, ty));
        return d > 0.04 ? hslToRgb(44 - d * 44, 0.7, 0.46 - d * 0.16) : null;
      }
      default:
        return null;
    }
  }

  private paint(state: WorldState, layer: SurfaceLayer) {
    const ctx = this.ctx!;
    const image = this.image!;
    const data = image.data;
    const heightData = this.height!.image.data;
    const normalData = this.normal!.image.data;
    const roughnessData = this.roughness!.image.data;
    const metalnessData = this.metalness!.image.data;
    const clearcoatData = this.clearcoat!.image.data;
    const px = this.pxPerTile;
    const pw = this.canvas!.width;
    const ph = this.canvas!.height;
    const seaLevel = state.config.seaLevel;
    const seed = state.config.seed | 0;
    const isThematic = layer !== 'PHYSICAL' && layer !== 'BIOMES';

    this.readFields(state);

    // Light comes from the upper-left so northern slopes catch it; this matches the
    // directional light used by the Three.js hero views.
    const lightX = -0.62;
    const lightY = -0.66;
    const lightZ = 0.43;

    const relief = 26; // vertical exaggeration for the derived normals (broad terrain shape)
    // The detail noise's highest octave has a wavelength comparable to one gradient-tap step,
    // so adjacent taps can swing across nearly its full amplitude rather than a gentle slope.
    // A much smaller exaggeration than the broad term keeps sub-tile bump readable as texture
    // instead of overwhelming the surface into violent, unnatural ridging.
    const detailRelief = 34;
    const step = 1 / px;
    const tapOctaves = 3;

    /** Small-scale detail-noise elevation contribution at a single tile-space point. */
    const detailAt = (sx: number, sy: number): number => (fbm(seed, sx * 3.1, sy * 3.1, 11, tapOctaves) - 0.5) * 0.045;

    for (let y = 0; y < ph; y++) {
      const ty = (y + 0.5) / px;
      // Every longitude circle shrinks toward zero circumference at the poles, so any signal
      // that varies with longitude (detail noise, domain warp, the reconstructed normal-map
      // tangent basis) is undersampled there and aliases into a radiating starburst — a much
      // wider problem than the true single-texel singularity. Fading every longitude-varying
      // contribution out over the same polar fraction avoids it: real cartographic textures
      // lose meaningful per-degree-longitude resolution near a pole too, so a smoother cap is
      // the honest rendering, not a missing feature.
      const poleFade = smoothstep(0, this.gridHeight * 0.34, ty) * smoothstep(0, this.gridHeight * 0.34, this.gridHeight - ty);

      // The underlying biome grid itself — not noise — also aliases near a pole: real tile
      // boundaries at widely different longitudes collapse into the same few screen pixels.
      // A per-row average of the actual biome colour around this latitude gives an honest
      // "regional" colour to settle into as the fade approaches the pole, the same way a
      // small-scale atlas simplifies detail it cannot resolve near a pole rather than
      // aliasing it.
      let polarR = 0;
      let polarG = 0;
      let polarB = 0;
      if (poleFade < 0.999) {
        const polarSamples = 16;
        for (let s = 0; s < polarSamples; s++) {
          const sx = ((s + 0.5) / polarSamples) * this.gridWidth;
          const se = this.sample(this.elevation, sx, ty);
          if (se - seaLevel < 0) {
            polarR += 30;
            polarG += 82;
            polarB += 132;
          } else {
            const c = this.blendedBiome(state, sx, ty);
            polarR += c.r;
            polarG += c.g;
            polarB += c.b;
          }
        }
        polarR /= polarSamples;
        polarG /= polarSamples;
        polarB /= polarSamples;
      }

      for (let x = 0; x < pw; x++) {
        const tx = (x + 0.5) / px;
        const idx = (y * pw + x) * 4;

        const e = this.sample(this.elevation, tx, ty);
        // Detail displacement: purely visual, deterministic, and small enough that it can
        // never move a coastline across a tile boundary or imply terrain that is not there.
        const detail = (fbm(seed, tx * 3.1, ty * 3.1, 11, 4) - 0.5) * 0.045 * poleFade;
        const eDetailed = e + detail * (e > seaLevel ? 1 : 0.35);
        const land = eDetailed - seaLevel;

        // ---- Domain warp for high-frequency detail sampling ----
        // Offsetting the coordinates fed to fine detail noise breaks up the grid-aligned
        // "streak" look that a plain value-noise lattice produces when magnified across a
        // full sphere, without ever moving the true elevation/coastline field above.
        const warpX = (fbm(seed, tx * 0.6, ty * 0.6, 201, 3) - 0.5) * 0.4 * poleFade;
        const warpY = (fbm(seed, tx * 0.6, ty * 0.6, 211, 3) - 0.5) * 0.4 * poleFade;
        const wtx = tx + warpX;
        const wty = ty + warpY;

        // ---- Elevation/normal texture (every pixel, land and ocean alike) ----
        const eL = this.sample(this.elevation, tx - step, ty);
        const eR = this.sample(this.elevation, tx + step, ty);
        const eU = this.sample(this.elevation, tx, ty - step);
        const eD = this.sample(this.elevation, tx, ty + step);
        const detailL = detailAt(tx - step, ty);
        const detailR = detailAt(tx + step, ty);
        const detailU = detailAt(tx, ty - step);
        const detailD = detailAt(tx, ty + step);

        // Three.js also reconstructs the normal-map tangent basis from screen-space
        // derivatives when no explicit tangent attribute is supplied, which is unstable in
        // the same shrinking-tangent region — fading the perturbation here falls back to the
        // sphere's own smooth geometric normal exactly where that basis cannot be trusted.
        const gx = ((eL - eR) * relief + (detailL - detailR) * detailRelief) * poleFade;
        const gy = ((eU - eD) * relief + (detailU - detailD) * detailRelief) * poleFade;
        const gLen = Math.sqrt(gx * gx + gy * gy + 1) || 1;
        const nTerrainX = gx / gLen;
        const nTerrainY = gy / gLen;
        const nTerrainZ = 1 / gLen;

        heightData[idx] = heightData[idx + 1] = heightData[idx + 2] = clamp(Math.round(((eDetailed + 1) / 2) * 255), 0, 255);
        heightData[idx + 3] = 255;
        normalData[idx] = clamp(Math.round((nTerrainX * 0.5 + 0.5) * 255), 0, 255);
        normalData[idx + 1] = clamp(Math.round((nTerrainY * 0.5 + 0.5) * 255), 0, 255);
        normalData[idx + 2] = clamp(Math.round((nTerrainZ * 0.5 + 0.5) * 255), 0, 255);
        normalData[idx + 3] = 255;

        let roughVal: number;
        let metalVal: number;
        let clearcoatVal: number;

        let r: number;
        let g: number;
        let b: number;

        if (land < 0) {
          // ---- OCEAN ----
          // The shelf edge is perturbed by shoreline noise so the coastal shallows read as an
          // irregular, natural shelf rather than a uniform ring around every landmass.
          const shelfNoise = fbm(seed, wtx * 5, wty * 5, 231, 3);
          const shelfWidth = 0.07 + (shelfNoise - 0.5) * 0.05 * poleFade;
          const depth = clamp01(-land / (seaLevel + 0.6));
          const shelf = smoothstep(0.0, shelfWidth, -land);
          const abyss = smoothstep(0.25, 0.75, depth);
          r = 34 - abyss * 24 + (1 - shelf) * 26;
          g = 96 - abyss * 66 + (1 - shelf) * 46;
          b = 148 - abyss * 84 + (1 - shelf) * 40;

          // Bathymetric banding keeps deep water from reading as a flat fill.
          const band = fbm(seed, tx * 2.6, ty * 2.6, 31, 3);
          const bandLift = (band - 0.5) * 8 * (0.3 + depth * 0.7);
          r += bandLift * 0.4;
          g += bandLift * 0.7;
          b += bandLift;

          // Sea ice at the cold extremes, derived from real temperature.
          const temp = this.sample(this.temperature, tx, ty);
          const iceJitter = (fbm(seed, tx * 3.6, ty * 3.6, 91, 3) - 0.5) * 5;
          const ice = smoothstep(-3 + iceJitter, -15 + iceJitter, temp);
          if (ice > 0) {
            const iceTint = 216 + fbm(seed, tx * 5, ty * 5, 41, 2) * 30;
            r += (iceTint - r) * ice;
            g += (iceTint + 6 - g) * ice;
            b += (iceTint + 14 - b) * ice;
          }

          // Water reads as water through its own material response: low, slightly varied
          // roughness for a readable sun highlight, and a modest clearcoat that gives a
          // restrained Fresnel brightening at grazing angles. Sea ice kills both.
          roughVal = clamp01(0.09 + (1 - shelf) * 0.05 + (band - 0.5) * 0.08);
          metalVal = clamp01(0.15 - (1 - shelf) * 0.05);
          clearcoatVal = 0.6 * shelf + 0.34 * (1 - shelf);
          if (ice > 0) {
            roughVal = roughVal + (0.55 - roughVal) * ice;
            metalVal = metalVal + (0.02 - metalVal) * ice;
            clearcoatVal = clearcoatVal + (0.12 - clearcoatVal) * ice;
          }
        } else {
          // ---- LAND ----
          const base = this.blendedBiome(state, tx, ty);
          r = base.r;
          g = base.g;
          b = base.b;

          // Hill shading reuses the terrain normal already derived above (broad tectonic
          // shape plus sub-tile detail), so the albedo's shading and the exported normal map
          // always agree with each other.
          const lambert = clamp(nTerrainX * lightX + nTerrainY * lightY + nTerrainZ * lightZ, -1, 1);
          const shade = 0.62 + lambert * 0.68;

          // Altitude tinting: rock above the tree line, snow above the frost line.
          const altitude = clamp01(land / 0.55);
          const rock = smoothstep(0.52, 0.86, altitude);
          r += (128 - r) * rock * 0.55;
          g += (124 - g) * rock * 0.55;
          b += (120 - b) * rock * 0.55;

          const temp = this.sample(this.temperature, tx, ty);
          // Permanent snow only where it is genuinely frigid, or high enough to sit above the
          // snow line. Treating every sub-zero tile as an ice sheet buried whole continents.
          // The snow line is perturbed by the same deterministic noise field as the terrain,
          // so its edge follows the ground instead of stair-stepping along tile boundaries.
          const snowJitter = (fbm(seed, tx * 4.4, ty * 4.4, 81, 3) - 0.5) * 7;
          const snow = clamp01(
            smoothstep(-5 + snowJitter, -20 + snowJitter, temp) * 0.9 + smoothstep(0.72, 0.99, altitude) * 0.8
          );
          // Snow cover breaks up into patches rather than a uniform sheet once past the line.
          const snowBreakup = fbm(seed, wtx * 10, wty * 10, 251, 3);
          const snowPatch = snow * clamp01(0.5 + snowBreakup * poleFade);
          if (snowPatch > 0) {
            const snowTint = 226 + fbm(seed, tx * 6, ty * 6, 51, 2) * 26;
            r += (snowTint - r) * snowPatch;
            g += (snowTint + 4 - g) * snowPatch;
            b += (snowTint + 12 - b) * snowPatch;
          }

          // Deterministic micro-texture, domain-warped so it never reads as a lattice:
          // vegetation clumping where the ground is green, fine soil/rock grain where it is
          // bare — two distinct sub-tile signals instead of one uniform mottle.
          const vegNoise = fbm(seed, wtx * 7.3, wty * 7.3, 61, 3) - 0.5;
          const soilNoise = fbm(seed, wtx * 13, wty * 13, 161, 3) - 0.5;
          const veg = clamp01(this.sample(this.vegetation, tx, ty));
          const mottle = (vegNoise * (8 + veg * 20) + soilNoise * (14 * (1 - veg))) * poleFade;
          r += mottle * 0.7;
          g += mottle;
          b += mottle * 0.5;

          r *= shade;
          g *= shade;
          b *= shade;

          // Environmental scarring darkens and desaturates the surface everywhere it exists,
          // not only on the dedicated layer, so damage is legible in the hero views.
          const dmg = clamp01(this.sample(this.damage, tx, ty));
          if (dmg > 0.02) {
            const ash = 58 + fbm(seed, tx * 4, ty * 4, 71, 2) * 22;
            const k = dmg * 0.72;
            r += (ash - r) * k;
            g += (ash * 0.86 - g) * k;
            b += (ash * 0.78 - b) * k;
          }

          // Coastal strand — a thin lit band exactly where land meets sea, its width jittered
          // by shoreline noise so it reads as an irregular beach rather than a ruled line.
          const strandNoise = fbm(seed, wtx * 9, wty * 9, 221, 3);
          const strandWidth = 0.02 + strandNoise * 0.018 * poleFade;
          const strand = 1 - smoothstep(0.0, strandWidth, land);
          if (strand > 0) {
            r += (206 - r) * strand * 0.6;
            g += (190 - g) * strand * 0.6;
            b += (150 - b) * strand * 0.6;
          }

          // Material response: biome baseline, roughened by exposed rock and damage,
          // smoothed by snow and coastal wetness, with a little sub-tile grain of its own.
          const roughNoise = (fbm(seed, wtx * 9 + 40, wty * 9 + 40, 271, 3) - 0.5) * 0.12 * poleFade;
          const tileBiome = this.tileAt(state, tx, ty).biome;
          roughVal = clamp01((BIOME_ROUGHNESS[tileBiome] ?? 0.65) + rock * 0.22 - strand * 0.14 + dmg * 0.22 + roughNoise);
          if (snowPatch > 0) roughVal = roughVal + (0.32 - roughVal) * snowPatch;
          metalVal = clamp01(0.02 + strand * 0.03);
          clearcoatVal = clamp01(strand * 0.12);
        }

        // Sharp specular response (low roughness, clearcoat) on the many thin, near-degenerate
        // triangles converging at the sphere's poles aliases into a bright radiating starburst
        // — a GPU specular-aliasing artifact, not a texture one, so no amount of texture-level
        // fading upstream corrects it. Forcing a matte, non-reflective response in the same
        // polar fraction sidesteps it entirely, and reads as accurate besides: real polar ice
        // is diffuse, not glossy.
        roughVal = roughVal + (0.85 - roughVal) * (1 - poleFade);
        metalVal *= poleFade;
        clearcoatVal *= poleFade;

        if (poleFade < 0.999) {
          r = r + (polarR - r) * (1 - poleFade);
          g = g + (polarG - g) * (1 - poleFade);
          b = b + (polarB - b) * (1 - poleFade);
        }

        roughnessData[idx] = roughnessData[idx + 1] = roughnessData[idx + 2] = clamp(Math.round(roughVal * 255), 0, 255);
        roughnessData[idx + 3] = 255;
        metalnessData[idx] = metalnessData[idx + 1] = metalnessData[idx + 2] = clamp(Math.round(metalVal * 255), 0, 255);
        metalnessData[idx + 3] = 255;
        clearcoatData[idx] = clearcoatData[idx + 1] = clearcoatData[idx + 2] = clamp(Math.round(clearcoatVal * 255), 0, 255);
        clearcoatData[idx + 3] = 255;

        // Thematic overlays keep the shaded relief underneath so data layers still read
        // as a planet rather than as a spreadsheet of coloured squares.
        if (isThematic) {
          const theme = this.thematicColor(state, tx, ty, layer);
          if (theme) {
            const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
            const k = 0.78;
            r += (theme.r * (0.55 + lum * 0.75) - r) * k;
            g += (theme.g * (0.55 + lum * 0.75) - g) * k;
            b += (theme.b * (0.55 + lum * 0.75) - b) * k;
          } else if (land >= 0) {
            // Desaturate un-attributed land so attributed regions pop.
            const grey = (r + g + b) / 3;
            r += (grey * 0.62 - r) * 0.62;
            g += (grey * 0.62 - g) * 0.62;
            b += (grey * 0.66 - b) * 0.62;
          }
        }

        data[idx] = clamp(r, 0, 255);
        data[idx + 1] = clamp(g, 0, 255);
        data[idx + 2] = clamp(b, 0, 255);
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(image, 0, 0);
    this.height!.ctx.putImageData(this.height!.image, 0, 0);
    this.normal!.ctx.putImageData(this.normal!.image, 0, 0);
    this.roughness!.ctx.putImageData(this.roughness!.image, 0, 0);
    this.metalness!.ctx.putImageData(this.metalness!.image, 0, 0);
    this.clearcoat!.ctx.putImageData(this.clearcoat!.image, 0, 0);
    this.paintClouds(state);

    // Vector features are stroked on top of the raster so they stay crisp and continuous.
    this.paintHydrology(ctx, state);
    this.paintInfrastructure(ctx, state);
    this.paintSettlements(ctx, state, layer);
  }

  /**
   * Cloud alpha derived from real moisture, temperature and latitude rather than an arbitrary
   * band pattern. Painted at half the terrain resolution — clouds are soft, broken shapes and
   * do not need texel-accurate alignment with the surface below.
   */
  private paintClouds(state: WorldState) {
    const layer = this.cloud!;
    const data = layer.image.data;
    const pw = layer.canvas.width;
    const ph = layer.canvas.height;
    const seed = state.config.seed | 0;

    for (let y = 0; y < ph; y++) {
      const ty = ((y + 0.5) / ph) * this.gridHeight;
      const latNorm = (y / ph - 0.5) * 2;
      const convergence = Math.exp(-latNorm * latNorm * 3.2);
      for (let x = 0; x < pw; x++) {
        const tx = ((x + 0.5) / pw) * this.gridWidth;
        const idx = (y * pw + x) * 4;

        const moist = clamp01(this.sample(this.moisture, tx, ty));
        const temp = this.sample(this.temperature, tx, ty);
        const coldSuppress = smoothstep(-34, -8, temp);

        const warpX = (fbm(seed, tx * 0.35, ty * 0.35, 401, 3) - 0.5) * 5;
        const warpY = (fbm(seed, tx * 0.35, ty * 0.35, 411, 3) - 0.5) * 5;
        const broad = fbm(seed, tx * 0.9 + warpX, ty * 0.9 + warpY, 421, 5);
        const fine = fbm(seed, tx * 3.2 + warpX * 1.6, ty * 3.2 + warpY * 1.6, 441, 3);
        const shape = broad * 0.68 + fine * 0.32;

        const density = moist * 0.62 + convergence * 0.38;
        const alpha = clamp01((shape * 0.85 + density * 0.75 - 0.62) * 2.4) * coldSuppress;

        data[idx] = 255;
        data[idx + 1] = 255;
        data[idx + 2] = 255;
        data[idx + 3] = clamp(Math.round(alpha * 0.62 * 255), 0, 255);
      }
    }
    layer.ctx.putImageData(layer.image, 0, 0);
  }

  /** Rivers and lakes traced as continuous water, not per-tile stubs. */
  private paintHydrology(ctx: CanvasRenderingContext2D, state: WorldState) {
    const px = this.pxPerTile;
    const { width, height } = state.config;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Lakes first, as filled bodies.
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tile = state.grid[y][x];
        if (!tile.isLake || tile.isWater) continue;
        const cx = (x + 0.5) * px;
        const cy = (y + 0.5) * px;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, px * 0.85);
        grad.addColorStop(0, 'rgba(38, 104, 150, 0.95)');
        grad.addColorStop(1, 'rgba(30, 78, 118, 0.35)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, px * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Rivers: two passes (incised valley shadow, then the water itself).
    for (const pass of [0, 1]) {
      ctx.strokeStyle = pass === 0 ? 'rgba(8, 22, 30, 0.5)' : 'rgba(96, 176, 214, 0.92)';
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const tile = state.grid[y][x];
          if (tile.isWater || tile.riverFlow <= 0.08) continue;
          const flow = clamp01(tile.riverFlow);
          const w = Math.max(0.9, px * (0.1 + flow * 0.3));
          ctx.lineWidth = pass === 0 ? w + Math.max(1.2, px * 0.09) : w;

          const cx = (x + 0.5) * px;
          const cy = (y + 0.5) * px;
          const dirX = Math.cos(tile.riverDirection);
          const dirY = Math.sin(tile.riverDirection);

          ctx.beginPath();
          ctx.moveTo(cx - dirX * px * 0.5, cy - dirY * px * 0.5);
          ctx.quadraticCurveTo(cx, cy, cx + dirX * px * 0.55, cy + dirY * px * 0.55);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  /** Roads and worked land, drawn only where infrastructure actually exists. */
  private paintInfrastructure(ctx: CanvasRenderingContext2D, state: WorldState) {
    const px = this.pxPerTile;
    const { width, height } = state.config;
    ctx.save();
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tile = state.grid[y][x];
        if (tile.infrastructureLevel <= 0 || tile.isWater) continue;
        const level = Math.min(3, tile.infrastructureLevel);
        const cx = (x + 0.5) * px;
        const cy = (y + 0.5) * px;

        // Cultivated ground reads as a warm, ordered patch.
        ctx.fillStyle = `rgba(168, 142, 82, ${0.1 + level * 0.07})`;
        ctx.fillRect(cx - px * 0.5, cy - px * 0.5, px, px);

        // Roads connect to whichever neighbours are also developed.
        ctx.strokeStyle = `rgba(206, 186, 148, ${0.22 + level * 0.16})`;
        ctx.lineWidth = Math.max(0.8, px * 0.06 * level);
        ctx.beginPath();
        for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [-1, 1]]) {
          const nx = ((x + dx) % width + width) % width;
          const ny = y + dy;
          if (ny < 0 || ny >= height) continue;
          const n = state.grid[ny][nx];
          if (n.isWater || n.infrastructureLevel <= 0) continue;
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + dx * px, cy + dy * px);
        }
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  /**
   * Settlement and ruin footprints. These are baked into the surface so the hero 3D views
   * show civilisation accumulating on the planet itself, not only in the 2D atlas.
   */
  private paintSettlements(ctx: CanvasRenderingContext2D, state: WorldState, layer: SurfaceLayer) {
    const px = this.pxPerTile;
    const seed = state.config.seed | 0;
    ctx.save();

    // Ruin fields live on the tiles that contain them, so they are read from the grid.
    for (let ry = 0; ry < state.config.height; ry++) {
      for (let rx = 0; rx < state.config.width; rx++) {
        const ruinTile = state.grid[ry][rx];
        if (ruinTile.ruins.length === 0) continue;
        const cx = (rx + 0.5) * px;
        const cy = (ry + 0.5) * px;
        const decay = clamp01(ruinTile.ruins[0].decayLevel);
        ctx.fillStyle = `rgba(126, 112, 146, ${0.55 - decay * 0.3})`;
        for (let i = 0; i < 6; i++) {
          const a = visualNoise(seed, rx * 7 + i, ry * 13, 101) * Math.PI * 2;
          const rad = visualNoise(seed, rx + i, ry * 3, 103) * px * 0.42;
          const s = px * (0.1 + visualNoise(seed, i, rx + ry, 107) * 0.1);
          ctx.fillRect(cx + Math.cos(a) * rad - s / 2, cy + Math.sin(a) * rad - s / 2, s, s * 0.8);
        }
      }
    }

    for (const settlement of Object.values(state.settlements)) {
      const cx = (settlement.tileX + 0.5) * px;
      const cy = (settlement.tileY + 0.5) * px;
      const scale = clamp01(Math.log10(Math.max(10, settlement.population)) / 6);
      const radius = px * (0.28 + scale * 0.72);

      if (settlement.isAbandoned) {
        ctx.fillStyle = 'rgba(96, 92, 104, 0.42)';
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.7, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }

      // Built ground: a warm, slightly irregular footprint sized by real population.
      const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 1.6);
      halo.addColorStop(0, `rgba(238, 196, 132, ${0.5 + scale * 0.35})`);
      halo.addColorStop(0.55, `rgba(186, 146, 92, ${0.28 + scale * 0.2})`);
      halo.addColorStop(1, 'rgba(150, 120, 78, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.6, 0, Math.PI * 2);
      ctx.fill();

      // Structure grain: deterministic per settlement id, denser for larger tiers.
      const blocks = 4 + Math.round(scale * 12);
      const idHash = hashHue(settlement.id);
      ctx.fillStyle = layer === 'SETTLEMENTS' ? 'rgba(255, 226, 176, 0.95)' : 'rgba(246, 214, 164, 0.8)';
      for (let i = 0; i < blocks; i++) {
        const a = visualNoise(seed, idHash + i, settlement.tileY, 113) * Math.PI * 2;
        const rad = Math.sqrt(visualNoise(seed, idHash, i, 117)) * radius;
        const s = Math.max(1, px * (0.07 + scale * 0.1));
        ctx.fillRect(cx + Math.cos(a) * rad - s / 2, cy + Math.sin(a) * rad - s / 2, s, s);
      }
    }
    ctx.restore();
  }
}

/** CSS `rgb()` string for an {r,g,b} triple — lets HUD swatches match the rendered surface. */
const rgbToCss = (c: RGB): string => `rgb(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)})`;

export { visualNoise, fbm as visualFbm, BIOME_RGB, BIOME_ROUGHNESS, hslToRgb, rgbToCss };
