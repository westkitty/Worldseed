// WORLDSEED — performance-first WebGL hero renderer.
//
// The simulation grid remains authoritative. Visual polish comes from composition, lighting,
// true macro-elevation displacement, restrained procedural texture breakup, and cheap layered
// materials — not from per-tick CPU noise fields or stacks of large GPU textures.

import * as THREE from 'three';
import { WorldState, WorldViewMode } from '../../types/simulation';
import { SurfaceLayer } from '../terrain/planetSurface';

const GLOBE_RADIUS = 18;
const SNOW_RADIUS = 13;
const SURFACE_W = 512;
const SURFACE_H = 256;
const CLOUD_W = 128;
const CLOUD_H = 64;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const BIOME: Record<string, [number, number, number]> = {
  DEEP_OCEAN: [8, 28, 52],
  SHALLOW_OCEAN: [24, 92, 128],
  HYDROTHERMAL_RIFT: [70, 34, 48],
  COASTAL_REEF: [40, 128, 142],
  TUNDRA: [142, 151, 148],
  TAIGA: [40, 72, 59],
  TEMPERATE_FOREST: [52, 92, 48],
  TEMPERATE_GRASSLAND: [111, 127, 66],
  TROPICAL_RAINFOREST: [31, 78, 42],
  SAVANNA: [151, 132, 68],
  HOT_DESERT: [188, 158, 101],
  COLD_DESERT: [132, 132, 124],
  WETLAND: [61, 100, 79],
  ALPINE: [170, 176, 184],
  VOLCANIC_BARREN: [62, 53, 50]
};

function hash(seed: number, x: number, y: number, channel = 0): number {
  let h = (seed | 0) ^ Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(channel | 0, 0x9e3779b9);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

function hashHue(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = ((h << 5) - h + value.charCodeAt(i)) | 0;
  return Math.abs(h) % 360;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
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

  private currentViewMode: WorldViewMode | null = null;
  private currentDimensions = '';
  private currentState: WorldState | null = null;
  private raycaster = new THREE.Raycaster();
  private mouseVec = new THREE.Vector2();
  private reducedMotion = false;
  private renderFrame: number | null = null;
  private animationFrame: number | null = null;
  private animationLast = 0;
  private hasFramedWorld = false;
  private verticalBias = 0;

  public rotX = 0.28;
  public rotY = 0.6;
  public zoomDistance = 46;
  private targetZoom = 46;

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

    this.container.style.background = 'radial-gradient(circle at 48% 42%, #0b1521 0%, #05090f 56%, #010204 100%)';
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35));
    this.renderer.setSize(width, height, false);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
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

    this.scene.add(new THREE.HemisphereLight(0x496784, 0x080b0f, 0.82));
    const sun = new THREE.DirectionalLight(0xfff1d7, 2.15);
    sun.position.set(-18, 36, 54);
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0x7298bd, 0.26);
    fill.position.set(30, -22, -32);
    this.scene.add(fill);

    this.createStarfield();
    this.requestRender();
  }

  public getSurfaceCanvas(): HTMLCanvasElement | null {
    return this.surfaceCanvas;
  }

  private createStarfield() {
    if (!this.scene) return;
    const group = new THREE.Group();
    const makeLayer = (count: number, size: number, opacity: number, seed: number) => {
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const u = hash(seed, i, 1, 3);
        const v = hash(seed, i, 2, 5);
        const theta = u * Math.PI * 2;
        const phi = Math.acos(2 * v - 1);
        const r = 900;
        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      return new THREE.Points(
        geo,
        new THREE.PointsMaterial({ color: 0xeaf2ff, size, sizeAttenuation: false, transparent: true, opacity, depthWrite: false })
      );
    };
    group.add(makeLayer(1250, 1.0, 0.42, 9143));
    group.add(makeLayer(150, 2.0, 0.72, 2279));
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

  private visualSignature(state: WorldState, layer: SurfaceLayer): string {
    let population = 0;
    for (const settlement of Object.values(state.settlements)) population += settlement.population;
    return [
      layer,
      state.config.seed,
      state.config.width,
      state.config.height,
      Object.keys(state.settlements).length,
      Object.keys(state.polities).length,
      Math.round(population / 25000),
      Math.round(state.stats.globalAvgTemperature / 2),
      Math.round(state.stats.forestCoverPercentage / 4)
    ].join(':');
  }

  private tileAt(state: WorldState, tx: number, ty: number): any {
    const w = state.config.width;
    const h = state.config.height;
    const x = ((Math.floor(tx) % w) + w) % w;
    const y = Math.max(0, Math.min(h - 1, Math.floor(ty)));
    return state.grid[y]?.[x];
  }

  private sampleElevation(state: WorldState, tx: number, ty: number): number {
    const w = state.config.width;
    const h = state.config.height;
    const fx = tx - 0.5;
    const fy = Math.max(0, Math.min(h - 1, ty - 0.5));
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const dx = fx - x0;
    const dy = fy - y0;
    const xa = ((x0 % w) + w) % w;
    const xb = ((x0 + 1) % w + w) % w;
    const ya = Math.max(0, Math.min(h - 1, y0));
    const yb = Math.max(0, Math.min(h - 1, y0 + 1));
    const a = state.grid[ya]?.[xa]?.elevation ?? 0;
    const b = state.grid[ya]?.[xb]?.elevation ?? a;
    const c = state.grid[yb]?.[xa]?.elevation ?? a;
    const d = state.grid[yb]?.[xb]?.elevation ?? a;
    return lerp(lerp(a, b, dx), lerp(c, d, dx), dy);
  }

  private physicalColor(state: WorldState, tx: number, ty: number, px: number, py: number): [number, number, number, boolean] {
    const seed = state.config.seed | 0;
    const sea = state.config.seaLevel;
    const e = this.sampleElevation(state, tx, ty);
    const coastBreakup = (hash(seed, px, py, 9) - 0.5) * 0.018;
    const water = e + coastBreakup < sea;

    if (water) {
      const depth = clamp01((sea - e) / Math.max(0.25, sea + 0.35));
      const shallow = [29, 102, 135];
      const deep = [7, 27, 50];
      const ripple = (hash(seed, px >> 1, py >> 1, 13) - 0.5) * 5;
      return [
        Math.round(lerp(shallow[0], deep[0], depth) + ripple),
        Math.round(lerp(shallow[1], deep[1], depth) + ripple),
        Math.round(lerp(shallow[2], deep[2], depth) + ripple),
        true
      ];
    }

    const tile = this.tileAt(state, tx, ty);
    const base = BIOME[tile?.biome] ?? [93, 105, 76];
    const elev = clamp01((e - sea) / Math.max(0.1, 1 - sea));
    const grain = (hash(seed, px, py, 17) - 0.5) * 0.09;

    const ex0 = this.sampleElevation(state, tx - 0.65, ty);
    const ex1 = this.sampleElevation(state, tx + 0.65, ty);
    const ey0 = this.sampleElevation(state, tx, ty - 0.65);
    const ey1 = this.sampleElevation(state, tx, ty + 0.65);
    const slopeLight = Math.max(0.72, Math.min(1.22, 0.98 + (ex0 - ex1) * 1.25 + (ey0 - ey1) * 1.05));
    const altitudeLift = elev > 0.68 ? (elev - 0.68) * 0.38 : 0;
    const vegetation = clamp01(Number(tile?.vegetationDensity ?? 0));
    const lushDarken = vegetation * 0.06;
    const factor = slopeLight * (1 + grain + altitudeLift - lushDarken);

    let r = base[0] * factor;
    let g = base[1] * factor;
    let b = base[2] * factor;
    if (Math.abs(e - sea) < 0.025) {
      r = lerp(r, 176, 0.22);
      g = lerp(g, 154, 0.22);
      b = lerp(b, 104, 0.22);
    }
    if (elev > 0.82 || Number(tile?.currentTemp ?? 20) < -8) {
      const snow = clamp01((elev - 0.78) * 4 + (-8 - Number(tile?.currentTemp ?? 20)) / 35);
      r = lerp(r, 214, snow * 0.65);
      g = lerp(g, 220, snow * 0.65);
      b = lerp(b, 224, snow * 0.65);
    }
    return [Math.round(r), Math.round(g), Math.round(b), false];
  }

  private thematicColor(state: WorldState, tx: number, ty: number, layer: SurfaceLayer): [number, number, number] | null {
    const tile = this.tileAt(state, tx, ty);
    if (!tile) return null;
    switch (layer) {
      case 'BIOMES':
        return BIOME[tile.biome] ?? [96, 106, 78];
      case 'TEMPERATURE': {
        const t = clamp01((Number(tile.currentTemp ?? 0) + 35) / 85);
        return hslToRgb(226 - t * 220, 0.72, 0.3 + t * 0.18);
      }
      case 'RAINFALL': {
        const r = clamp01(Number(tile.rainfall ?? tile.moisture ?? 0));
        return hslToRgb(214 - r * 38, 0.72, 0.22 + r * 0.34);
      }
      case 'BIODIVERSITY': {
        const activity = clamp01((Number(tile.biomass ?? 0) / 1000 + Number(tile.vegetationDensity ?? 0)) * 0.5);
        return hslToRgb(30 + activity * 105, 0.62, 0.24 + activity * 0.22);
      }
      case 'POLITICAL':
        return tile.polityId ? hslToRgb(hashHue(String(tile.polityId)), 0.56, 0.46) : null;
      case 'SETTLEMENTS':
        return tile.settlementId ? [239, 176, 84] : tile.infrastructureLevel > 0 ? [145, 108, 65] : null;
      case 'CULTURES':
        return tile.dominantCultureId ? hslToRgb(hashHue(String(tile.dominantCultureId)), 0.55, 0.46) : null;
      case 'LANGUAGES': {
        const culture = tile.dominantCultureId ? (state as any).cultures?.[tile.dominantCultureId] : null;
        return culture?.languageId ? hslToRgb(hashHue(String(culture.languageId)), 0.58, 0.47) : null;
      }
      case 'DISEASES':
        return Array.isArray(tile.activeContagionIds) && tile.activeContagionIds.length ? [218, 73, 68] : null;
      case 'RUINS_ARCHAEOLOGY':
        return tile.ruins?.length ? [176, 126, 236] : tile.fossils?.length ? [120, 95, 168] : null;
      case 'ENVIRONMENTAL_SCARS': {
        const d = clamp01(Math.max(Number(tile.environmentalDamage ?? 0), Number(tile.pollution ?? 0), Number(tile.erosionLevel ?? 0)));
        return d > 0.03 ? hslToRgb(46 - d * 44, 0.7, 0.48 - d * 0.18) : null;
      }
      default:
        return null;
    }
  }

  private paintSurface(state: WorldState, layer: SurfaceLayer) {
    this.ensureRasterResources();
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
        const blend = thematic ? 0.82 : 0;
        surface.data[i] = Math.max(0, Math.min(255, Math.round(lerp(pr, thematic?.[0] ?? pr, blend))));
        surface.data[i + 1] = Math.max(0, Math.min(255, Math.round(lerp(pg, thematic?.[1] ?? pg, blend))));
        surface.data[i + 2] = Math.max(0, Math.min(255, Math.round(lerp(pb, thematic?.[2] ?? pb, blend))));
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

    const cloudCtx = this.cloudCanvas!.getContext('2d')!;
    const clouds = cloudCtx.createImageData(CLOUD_W, CLOUD_H);
    const seed = state.config.seed | 0;
    for (let y = 0; y < CLOUD_H; y++) {
      const ty = ((y + 0.5) / CLOUD_H) * gh;
      const lat = Math.abs((y + 0.5) / CLOUD_H - 0.5) * 2;
      const latitudeBand = 0.72 + Math.cos(lat * Math.PI * 2.2) * 0.16;
      for (let x = 0; x < CLOUD_W; x++) {
        const tx = ((x + 0.5) / CLOUD_W) * gw;
        const tile = this.tileAt(state, tx, ty);
        const rainfall = clamp01(Number(tile?.rainfall ?? tile?.moisture ?? 0));
        const temp = Number(tile?.currentTemp ?? 10);
        const n = hash(seed, x, y, 33) * 0.7 + hash(seed, x >> 1, y >> 1, 37) * 0.3;
        const density = temp < -32 ? 0 : clamp01((rainfall * 0.95 + n * 0.42 + latitudeBand * 0.16 - 0.63) * 2.25);
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

  private syncSurface(state: WorldState, layer: SurfaceLayer) {
    const key = this.visualSignature(state, layer);
    if (key === this.surfaceKey) return;
    this.surfaceKey = key;
    this.paintSurface(state, layer);
  }

  public updateScene(state: WorldState, viewMode: WorldViewMode, layer: SurfaceLayer = 'PHYSICAL') {
    if (!this.scene || !this.worldGroup) return;
    this.currentState = state;
    this.syncSurface(state, layer);

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
    } else {
      const surfaceMaterial = this.surfaceMesh?.material as THREE.MeshStandardMaterial | undefined;
      if (surfaceMaterial && surfaceMaterial.map !== this.surfaceTexture) surfaceMaterial.map = this.surfaceTexture;
      if (this.reliefMesh) this.updateReliefGeometry(state);
    }
    this.requestRender();
  }

  private displaceSphere(geometry: THREE.SphereGeometry, state: WorldState, baseRadius: number, strength: number) {
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    const uv = geometry.attributes.uv as THREE.BufferAttribute;
    const sea = state.config.seaLevel;
    for (let i = 0; i < pos.count; i++) {
      const u = uv.getX(i);
      const v = uv.getY(i);
      const e = this.sampleElevation(state, u * state.config.width, (1 - v) * state.config.height);
      const rel = Math.max(0, e - sea) / Math.max(0.05, 1 - sea);
      const radius = baseRadius + Math.pow(rel, 1.12) * strength;
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
    this.displaceSphere(geometry, state, radius, radius === GLOBE_RADIUS ? 0.72 : 0.5);
    this.surfaceMesh = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({ map: this.surfaceTexture, roughness: 0.8, metalness: 0.01 })
    );
    this.worldGroup!.add(this.surfaceMesh);

    this.oceanMesh = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 1.0025, Math.max(48, Math.floor(widthSegments * 0.75)), Math.max(32, Math.floor(heightSegments * 0.75))),
      new THREE.MeshStandardMaterial({
        color: 0x2c6f98,
        alphaMap: this.waterTexture,
        transparent: true,
        opacity: 0.72,
        roughness: 0.28,
        metalness: 0.02,
        depthWrite: false
      })
    );
    this.oceanMesh.renderOrder = 2;
    this.worldGroup!.add(this.oceanMesh);
  }

  private buildGlobe(state: WorldState, orbital: boolean) {
    if (!this.worldGroup) return;
    this.buildPlanetSphere(state, GLOBE_RADIUS, orbital ? 80 : 88, orbital ? 52 : 58);

    this.atmosphereMesh = new THREE.Mesh(
      new THREE.SphereGeometry(GLOBE_RADIUS * 1.045, 48, 32),
      new THREE.ShaderMaterial({
        transparent: true,
        side: THREE.BackSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uColor: { value: new THREE.Color(0x83b7d9) },
          uIntensity: { value: orbital ? 0.44 : 0.34 }
        },
        vertexShader: `
          varying vec3 vNormalView;
          varying vec3 vViewDir;
          void main() {
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vNormalView = normalize(normalMatrix * normal);
            vViewDir = normalize(-mv.xyz);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: `
          uniform vec3 uColor;
          uniform float uIntensity;
          varying vec3 vNormalView;
          varying vec3 vViewDir;
          void main() {
            float rim = 1.0 - abs(dot(normalize(vNormalView), normalize(vViewDir)));
            float a = pow(clamp(rim, 0.0, 1.0), 2.25) * uIntensity;
            gl_FragColor = vec4(uColor * a, a);
          }
        `
      })
    );
    this.worldGroup.add(this.atmosphereMesh);

    this.cloudMesh = new THREE.Mesh(
      new THREE.SphereGeometry(GLOBE_RADIUS * 1.015, 56, 36),
      new THREE.MeshStandardMaterial({
        color: 0xf2f5f8,
        alphaMap: this.cloudTexture,
        transparent: true,
        opacity: 0.34,
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
      for (let i = 0; i < 48; i++) {
        const x = hash(4411, i, 1) * 128;
        const y = hash(4411, i, 2) * 64;
        const r = 1 + hash(4411, i, 3) * 5;
        const g = Math.round(86 + hash(4411, i, 4) * 42);
        ctx.fillStyle = `rgba(${g},${g + 2},${g + 5},0.6)`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      const moonTexture = new THREE.CanvasTexture(moonCanvas);
      moonTexture.colorSpace = THREE.SRGBColorSpace;
      moonTexture.generateMipmaps = false;
      moonTexture.minFilter = THREE.LinearFilter;
      this.moonMesh = new THREE.Mesh(
        new THREE.SphereGeometry(3.4, 32, 20),
        new THREE.MeshStandardMaterial({ map: moonTexture, roughness: 0.96, metalness: 0 })
      );
      this.moonMesh.position.set(44, 9, -17);
      this.worldGroup.add(this.moonMesh);
    }
  }

  private buildSnowGlobe(state: WorldState) {
    if (!this.worldGroup) return;
    this.buildPlanetSphere(state, SNOW_RADIUS, 68, 44);
    if (this.surfaceMesh) this.surfaceMesh.position.y = 1.4;
    if (this.oceanMesh) this.oceanMesh.position.y = 1.4;

    const base = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: 0x452a18, roughness: 0.72, metalness: 0.02 });
    const brass = new THREE.MeshStandardMaterial({ color: 0xb98b43, roughness: 0.34, metalness: 0.72 });
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(SNOW_RADIUS * 1.0, SNOW_RADIUS * 1.18, 2.8, 40), wood);
    foot.position.y = -SNOW_RADIUS - 3.2;
    base.add(foot);
    const collar = new THREE.Mesh(new THREE.TorusGeometry(SNOW_RADIUS * 0.98, 0.5, 12, 40), brass);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = -SNOW_RADIUS - 1.7;
    base.add(collar);
    this.baseObject = base;
    this.worldGroup.add(base);

    this.glassDomeMesh = new THREE.Mesh(
      new THREE.SphereGeometry(SNOW_RADIUS * 1.4, 56, 38),
      new THREE.MeshPhysicalMaterial({
        color: 0xeaf5ff,
        transparent: true,
        opacity: 0.16,
        roughness: 0.05,
        transmission: 0.88,
        thickness: 1.3,
        ior: 1.42,
        depthWrite: false
      })
    );
    this.glassDomeMesh.position.y = 1.4;
    this.glassDomeMesh.renderOrder = 10;
    this.worldGroup.add(this.glassDomeMesh);

    const count = 220;
    const snowPos = new Float32Array(count * 3);
    this.snowVelocity = new Float32Array(count);
    const seed = state.config.seed | 0;
    for (let i = 0; i < count; i++) {
      const theta = hash(seed, i, 11) * Math.PI * 2;
      const phi = Math.acos(2 * hash(seed, i, 17) - 1);
      const r = Math.cbrt(hash(seed, i, 23)) * SNOW_RADIUS * 1.28;
      snowPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      snowPos[i * 3 + 1] = r * Math.cos(phi) + 1.4;
      snowPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      this.snowVelocity[i] = 0.7 + hash(seed, i, 29) * 1.1;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
    this.particleSystem = new THREE.Points(
      geo,
      new THREE.PointsMaterial({ color: 0xffffff, size: 0.17, transparent: true, opacity: 0.72, depthWrite: false })
    );
    this.worldGroup.add(this.particleSystem);
  }

  private buildRelief(state: WorldState) {
    if (!this.worldGroup) return;
    const cols = state.config.width;
    const rows = state.config.height;
    const spanX = 42;
    const spanZ = spanX * (rows / cols);
    this.reliefMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(spanX, spanZ, cols - 1, rows - 1),
      new THREE.MeshStandardMaterial({ map: this.surfaceTexture, roughness: 0.86, metalness: 0.01 })
    );
    this.reliefMesh.rotation.x = -Math.PI / 2;
    this.updateReliefGeometry(state);
    this.worldGroup.add(this.reliefMesh);

    this.oceanPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(spanX, spanZ),
      new THREE.MeshStandardMaterial({ color: 0x245d7f, transparent: true, opacity: 0.66, roughness: 0.28, depthWrite: false })
    );
    this.oceanPlane.rotation.x = -Math.PI / 2;
    this.oceanPlane.position.y = 0.02;
    this.worldGroup.add(this.oceanPlane);

    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(spanX * 1.02, 2.5, spanZ * 1.02),
      new THREE.MeshStandardMaterial({ color: 0x202730, roughness: 0.9, metalness: 0.02 })
    );
    slab.position.y = -1.45;
    this.baseObject = slab;
    this.worldGroup.add(slab);
  }

  private updateReliefGeometry(state: WorldState) {
    if (!this.reliefMesh) return;
    const geometry = this.reliefMesh.geometry as THREE.PlaneGeometry;
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    const cols = state.config.width;
    const sea = state.config.seaLevel;
    for (let i = 0; i < pos.count; i++) {
      const x = Math.min(cols - 1, i % cols);
      const y = Math.min(state.config.height - 1, Math.floor(i / cols));
      const e = state.grid[y]?.[x]?.elevation ?? sea;
      const rel = e - sea;
      pos.setZ(i, rel >= 0 ? rel * 5.2 : rel * 2.1);
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
        this.targetZoom = this.distanceToFit(GLOBE_RADIUS, 1.22);
        this.rotX = 0.22;
        this.verticalBias = 1.2;
        break;
      case 'ORBITAL_VIEW':
        this.targetZoom = this.distanceToFit(GLOBE_RADIUS, 2.45);
        this.rotX = 0.13;
        this.verticalBias = 0.8;
        break;
      case 'SNOW_GLOBE':
        this.targetZoom = this.distanceToFit(SNOW_RADIUS * 1.4, 1.45);
        this.rotX = 0.14;
        this.verticalBias = 0;
        break;
      default:
        this.targetZoom = this.distanceToFit(23, 1.08);
        this.rotX = 0.6;
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
    this.camera.lookAt(0, 0, 0);
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
      if (elapsed < 33) return;
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
    if (!this.worldGroup) return;
    if (!tile) {
      if (this.selectionMarker) this.disposeObject(this.selectionMarker);
      this.selectionMarker = null;
      this.requestRender();
      return;
    }
    if (!this.selectionMarker) {
      this.selectionMarker = new THREE.Mesh(
        new THREE.RingGeometry(0.58, 0.84, 28),
        new THREE.MeshBasicMaterial({ color: 0x8edcff, transparent: true, opacity: 0.92, side: THREE.DoubleSide, depthTest: false })
      );
      this.selectionMarker.renderOrder = 20;
      this.worldGroup.add(this.selectionMarker);
    }

    const u = (tile.x + 0.5) / state.config.width;
    const v = (tile.y + 0.5) / state.config.height;
    if (this.reliefMesh) {
      const geo = this.reliefMesh.geometry as THREE.PlaneGeometry;
      const t = state.grid[tile.y]?.[tile.x];
      const rel = (t?.elevation ?? state.config.seaLevel) - state.config.seaLevel;
      this.selectionMarker.position.set((u - 0.5) * geo.parameters.width, (rel >= 0 ? rel * 5.2 : rel * 2.1) + 0.28, (v - 0.5) * geo.parameters.height);
      this.selectionMarker.rotation.set(-Math.PI / 2, 0, 0);
    } else if (this.surfaceMesh) {
      const base = (this.surfaceMesh.geometry as THREE.SphereGeometry).parameters.radius;
      const e = this.sampleElevation(state, (tile.x + 0.5), (tile.y + 0.5));
      const rel = Math.max(0, e - state.config.seaLevel) / Math.max(0.05, 1 - state.config.seaLevel);
      const radius = base + Math.pow(rel, 1.12) * (base === GLOBE_RADIUS ? 0.72 : 0.5) + 0.12;
      const lon = (u - 0.5) * Math.PI * 2;
      const lat = (0.5 - v) * Math.PI;
      const normal = new THREE.Vector3(Math.cos(lat) * Math.sin(lon + Math.PI), Math.sin(lat), Math.cos(lat) * Math.cos(lon + Math.PI)).normalize();
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
      x: Math.max(0, Math.min(state.config.width - 1, Math.floor(hit.uv.x * state.config.width))),
      y: Math.max(0, Math.min(state.config.height - 1, Math.floor((1 - hit.uv.y) * state.config.height)))
    };
  }

  public focusTile(tileX: number, tileY: number, width: number, height: number) {
    const u = (tileX + 0.5) / width;
    const v = (tileY + 0.5) / height;
    this.rotY = (u - 0.5) * Math.PI * 2;
    this.rotX = Math.max(-1.1, Math.min(1.1, (0.5 - v) * Math.PI));
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
          const tile: any = state.grid[y]?.[x];
          if (!tile) continue;
          const latitude = 0.45 + Math.sin(((y + 0.5) / height) * Math.PI) * 0.55;
          const tileScore = ((tile.isWater ? 0 : 3) + Math.min(2.5, Number(tile.biomass ?? 0) / 380) + Number(tile.vegetationDensity ?? 0) * 1.4 + (tile.settlementId ? 9 : 0) + (tile.ruins?.length ? 5 : 0)) * latitude;
          score += tileScore;
          weightedY += y * Math.max(0.1, tileScore);
          weight += Math.max(0.1, tileScore);
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestX = cx;
        bestY = Math.max(0, Math.min(height - 1, Math.round(weightedY / Math.max(1, weight))));
      }
    }
    this.focusTile(bestX, bestY, width, height);
  }

  public resize(width: number, height: number) {
    if (!this.renderer || !this.camera || width <= 0 || height <= 0) return;
    const oldAspect = this.camera.aspect;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35));
    this.renderer.setSize(width, height, false);
    if (this.currentViewMode && Math.abs(oldAspect - this.camera.aspect) > 0.001) this.frameView(this.currentViewMode);
    this.requestRender();
  }

  public rotate(deltaX: number, deltaY: number) {
    this.rotY += deltaX * 0.008;
    this.rotX = Math.max(-1.35, Math.min(1.35, this.rotX + deltaY * 0.008));
    this.requestRender();
  }

  public zoom(delta: number) {
    const relief = !!this.reliefMesh;
    const min = relief ? 26 : 24;
    const max = relief ? 120 : 220;
    this.targetZoom = Math.max(min, Math.min(max, this.targetZoom * (1 + delta * 0.0012)));
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
    ]) this.disposeObject(object);
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
    this.currentState = null;

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
