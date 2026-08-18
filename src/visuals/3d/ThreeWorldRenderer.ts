// WORLDSEED — performance-first WebGL hero renderer.
//
// The simulation grid is deliberately low resolution (64×48 by default). This renderer does
// not pretend otherwise by piling high-frequency normal maps over it. Instead it turns the
// real fields into a clean planetary atlas: continuous hypsometric colour, restrained terrain
// relief, a separate water surface, soft climate clouds and quiet observatory lighting.
// Static views render only when something visible changes.

import * as THREE from 'three';
import { Tile, WorldState, WorldViewMode } from '../../types/simulation';
import { SurfaceLayer } from '../terrain/planetSurface';

const GLOBE_RADIUS = 18;
const SNOW_RADIUS = 13;
const SURFACE_W = 512;
const SURFACE_H = 256;
const CLOUD_W = 192;
const CLOUD_H = 96;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / Math.max(1e-6, b - a));
  return t * t * (3 - 2 * t);
};

type RGB = [number, number, number];

const BIOME: Record<string, RGB> = {
  DEEP_OCEAN: [8, 29, 52],
  SHALLOW_OCEAN: [27, 91, 121],
  HYDROTHERMAL_RIFT: [74, 38, 49],
  COASTAL_REEF: [48, 121, 127],
  TUNDRA: [134, 143, 140],
  TAIGA: [47, 74, 60],
  TEMPERATE_FOREST: [54, 91, 49],
  TEMPERATE_GRASSLAND: [111, 125, 69],
  TROPICAL_RAINFOREST: [38, 82, 43],
  SAVANNA: [150, 130, 72],
  HOT_DESERT: [182, 151, 99],
  COLD_DESERT: [128, 130, 124],
  WETLAND: [64, 99, 79],
  ALPINE: [162, 168, 174],
  VOLCANIC_BARREN: [67, 58, 54]
};

function hash(seed: number, x: number, y: number, channel = 0): number {
  let h = (seed | 0) ^ Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(channel | 0, 0x9e3779b9);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

function valueNoise(seed: number, x: number, y: number, channel: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const n00 = hash(seed, xi, yi, channel);
  const n10 = hash(seed, xi + 1, yi, channel);
  const n01 = hash(seed, xi, yi + 1, channel);
  const n11 = hash(seed, xi + 1, yi + 1, channel);
  return lerp(lerp(n00, n10, u), lerp(n01, n11, u), v);
}

function hashHue(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = ((h << 5) - h + value.charCodeAt(i)) | 0;
  return Math.abs(h) % 360;
}

function hslToRgb(h: number, s: number, l: number): RGB {
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
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

export class ThreeWorldRenderer {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private worldGroup: THREE.Group | null = null;

  private surfaceMesh: THREE.Mesh | null = null;
  private oceanMesh: THREE.Mesh | null = null;
  private reliefMesh: THREE.Mesh | null = null;
  private oceanPlane: THREE.Mesh | null = null;
  private atmosphereMesh: THREE.Mesh | null = null;
  private cloudMesh: THREE.Mesh | null = null;
  private glassDomeMesh: THREE.Mesh | null = null;
  private baseObject: THREE.Object3D | null = null;
  private moonMesh: THREE.Mesh | null = null;
  private moonTexture: THREE.CanvasTexture | null = null;
  private starfield: THREE.Group | null = null;
  private particleSystem: THREE.Points | null = null;
  private snowVelocity: Float32Array | null = null;
  private selectionMarker: THREE.Mesh | null = null;

  private surfaceCanvas: HTMLCanvasElement | null = null;
  private waterCanvas: HTMLCanvasElement | null = null;
  private cloudCanvas: HTMLCanvasElement | null = null;
  private surfaceTexture: THREE.CanvasTexture | null = null;
  private waterTexture: THREE.CanvasTexture | null = null;
  private cloudTexture: THREE.CanvasTexture | null = null;
  private surfaceKey = '';

  private fieldWidth = 0;
  private fieldHeight = 0;
  private elevation = new Float32Array(0);
  private temperature = new Float32Array(0);
  private moisture = new Float32Array(0);
  private vegetation = new Float32Array(0);
  private biomass = new Float32Array(0);
  private damage = new Float32Array(0);
  private shade = new Float32Array(0);

  private currentViewMode: WorldViewMode | null = null;
  private currentDimensions = '';
  private raycaster = new THREE.Raycaster();
  private mouseVec = new THREE.Vector2();
  private reducedMotion = false;
  private renderFrame: number | null = null;
  private animationFrame: number | null = null;
  private animationLast = 0;
  private hasFramedWorld = false;
  private verticalBias = 0;
  private selectionKey = '__unset__';

  public rotX = 0.24;
  public rotY = 0.6;
  public zoomDistance = 52;
  private targetZoom = 52;

  constructor(container: HTMLElement) {
    this.container = container;
    this.reducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.init();
  }

  private init() {
    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 600;
    this.container.style.background = 'radial-gradient(circle at 48% 42%, #0a121b 0%, #04080d 58%, #010204 100%)';

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.3));
    this.renderer.setSize(width, height, false);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.96;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.dataset.worldseedRenderer = 'three';
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(38, width / height, 0.5, 3000);
    this.scene = new THREE.Scene();
    this.worldGroup = new THREE.Group();
    this.scene.add(this.worldGroup);

    // Broad, soft light. The earlier hard sun + glossy water produced a giant white disc and
    // crushed half of the planet into black. This is intentionally closer to atlas lighting.
    this.scene.add(new THREE.HemisphereLight(0x71869b, 0x10151c, 1.18));
    const sun = new THREE.DirectionalLight(0xffecd1, 1.35);
    sun.position.set(-24, 36, 52);
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0x6686a3, 0.22);
    fill.position.set(28, -18, -34);
    this.scene.add(fill);

    this.createStarfield();
    this.requestRender();
  }

  private createStarfield() {
    if (!this.scene) return;
    const group = new THREE.Group();
    const layer = (count: number, size: number, opacity: number, seed: number, color: number) => {
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const theta = hash(seed, i, 1, 3) * Math.PI * 2;
        const phi = Math.acos(2 * hash(seed, i, 2, 5) - 1);
        const r = 900;
        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      return new THREE.Points(
        geometry,
        new THREE.PointsMaterial({ color, size, sizeAttenuation: false, transparent: true, opacity, depthWrite: false })
      );
    };
    group.add(layer(1350, 1.0, 0.38, 9143, 0xe9f2ff));
    group.add(layer(125, 1.8, 0.68, 2279, 0xfff3de));
    this.starfield = group;
    this.scene.add(group);
  }

  private ensureRasterResources() {
    if (!this.surfaceCanvas) {
      this.surfaceCanvas = document.createElement('canvas');
      this.surfaceCanvas.width = SURFACE_W;
      this.surfaceCanvas.height = SURFACE_H;
      this.waterCanvas = document.createElement('canvas');
      this.waterCanvas.width = SURFACE_W;
      this.waterCanvas.height = SURFACE_H;
      this.cloudCanvas = document.createElement('canvas');
      this.cloudCanvas.width = CLOUD_W;
      this.cloudCanvas.height = CLOUD_H;
    }

    if (!this.surfaceTexture) {
      this.surfaceTexture = new THREE.CanvasTexture(this.surfaceCanvas!);
      this.surfaceTexture.colorSpace = THREE.SRGBColorSpace;
      this.surfaceTexture.wrapS = THREE.RepeatWrapping;
      this.surfaceTexture.wrapT = THREE.ClampToEdgeWrapping;
      this.surfaceTexture.generateMipmaps = false;
      this.surfaceTexture.minFilter = THREE.LinearFilter;
      this.surfaceTexture.magFilter = THREE.LinearFilter;
      this.surfaceTexture.anisotropy = 1;
    }
    if (!this.waterTexture) {
      this.waterTexture = new THREE.CanvasTexture(this.waterCanvas!);
      this.waterTexture.wrapS = THREE.RepeatWrapping;
      this.waterTexture.wrapT = THREE.ClampToEdgeWrapping;
      this.waterTexture.generateMipmaps = false;
      this.waterTexture.minFilter = THREE.LinearFilter;
      this.waterTexture.magFilter = THREE.LinearFilter;
    }
    if (!this.cloudTexture) {
      this.cloudTexture = new THREE.CanvasTexture(this.cloudCanvas!);
      this.cloudTexture.wrapS = THREE.RepeatWrapping;
      this.cloudTexture.wrapT = THREE.ClampToEdgeWrapping;
      this.cloudTexture.generateMipmaps = false;
      this.cloudTexture.minFilter = THREE.LinearFilter;
      this.cloudTexture.magFilter = THREE.LinearFilter;
    }
  }

  private ensureFields(state: WorldState) {
    const w = state.config.width;
    const h = state.config.height;
    if (w !== this.fieldWidth || h !== this.fieldHeight) {
      this.fieldWidth = w;
      this.fieldHeight = h;
      const count = w * h;
      this.elevation = new Float32Array(count);
      this.temperature = new Float32Array(count);
      this.moisture = new Float32Array(count);
      this.vegetation = new Float32Array(count);
      this.biomass = new Float32Array(count);
      this.damage = new Float32Array(count);
      this.shade = new Float32Array(count);
    }

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const tile = state.grid[y][x];
        const i = y * w + x;
        this.elevation[i] = tile.elevation;
        this.temperature[i] = tile.currentTemp;
        this.moisture[i] = tile.moisture;
        this.vegetation[i] = tile.vegetationDensity;
        this.biomass[i] = tile.biomass;
        this.damage[i] = Math.max(tile.environmentalDamage, tile.pollution, tile.erosionLevel);
      }
    }

    for (let y = 0; y < h; y++) {
      const ym = Math.max(0, y - 1);
      const yp = Math.min(h - 1, y + 1);
      for (let x = 0; x < w; x++) {
        const xm = (x - 1 + w) % w;
        const xp = (x + 1) % w;
        const dx = this.elevation[y * w + xm] - this.elevation[y * w + xp];
        const dy = this.elevation[ym * w + x] - this.elevation[yp * w + x];
        this.shade[y * w + x] = clamp(0.99 + dx * 1.0 + dy * 0.82, 0.8, 1.14);
      }
    }
  }

  private sampleField(field: Float32Array, tx: number, ty: number): number {
    const w = this.fieldWidth;
    const h = this.fieldHeight;
    if (!w || !h) return 0;
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

  private tileAt(state: WorldState, tx: number, ty: number): Tile {
    const x = ((Math.floor(tx) % state.config.width) + state.config.width) % state.config.width;
    const y = clamp(Math.floor(ty), 0, state.config.height - 1);
    return state.grid[y][x];
  }

  private blendedLandBiome(state: WorldState, tx: number, ty: number): RGB {
    const w = state.config.width;
    const h = state.config.height;
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
      const color = BIOME[tile.biome] ?? [102, 112, 78];
      r += color[0] * rawWeight;
      g += color[1] * rawWeight;
      b += color[2] * rawWeight;
      weight += rawWeight;
    }
    if (weight < 0.001) return BIOME[this.tileAt(state, tx, ty).biome] ?? [102, 112, 78];
    return [r / weight, g / weight, b / weight];
  }

  private visualSignature(state: WorldState, layer: SurfaceLayer): string {
    let population = 0;
    for (const settlement of Object.values(state.settlements)) population += settlement.population;
    const dynamicLayer = layer !== 'PHYSICAL' && layer !== 'BIOMES';
    return [
      layer,
      state.config.seed,
      state.config.width,
      state.config.height,
      Object.keys(state.settlements).length,
      Object.keys(state.polities).length,
      Math.round(population / 25000),
      Math.round(state.stats.globalAvgTemperature / 2),
      Math.round(state.stats.forestCoverPercentage / 4),
      dynamicLayer ? Math.floor(state.currentYear / 10) : 0
    ].join(':');
  }

  private thematicColor(state: WorldState, tx: number, ty: number, layer: SurfaceLayer): RGB | null {
    const tile = this.tileAt(state, tx, ty);
    switch (layer) {
      case 'BIOMES':
        return BIOME[tile.biome] ?? [96, 106, 78];
      case 'TEMPERATURE': {
        const t = clamp01((this.sampleField(this.temperature, tx, ty) + 35) / 85);
        return hslToRgb(226 - t * 220, 0.72, 0.3 + t * 0.18);
      }
      case 'RAINFALL': {
        const wet = clamp01(this.sampleField(this.moisture, tx, ty));
        return hslToRgb(214 - wet * 38, 0.7, 0.22 + wet * 0.34);
      }
      case 'BIODIVERSITY': {
        const activity = clamp01((this.sampleField(this.biomass, tx, ty) / 1000 + this.sampleField(this.vegetation, tx, ty)) * 0.5);
        return hslToRgb(30 + activity * 105, 0.62, 0.24 + activity * 0.22);
      }
      case 'POLITICAL':
        return tile.polityId ? hslToRgb(hashHue(tile.polityId), 0.56, 0.46) : null;
      case 'SETTLEMENTS':
        return tile.settlementId ? [239, 176, 84] : tile.infrastructureLevel > 0 ? [145, 108, 65] : null;
      case 'CULTURES':
        return tile.dominantCultureId ? hslToRgb(hashHue(tile.dominantCultureId), 0.55, 0.46) : null;
      case 'LANGUAGES': {
        const culture = tile.dominantCultureId ? state.cultures[tile.dominantCultureId] : undefined;
        return culture?.languageId ? hslToRgb(hashHue(culture.languageId), 0.58, 0.47) : null;
      }
      case 'DISEASES':
        return tile.activeContagionIds.length > 0 ? [218, 73, 68] : null;
      case 'RUINS_ARCHAEOLOGY':
        return tile.ruins.length > 0 ? [176, 126, 236] : tile.fossils.length > 0 ? [120, 95, 168] : null;
      case 'ENVIRONMENTAL_SCARS': {
        const d = clamp01(this.sampleField(this.damage, tx, ty));
        return d > 0.03 ? hslToRgb(46 - d * 44, 0.7, 0.48 - d * 0.18) : null;
      }
      default:
        return null;
    }
  }

  private physicalColor(state: WorldState, tx: number, ty: number, px: number, py: number): [number, number, number, boolean] {
    const sea = state.config.seaLevel;
    const e = this.sampleField(this.elevation, tx, ty);
    const water = e < sea;

    if (water) {
      const depth = clamp01((sea - e) / Math.max(0.24, sea + 0.28));
      const coast: RGB = [33, 104, 130];
      const deep: RGB = [7, 29, 53];
      const grain = (valueNoise(state.config.seed, px / 15, py / 15, 71) - 0.5) * 4;
      return [
        Math.round(lerp(coast[0], deep[0], smoothstep(0.04, 0.72, depth)) + grain),
        Math.round(lerp(coast[1], deep[1], smoothstep(0.04, 0.72, depth)) + grain),
        Math.round(lerp(coast[2], deep[2], smoothstep(0.04, 0.72, depth)) + grain),
        true
      ];
    }

    // Continuous climate colours do most of the work. Biome classification remains visible as
    // a restrained tint, rather than as the giant rectangular colour blocks seen in the old
    // screenshot.
    const temp = this.sampleField(this.temperature, tx, ty);
    const moisture = clamp01(this.sampleField(this.moisture, tx, ty));
    const vegetation = clamp01(this.sampleField(this.vegetation, tx, ty));
    const elevation01 = clamp01((e - sea) / Math.max(0.08, 1 - sea));
    const shade = this.sampleField(this.shade, tx, ty);
    const lush = clamp01(vegetation * 0.72 + moisture * 0.42);
    const cold = clamp01((7 - temp) / 34);
    const high = smoothstep(0.48, 0.88, elevation01);
    const snow = clamp01(smoothstep(0.8, 0.98, elevation01) + smoothstep(-7, -24, temp));

    const dry: RGB = [161, 137, 89];
    const wet: RGB = [49, 91, 55];
    const cool: RGB = [106, 118, 116];
    const rock: RGB = [121, 119, 112];
    const ice: RGB = [211, 217, 220];
    const biome = this.blendedLandBiome(state, tx, ty);

    let r = lerp(dry[0], wet[0], lush);
    let g = lerp(dry[1], wet[1], lush);
    let b = lerp(dry[2], wet[2], lush);
    r = lerp(r, cool[0], cold * 0.7);
    g = lerp(g, cool[1], cold * 0.7);
    b = lerp(b, cool[2], cold * 0.7);
    r = lerp(r, rock[0], high * 0.64);
    g = lerp(g, rock[1], high * 0.64);
    b = lerp(b, rock[2], high * 0.64);
    r = lerp(r, biome[0], 0.24);
    g = lerp(g, biome[1], 0.24);
    b = lerp(b, biome[2], 0.24);
    r = lerp(r, ice[0], snow * 0.74);
    g = lerp(g, ice[1], snow * 0.74);
    b = lerp(b, ice[2], snow * 0.74);

    const grain = (valueNoise(state.config.seed, px / 9, py / 9, 89) - 0.5) * 0.045;
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

    return [Math.round(r), Math.round(g), Math.round(b), false];
  }

  private paintSurface(state: WorldState, layer: SurfaceLayer) {
    this.ensureRasterResources();
    this.ensureFields(state);

    const surfaceCtx = this.surfaceCanvas!.getContext('2d')!;
    const waterCtx = this.waterCanvas!.getContext('2d')!;
    const surface = surfaceCtx.createImageData(SURFACE_W, SURFACE_H);
    const water = waterCtx.createImageData(SURFACE_W, SURFACE_H);
    const gw = state.config.width;
    const gh = state.config.height;
    const physical = layer === 'PHYSICAL';

    for (let y = 0; y < SURFACE_H; y++) {
      const ty = ((y + 0.5) / SURFACE_H) * gh;
      for (let x = 0; x < SURFACE_W; x++) {
        const tx = ((x + 0.5) / SURFACE_W) * gw;
        const i = (y * SURFACE_W + x) * 4;
        const [pr, pg, pb, isWater] = this.physicalColor(state, tx, ty, x, y);
        const thematic = physical ? null : this.thematicColor(state, tx, ty, layer);
        const blend = thematic ? (layer === 'BIOMES' ? 0.72 : 0.84) : 0;
        const dim = !physical && !thematic ? 0.58 : 1;
        surface.data[i] = clamp(Math.round(lerp(pr, thematic?.[0] ?? pr, blend) * dim), 0, 255);
        surface.data[i + 1] = clamp(Math.round(lerp(pg, thematic?.[1] ?? pg, blend) * dim), 0, 255);
        surface.data[i + 2] = clamp(Math.round(lerp(pb, thematic?.[2] ?? pb, blend) * dim), 0, 255);
        surface.data[i + 3] = 255;

        const mask = isWater ? 255 : 0;
        water.data[i] = mask;
        water.data[i + 1] = mask;
        water.data[i + 2] = mask;
        water.data[i + 3] = 255;
      }
    }
    surfaceCtx.putImageData(surface, 0, 0);
    waterCtx.putImageData(water, 0, 0);

    // Climate cloud field uses smoothly sampled moisture plus continuous value noise, so it
    // reads as weather rather than another copy of the tile grid.
    const cloudCtx = this.cloudCanvas!.getContext('2d')!;
    const clouds = cloudCtx.createImageData(CLOUD_W, CLOUD_H);
    const seed = state.config.seed | 0;
    for (let y = 0; y < CLOUD_H; y++) {
      const ty = ((y + 0.5) / CLOUD_H) * gh;
      const latitude = Math.abs((y + 0.5) / CLOUD_H - 0.5) * 2;
      const convergence = 0.58 + Math.cos(latitude * Math.PI * 2.1) * 0.12;
      for (let x = 0; x < CLOUD_W; x++) {
        const tx = ((x + 0.5) / CLOUD_W) * gw;
        const wet = clamp01(this.sampleField(this.moisture, tx, ty));
        const temp = this.sampleField(this.temperature, tx, ty);
        const n = valueNoise(seed, x / 9, y / 9, 101) * 0.68 + valueNoise(seed, x / 21, y / 21, 117) * 0.32;
        const density = temp < -34 ? 0 : clamp01((wet * 0.7 + n * 0.52 + convergence * 0.1 - 0.67) * 2.15);
        const c = Math.round(density * 255);
        const i = (y * CLOUD_W + x) * 4;
        clouds.data[i] = c;
        clouds.data[i + 1] = c;
        clouds.data[i + 2] = c;
        clouds.data[i + 3] = 255;
      }
    }
    cloudCtx.putImageData(clouds, 0, 0);

    this.surfaceTexture!.needsUpdate = true;
    this.waterTexture!.needsUpdate = true;
    this.cloudTexture!.needsUpdate = true;
  }

  private syncSurface(state: WorldState, layer: SurfaceLayer): boolean {
    const key = this.visualSignature(state, layer);
    if (key === this.surfaceKey) return false;
    this.surfaceKey = key;
    this.paintSurface(state, layer);
    return true;
  }

  public updateScene(state: WorldState, viewMode: WorldViewMode, layer: SurfaceLayer = 'PHYSICAL') {
    if (!this.scene || !this.worldGroup) return;
    const surfaceChanged = this.syncSurface(state, layer);
    const dimensions = `${state.config.width}x${state.config.height}`;
    const needsRebuild = this.currentViewMode !== viewMode || this.currentDimensions !== dimensions;

    if (needsRebuild) {
      this.clearWorldMeshes();
      this.currentViewMode = viewMode;
      this.currentDimensions = dimensions;
      if (viewMode === 'GLOBE' || viewMode === 'ORBITAL_VIEW') this.buildGlobe(state, viewMode === 'ORBITAL_VIEW');
      else if (viewMode === 'SNOW_GLOBE') this.buildSnowGlobe(state);
      else this.buildRelief(state);
      this.frameView(viewMode);
      if (!this.hasFramedWorld) {
        this.hasFramedWorld = true;
        this.frameMostInterestingRegion(state);
      }
      this.configureAnimation();
      this.requestRender();
      return;
    }

    if (surfaceChanged) {
      if (this.reliefMesh) this.updateReliefGeometry(state);
      this.requestRender();
    }
  }

  private averageElevationAtLatitude(ty: number): number {
    if (!this.fieldWidth) return 0;
    let sum = 0;
    const samples = Math.min(32, this.fieldWidth);
    for (let i = 0; i < samples; i++) sum += this.sampleField(this.elevation, ((i + 0.5) / samples) * this.fieldWidth, ty);
    return sum / samples;
  }

  private displaceSphere(geometry: THREE.SphereGeometry, state: WorldState, baseRadius: number, strength: number) {
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    const uv = geometry.attributes.uv as THREE.BufferAttribute;
    const sea = state.config.seaLevel;
    const north = this.averageElevationAtLatitude(0.5);
    const south = this.averageElevationAtLatitude(this.fieldHeight - 0.5);

    for (let i = 0; i < pos.count; i++) {
      const u = uv.getX(i);
      const v = uv.getY(i);
      const ty = (1 - v) * state.config.height;
      let e = this.sampleField(this.elevation, u * state.config.width, ty);
      const poleDistance = Math.min(v, 1 - v);
      const poleBlend = smoothstep(0, 0.11, poleDistance);
      e = lerp(v > 0.5 ? north : south, e, poleBlend);
      const rel = clamp01((e - sea) / Math.max(0.05, 1 - sea));
      const radius = baseRadius + Math.pow(rel, 1.35) * strength;
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const inv = 1 / Math.max(1e-6, Math.sqrt(x * x + y * y + z * z));
      pos.setXYZ(i, x * inv * radius, y * inv * radius, z * inv * radius);
    }
    pos.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
  }

  private buildPlanetSphere(state: WorldState, radius: number, widthSegments: number, heightSegments: number) {
    const geometry = new THREE.SphereGeometry(radius, widthSegments, heightSegments);
    this.displaceSphere(geometry, state, radius, radius === GLOBE_RADIUS ? 0.34 : 0.25);
    this.surfaceMesh = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({ map: this.surfaceTexture, roughness: 0.9, metalness: 0 })
    );
    this.worldGroup!.add(this.surfaceMesh);

    // Very restrained water gloss. The earlier low-roughness shell produced an enormous white
    // hotspot that looked like a flashlight pointed at plastic.
    this.oceanMesh = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 1.0018, Math.max(56, Math.floor(widthSegments * 0.72)), Math.max(36, Math.floor(heightSegments * 0.72))),
      new THREE.MeshStandardMaterial({
        color: 0x3a7894,
        alphaMap: this.waterTexture,
        transparent: true,
        opacity: 0.32,
        roughness: 0.68,
        metalness: 0,
        depthWrite: false
      })
    );
    this.oceanMesh.renderOrder = 2;
    this.worldGroup!.add(this.oceanMesh);
  }

  private buildGlobe(state: WorldState, orbital: boolean) {
    if (!this.worldGroup) return;
    this.buildPlanetSphere(state, GLOBE_RADIUS, orbital ? 88 : 96, orbital ? 56 : 64);

    this.atmosphereMesh = new THREE.Mesh(
      new THREE.SphereGeometry(GLOBE_RADIUS * 1.035, 48, 32),
      new THREE.ShaderMaterial({
        transparent: true,
        side: THREE.BackSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uColor: { value: new THREE.Color(0x80acc8) },
          uIntensity: { value: orbital ? 0.28 : 0.2 }
        },
        vertexShader: `
          varying vec3 vN;
          varying vec3 vV;
          void main() {
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vN = normalize(normalMatrix * normal);
            vV = normalize(-mv.xyz);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: `
          uniform vec3 uColor;
          uniform float uIntensity;
          varying vec3 vN;
          varying vec3 vV;
          void main() {
            float rim = 1.0 - abs(dot(normalize(vN), normalize(vV)));
            float a = pow(clamp(rim, 0.0, 1.0), 2.0) * uIntensity;
            gl_FragColor = vec4(uColor * a, a);
          }
        `
      })
    );
    this.worldGroup.add(this.atmosphereMesh);

    this.cloudMesh = new THREE.Mesh(
      new THREE.SphereGeometry(GLOBE_RADIUS * 1.012, 60, 40),
      new THREE.MeshStandardMaterial({
        color: 0xf0f3f4,
        alphaMap: this.cloudTexture,
        transparent: true,
        opacity: 0.2,
        depthWrite: false,
        roughness: 1,
        metalness: 0
      })
    );
    this.cloudMesh.renderOrder = 3;
    this.worldGroup.add(this.cloudMesh);

    if (orbital) {
      const moonCanvas = document.createElement('canvas');
      moonCanvas.width = 128;
      moonCanvas.height = 64;
      const ctx = moonCanvas.getContext('2d')!;
      ctx.fillStyle = '#868b94';
      ctx.fillRect(0, 0, 128, 64);
      for (let i = 0; i < 44; i++) {
        const x = hash(4411, i, 1) * 128;
        const y = hash(4411, i, 2) * 64;
        const r = 1 + hash(4411, i, 3) * 5;
        const g = Math.round(84 + hash(4411, i, 4) * 38);
        ctx.fillStyle = `rgba(${g},${g + 2},${g + 5},0.58)`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      this.moonTexture = new THREE.CanvasTexture(moonCanvas);
      this.moonTexture.colorSpace = THREE.SRGBColorSpace;
      this.moonTexture.generateMipmaps = false;
      this.moonTexture.minFilter = THREE.LinearFilter;
      this.moonMesh = new THREE.Mesh(
        new THREE.SphereGeometry(3.3, 30, 20),
        new THREE.MeshStandardMaterial({ map: this.moonTexture, roughness: 0.96, metalness: 0 })
      );
      this.moonMesh.position.set(44, 9, -17);
      this.worldGroup.add(this.moonMesh);
    }
  }

  private buildSnowGlobe(state: WorldState) {
    if (!this.worldGroup) return;
    this.buildPlanetSphere(state, SNOW_RADIUS, 72, 48);
    if (this.surfaceMesh) this.surfaceMesh.position.y = 1.4;
    if (this.oceanMesh) this.oceanMesh.position.y = 1.4;

    const base = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: 0x452a18, roughness: 0.78, metalness: 0 });
    const brass = new THREE.MeshStandardMaterial({ color: 0xa9824d, roughness: 0.48, metalness: 0.5 });
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(SNOW_RADIUS * 1.0, SNOW_RADIUS * 1.16, 2.7, 40), wood);
    foot.position.y = -SNOW_RADIUS - 3.1;
    base.add(foot);
    const collar = new THREE.Mesh(new THREE.TorusGeometry(SNOW_RADIUS * 0.98, 0.48, 12, 40), brass);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = -SNOW_RADIUS - 1.7;
    base.add(collar);
    this.baseObject = base;
    this.worldGroup.add(base);

    this.glassDomeMesh = new THREE.Mesh(
      new THREE.SphereGeometry(SNOW_RADIUS * 1.4, 52, 36),
      new THREE.MeshPhysicalMaterial({
        color: 0xeaf5ff,
        transparent: true,
        opacity: 0.12,
        roughness: 0.08,
        transmission: 0.82,
        thickness: 1.1,
        ior: 1.4,
        depthWrite: false
      })
    );
    this.glassDomeMesh.position.y = 1.4;
    this.glassDomeMesh.renderOrder = 10;
    this.worldGroup.add(this.glassDomeMesh);

    const count = 180;
    const snowPos = new Float32Array(count * 3);
    this.snowVelocity = new Float32Array(count);
    const seed = state.config.seed | 0;
    for (let i = 0; i < count; i++) {
      const theta = hash(seed, i, 11) * Math.PI * 2;
      const phi = Math.acos(2 * hash(seed, i, 17) - 1);
      const r = Math.cbrt(hash(seed, i, 23)) * SNOW_RADIUS * 1.27;
      snowPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      snowPos[i * 3 + 1] = r * Math.cos(phi) + 1.4;
      snowPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      this.snowVelocity[i] = 0.65 + hash(seed, i, 29) * 0.9;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
    this.particleSystem = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({ color: 0xffffff, size: 0.16, transparent: true, opacity: 0.68, depthWrite: false })
    );
    this.worldGroup.add(this.particleSystem);
  }

  private buildRelief(state: WorldState) {
    if (!this.worldGroup) return;
    const spanX = 42;
    const spanZ = spanX * (state.config.height / state.config.width);
    const segX = Math.max(95, state.config.width * 2 - 1);
    const segY = Math.max(71, state.config.height * 2 - 1);
    this.reliefMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(spanX, spanZ, segX, segY),
      new THREE.MeshStandardMaterial({ map: this.surfaceTexture, roughness: 0.9, metalness: 0 })
    );
    this.reliefMesh.rotation.x = -Math.PI / 2;
    this.updateReliefGeometry(state);
    this.worldGroup.add(this.reliefMesh);

    this.oceanPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(spanX, spanZ),
      new THREE.MeshStandardMaterial({ color: 0x285e78, transparent: true, opacity: 0.48, roughness: 0.7, depthWrite: false })
    );
    this.oceanPlane.rotation.x = -Math.PI / 2;
    this.oceanPlane.position.y = 0.015;
    this.worldGroup.add(this.oceanPlane);

    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(spanX * 1.015, 1.8, spanZ * 1.015),
      new THREE.MeshStandardMaterial({ color: 0x20262e, roughness: 0.92, metalness: 0 })
    );
    slab.position.y = -1.05;
    this.baseObject = slab;
    this.worldGroup.add(slab);
  }

  private updateReliefGeometry(state: WorldState) {
    if (!this.reliefMesh) return;
    const geometry = this.reliefMesh.geometry as THREE.PlaneGeometry;
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    const uv = geometry.attributes.uv as THREE.BufferAttribute;
    const sea = state.config.seaLevel;
    for (let i = 0; i < pos.count; i++) {
      const tx = uv.getX(i) * state.config.width;
      const ty = (1 - uv.getY(i)) * state.config.height;
      const e = this.sampleField(this.elevation, tx, ty);
      const rel = e - sea;
      pos.setZ(i, rel >= 0 ? rel * 2.6 : rel * 0.85);
    }
    pos.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
  }

  private distanceToFit(radius: number, margin: number): number {
    if (!this.camera) return radius * 3;
    const vFov = (this.camera.fov * Math.PI) / 180;
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * this.camera.aspect);
    return (radius * margin) / Math.tan(Math.min(vFov, hFov) / 2);
  }

  private frameView(viewMode: WorldViewMode) {
    switch (viewMode) {
      case 'GLOBE':
        this.targetZoom = this.distanceToFit(GLOBE_RADIUS, 1.32);
        this.rotX = 0.2;
        this.verticalBias = 0.65;
        break;
      case 'ORBITAL_VIEW':
        this.targetZoom = this.distanceToFit(GLOBE_RADIUS, 2.5);
        this.rotX = 0.12;
        this.verticalBias = 0.45;
        break;
      case 'SNOW_GLOBE':
        this.targetZoom = this.distanceToFit(SNOW_RADIUS * 1.4, 1.5);
        this.rotX = 0.14;
        this.verticalBias = 0;
        break;
      default:
        this.targetZoom = this.distanceToFit(23, 1.16);
        this.rotX = 0.55;
        this.verticalBias = 0;
        break;
    }
    this.zoomDistance = this.targetZoom;
    if (this.worldGroup) this.worldGroup.position.y = this.verticalBias;
  }

  private renderNow = () => {
    this.renderFrame = null;
    if (!this.renderer || !this.scene || !this.camera) return;
    this.zoomDistance = this.targetZoom;
    this.camera.position.x = this.zoomDistance * Math.sin(this.rotY) * Math.cos(this.rotX);
    this.camera.position.y = this.zoomDistance * Math.sin(this.rotX);
    this.camera.position.z = this.zoomDistance * Math.cos(this.rotY) * Math.cos(this.rotX);
    this.camera.lookAt(0, this.verticalBias * 0.12, 0);
    this.renderer.render(this.scene, this.camera);
  };

  private requestRender() {
    if (this.renderFrame !== null) return;
    this.renderFrame = requestAnimationFrame(this.renderNow);
  }

  private configureAnimation() {
    if (this.animationFrame !== null) cancelAnimationFrame(this.animationFrame);
    this.animationFrame = null;
    this.animationLast = 0;
    if (this.reducedMotion) return;
    if (this.currentViewMode !== 'SNOW_GLOBE' && this.currentViewMode !== 'ORBITAL_VIEW') return;

    const tick = (now: number) => {
      this.animationFrame = requestAnimationFrame(tick);
      if (!this.animationLast) this.animationLast = now;
      const elapsed = now - this.animationLast;
      if (elapsed < 40) return;
      const dt = Math.min(0.05, elapsed / 1000);
      this.animationLast = now;
      if (this.currentViewMode === 'SNOW_GLOBE') this.updateSnow(dt);
      if (this.currentViewMode === 'ORBITAL_VIEW' && this.moonMesh) {
        const t = now * 0.00006;
        this.moonMesh.position.set(Math.cos(t) * 47, 9 + Math.sin(t * 0.7) * 4, Math.sin(t) * 47);
        this.moonMesh.rotation.y += dt * 0.04;
      }
      this.requestRender();
    };
    this.animationFrame = requestAnimationFrame(tick);
  }

  private updateSnow(dt: number) {
    if (!this.particleSystem || !this.snowVelocity) return;
    const pos = this.particleSystem.geometry.attributes.position as THREE.BufferAttribute;
    const floor = -SNOW_RADIUS * 0.96 + 1.4;
    const ceiling = SNOW_RADIUS * 1.24 + 1.4;
    for (let i = 0; i < pos.count; i++) {
      let y = pos.getY(i) - this.snowVelocity[i] * dt;
      if (y < floor) y = ceiling;
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
  }

  public setSelection(state: WorldState, tile: { x: number; y: number } | null) {
    const key = tile ? `${tile.x},${tile.y}` : 'none';
    if (key === this.selectionKey) return;
    this.selectionKey = key;
    if (!this.worldGroup) return;

    if (!tile) {
      if (this.selectionMarker) this.disposeObject(this.selectionMarker);
      this.selectionMarker = null;
      this.requestRender();
      return;
    }

    if (!this.selectionMarker) {
      this.selectionMarker = new THREE.Mesh(
        new THREE.RingGeometry(0.56, 0.8, 28),
        new THREE.MeshBasicMaterial({ color: 0x8dd7f2, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthTest: false })
      );
      this.selectionMarker.renderOrder = 20;
      this.worldGroup.add(this.selectionMarker);
    }

    const u = (tile.x + 0.5) / state.config.width;
    const v = (tile.y + 0.5) / state.config.height;
    if (this.reliefMesh) {
      const geo = this.reliefMesh.geometry as THREE.PlaneGeometry;
      const e = this.sampleField(this.elevation, tile.x + 0.5, tile.y + 0.5);
      const rel = e - state.config.seaLevel;
      this.selectionMarker.position.set(
        (u - 0.5) * geo.parameters.width,
        (rel >= 0 ? rel * 2.6 : rel * 0.85) + 0.2,
        (v - 0.5) * geo.parameters.height
      );
      this.selectionMarker.rotation.set(-Math.PI / 2, 0, 0);
    } else if (this.surfaceMesh) {
      const base = (this.surfaceMesh.geometry as THREE.SphereGeometry).parameters.radius;
      const e = this.sampleField(this.elevation, tile.x + 0.5, tile.y + 0.5);
      const rel = clamp01((e - state.config.seaLevel) / Math.max(0.05, 1 - state.config.seaLevel));
      const reliefStrength = base === GLOBE_RADIUS ? 0.34 : 0.25;
      const radius = base + Math.pow(rel, 1.35) * reliefStrength + 0.1;
      const lon = (u - 0.5) * Math.PI * 2;
      const lat = (0.5 - v) * Math.PI;
      const normal = new THREE.Vector3(
        Math.cos(lat) * Math.sin(lon + Math.PI),
        Math.sin(lat),
        Math.cos(lat) * Math.cos(lon + Math.PI)
      ).normalize();
      this.selectionMarker.position.copy(normal.clone().multiplyScalar(radius)).add(this.surfaceMesh.position);
      this.selectionMarker.lookAt(this.selectionMarker.position.clone().add(normal));
      this.selectionMarker.scale.setScalar(base / GLOBE_RADIUS);
    }
    this.requestRender();
  }

  public pickTile(clientX: number, clientY: number, state: WorldState): { x: number; y: number } | null {
    if (!this.renderer || !this.camera) return null;
    const target = this.reliefMesh ?? this.surfaceMesh;
    if (!target) return null;
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    this.mouseVec.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.mouseVec, this.camera);
    const hit = this.raycaster.intersectObject(target, false)[0];
    if (!hit?.uv) return null;
    return {
      x: clamp(Math.floor(hit.uv.x * state.config.width), 0, state.config.width - 1),
      y: clamp(Math.floor((1 - hit.uv.y) * state.config.height), 0, state.config.height - 1)
    };
  }

  public focusTile(tileX: number, tileY: number, width: number, height: number) {
    const u = (tileX + 0.5) / width;
    const v = (tileY + 0.5) / height;
    this.rotY = (u - 0.5) * Math.PI * 2;
    this.rotX = clamp((0.5 - v) * Math.PI, -1.08, 1.08);
    this.requestRender();
  }

  public frameMostInterestingRegion(state: WorldState) {
    const { width, height } = state.config;
    const bands = Math.min(24, width);
    const span = Math.max(1, Math.floor(width / 8));
    let bestX = Math.floor(width / 2);
    let bestY = Math.floor(height / 2);
    let bestScore = -Infinity;

    for (let band = 0; band < bands; band++) {
      const cx = Math.floor(((band + 0.5) / bands) * width) % width;
      let score = 0;
      let weightedY = 0;
      let weight = 0;
      for (let dx = -span; dx <= span; dx++) {
        const x = (cx + dx + width) % width;
        for (let y = 0; y < height; y++) {
          const tile = state.grid[y]?.[x];
          if (!tile) continue;
          const latitude = 0.45 + Math.sin(((y + 0.5) / height) * Math.PI) * 0.55;
          const tileScore =
            ((tile.isWater ? 0 : 3) +
              Math.min(2.4, tile.biomass / 400) +
              tile.vegetationDensity * 1.25 +
              (tile.settlementId ? 9 : 0) +
              (tile.ruins.length ? 5 : 0)) *
            latitude;
          score += tileScore;
          weightedY += y * Math.max(0.1, tileScore);
          weight += Math.max(0.1, tileScore);
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestX = cx;
        bestY = clamp(Math.round(weightedY / Math.max(1, weight)), 0, height - 1);
      }
    }
    this.focusTile(bestX, bestY, width, height);
  }

  public resize(width: number, height: number) {
    if (!this.renderer || !this.camera || width <= 0 || height <= 0) return;
    const oldAspect = this.camera.aspect;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.3));
    this.renderer.setSize(width, height, false);
    if (this.currentViewMode && Math.abs(oldAspect - this.camera.aspect) > 0.001) this.frameView(this.currentViewMode);
    this.requestRender();
  }

  public rotate(deltaX: number, deltaY: number) {
    this.rotY += deltaX * 0.008;
    this.rotX = clamp(this.rotX + deltaY * 0.008, -1.3, 1.3);
    this.requestRender();
  }

  public zoom(delta: number) {
    const relief = !!this.reliefMesh;
    const snow = this.currentViewMode === 'SNOW_GLOBE';
    const min = relief ? 31 : snow ? 34 : 38;
    const max = relief ? 118 : 210;
    this.targetZoom = clamp(this.targetZoom * (1 + delta * 0.00072), min, max);
    this.requestRender();
  }

  public getRendererInfo() {
    return this.renderer?.info ?? null;
  }

  private disposeObject(object: THREE.Object3D | null) {
    if (!object) return;
    (object.parent ?? this.worldGroup ?? this.scene)?.remove(object);
    object.traverse(child => {
      const mesh = child as THREE.Mesh;
      mesh.geometry?.dispose();
      const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(material)) material.forEach(m => m.dispose());
      else material?.dispose();
    });
  }

  private clearWorldMeshes() {
    for (const object of [
      this.surfaceMesh,
      this.oceanMesh,
      this.reliefMesh,
      this.oceanPlane,
      this.atmosphereMesh,
      this.cloudMesh,
      this.glassDomeMesh,
      this.baseObject,
      this.moonMesh,
      this.particleSystem,
      this.selectionMarker
    ]) {
      this.disposeObject(object);
    }
    this.moonTexture?.dispose();
    this.moonTexture = null;
    this.surfaceMesh = null;
    this.oceanMesh = null;
    this.reliefMesh = null;
    this.oceanPlane = null;
    this.atmosphereMesh = null;
    this.cloudMesh = null;
    this.glassDomeMesh = null;
    this.baseObject = null;
    this.moonMesh = null;
    this.particleSystem = null;
    this.selectionMarker = null;
    this.snowVelocity = null;
    this.selectionKey = '__unset__';
  }

  public dispose() {
    if (this.renderFrame !== null) cancelAnimationFrame(this.renderFrame);
    if (this.animationFrame !== null) cancelAnimationFrame(this.animationFrame);
    this.renderFrame = null;
    this.animationFrame = null;
    this.clearWorldMeshes();
    this.disposeObject(this.starfield);
    this.starfield = null;
    this.surfaceTexture?.dispose();
    this.waterTexture?.dispose();
    this.cloudTexture?.dispose();
    this.surfaceTexture = null;
    this.waterTexture = null;
    this.cloudTexture = null;
    this.surfaceCanvas = null;
    this.waterCanvas = null;
    this.cloudCanvas = null;
    this.surfaceKey = '';
    this.elevation = new Float32Array(0);
    this.temperature = new Float32Array(0);
    this.moisture = new Float32Array(0);
    this.vegetation = new Float32Array(0);
    this.biomass = new Float32Array(0);
    this.damage = new Float32Array(0);
    this.shade = new Float32Array(0);
    this.fieldWidth = 0;
    this.fieldHeight = 0;

    if (this.renderer) {
      const canvas = this.renderer.domElement;
      this.renderer.dispose();
      this.renderer.forceContextLoss();
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    }
    this.container.style.background = '';
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.worldGroup = null;
    this.currentViewMode = null;
    this.currentDimensions = '';
  }
}
