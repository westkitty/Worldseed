import * as THREE from 'three';
import { WorldState, WorldViewMode } from '../../types/simulation';

type ViewPreset = {
  distance: number;
  rotX: number;
  rotY: number;
};

const VIEW_PRESETS: Record<Extract<WorldViewMode, 'GLOBE' | 'SNOW_GLOBE' | 'RELIEF_DIORAMA' | 'ORBITAL_VIEW'>, ViewPreset> = {
  GLOBE: { distance: 44, rotX: 0.18, rotY: -0.35 },
  SNOW_GLOBE: { distance: 50, rotX: 0.16, rotY: -0.28 },
  RELIEF_DIORAMA: { distance: 43, rotX: 0.52, rotY: -0.28 },
  ORBITAL_VIEW: { distance: 58, rotX: 0.14, rotY: -0.55 }
};

export class ThreeWorldRenderer {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private animFrameId: number | null = null;

  private surfaceMesh: THREE.Mesh | null = null;
  private baseMesh: THREE.Mesh | null = null;
  private cloudMesh: THREE.Mesh | null = null;
  private atmosphereMesh: THREE.Mesh | null = null;
  private glassDomeMesh: THREE.Mesh | null = null;
  private reliefMesh: THREE.Mesh | null = null;
  private moonMesh: THREE.Mesh | null = null;
  private starfieldPoints: THREE.Points | null = null;
  private particleSystem: THREE.Points | null = null;
  private featureGroup: THREE.Group | null = null;
  private worldTexture: THREE.CanvasTexture | null = null;

  public rotX = 0.18;
  public rotY = -0.35;
  public zoomDistance = 44;
  private targetZoom = 44;

  private currentViewMode: WorldViewMode | null = null;
  private currentDimensions = '';
  private currentFeatureSignature = '';
  private raycaster = new THREE.Raycaster();
  private mouseVec = new THREE.Vector2();

  constructor(container: HTMLElement) {
    this.container = container;
    this.init();
  }

  private init() {
    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 600;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.domElement.dataset.worldseedRenderer = 'three';
    this.container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1200);
    this.camera.position.set(0, 0, this.zoomDistance);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x02060b, 0.0017);
    this.scene.add(new THREE.HemisphereLight(0xa7ddff, 0x071019, 0.72));

    const keyLight = new THREE.DirectionalLight(0xfff1d1, 2.1);
    keyLight.position.set(55, 38, 70);
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x6bbcff, 0.55);
    fillLight.position.set(-45, -20, 30);
    this.scene.add(fillLight);

    this.createStarfield();
    this.startLoop();
  }

  private seededUnit(seed: number, index: number) {
    let value = (seed ^ Math.imul(index + 1, 0x9e3779b1)) >>> 0;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    return (value >>> 0) / 0xffffffff;
  }

  private createStarfield() {
    if (!this.scene) return;
    const starGeo = new THREE.BufferGeometry();
    const count = 900;
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const radius = 170 + this.seededUnit(0x574f524c, i) * 350;
      const theta = this.seededUnit(0x53454544, i) * Math.PI * 2;
      const z = this.seededUnit(0x53544152, i) * 2 - 1;
      const planar = Math.sqrt(Math.max(0, 1 - z * z));
      positions[i * 3] = Math.cos(theta) * planar * radius;
      positions[i * 3 + 1] = z * radius;
      positions[i * 3 + 2] = Math.sin(theta) * planar * radius;
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.starfieldPoints = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({
        color: 0xa6b8ca,
        size: 0.85,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        sizeAttenuation: true
      })
    );
    this.scene.add(this.starfieldPoints);
  }

  private biomeColor(biome: string): string {
    const colors: Record<string, string> = {
      DEEP_OCEAN: '#082c46',
      SHALLOW_OCEAN: '#176887',
      HYDROTHERMAL_RIFT: '#542d28',
      COASTAL_REEF: '#1c7f88',
      TUNDRA: '#9fa9a7',
      TAIGA: '#2d5247',
      TEMPERATE_FOREST: '#32663f',
      TEMPERATE_GRASSLAND: '#66864a',
      TROPICAL_RAINFOREST: '#235638',
      SAVANNA: '#8b7a3d',
      HOT_DESERT: '#aa8550',
      COLD_DESERT: '#80827c',
      WETLAND: '#2e6d5d',
      ALPINE: '#c8cbc5',
      VOLCANIC_BARREN: '#51443f'
    };
    return colors[biome] || '#476b4c';
  }

  private physicalColor(tile: WorldState['grid'][number][number]): string {
    if (tile.isWater) {
      const depth = THREE.MathUtils.clamp(tile.waterDepth, 0, 1);
      const color = new THREE.Color('#1a7897').lerp(new THREE.Color('#061c32'), depth * 0.86);
      if (tile.biome === 'COASTAL_REEF') color.lerp(new THREE.Color('#2a9f95'), 0.45);
      if (tile.biome === 'HYDROTHERMAL_RIFT') color.lerp(new THREE.Color('#5c403d'), 0.5);
      return color.getStyle();
    }

    const color = new THREE.Color(this.biomeColor(tile.biome));
    const elevation = THREE.MathUtils.clamp(tile.elevation, 0, 1);
    const fertility = THREE.MathUtils.clamp(tile.soilFertility, 0, 1);
    const vegetation = THREE.MathUtils.clamp(tile.vegetationDensity, 0, 1);

    color.multiplyScalar(0.82 + elevation * 0.22 + fertility * 0.08);
    if (vegetation > 0.35 && tile.biome !== 'HOT_DESERT') {
      color.lerp(new THREE.Color('#2c6040'), vegetation * 0.12);
    }
    if (elevation > 0.72) color.lerp(new THREE.Color('#d4d6d0'), (elevation - 0.72) * 1.35);
    return color.getStyle();
  }

  private hashHue(value: string): number {
    let hash = 0;
    for (let i = 0; i < value.length; i++) hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
    return Math.abs(hash) % 360;
  }

  private layerColor(state: WorldState, tile: WorldState['grid'][number][number], layer: string): string {
    switch (layer) {
      case 'PHYSICAL':
        return this.physicalColor(tile);
      case 'BIOMES':
        return this.biomeColor(tile.biome);
      case 'TEMPERATURE': {
        const t = THREE.MathUtils.clamp((tile.currentTemp + 35) / 85, 0, 1);
        return `hsl(${220 - t * 220} 76% ${34 + t * 18}%)`;
      }
      case 'RAINFALL': {
        const r = THREE.MathUtils.clamp(tile.rainfall, 0, 1);
        return `hsl(${218 - r * 38} 68% ${24 + r * 38}%)`;
      }
      case 'BIODIVERSITY': {
        const activity = THREE.MathUtils.clamp((tile.biomass / 1000 + tile.vegetationDensity) / 2, 0, 1);
        return `hsl(${35 + activity * 90} 58% ${25 + activity * 28}%)`;
      }
      case 'POLITICAL':
        return tile.polityId ? `hsl(${this.hashHue(tile.polityId)} 55% 48%)` : this.physicalColor(tile);
      case 'SETTLEMENTS':
        return tile.settlementId ? '#d6a33e' : (tile.infrastructureLevel > 0 ? '#785f37' : this.physicalColor(tile));
      case 'CULTURES':
        return tile.dominantCultureId
          ? (state.cultures[tile.dominantCultureId]?.colorHex || `hsl(${this.hashHue(tile.dominantCultureId)} 52% 48%)`)
          : this.physicalColor(tile);
      case 'LANGUAGES': {
        const languageId = tile.dominantCultureId ? state.cultures[tile.dominantCultureId]?.languageId : undefined;
        return languageId ? `hsl(${this.hashHue(languageId)} 54% 50%)` : this.physicalColor(tile);
      }
      case 'DISEASES':
        return tile.activeContagionIds.length > 0 ? '#bc4e52' : this.physicalColor(tile);
      case 'RUINS_ARCHAEOLOGY':
        return tile.ruins.length > 0 || tile.fossils.length > 0 ? '#8d6caf' : this.physicalColor(tile);
      case 'ENVIRONMENTAL_SCARS': {
        const damage = THREE.MathUtils.clamp(Math.max(tile.environmentalDamage, tile.pollution, tile.erosionLevel), 0, 1);
        if (damage <= 0.05) return this.physicalColor(tile);
        const base = new THREE.Color(this.physicalColor(tile));
        return base.lerp(new THREE.Color('#8d5034'), damage * 0.78).getStyle();
      }
      default:
        return this.physicalColor(tile);
    }
  }

  private createWorldTexture(state: WorldState, layer: string): THREE.CanvasTexture {
    const width = state.config.width;
    const height = state.config.height;
    const source = document.createElement('canvas');
    source.width = width;
    source.height = height;
    const sourceCtx = source.getContext('2d');
    if (!sourceCtx) throw new Error('WORLDSEED could not create the world texture source canvas.');

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tile = state.grid[y]?.[x];
        if (!tile) continue;
        sourceCtx.fillStyle = this.layerColor(state, tile, layer);
        sourceCtx.fillRect(x, y, 1, 1);
      }
    }

    const scale = 16;
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('WORLDSEED could not create the 3D world texture canvas.');

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);

    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = image.data;
    const seed = state.config.seed >>> 0;
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const i = (y * canvas.width + x) * 4;
        const n = this.seededUnit(seed ^ Math.imul(x, 374761393), Math.imul(y, 668265263)) - 0.5;
        const grain = n * 8;
        data[i] = THREE.MathUtils.clamp(data[i] + grain, 0, 255);
        data[i + 1] = THREE.MathUtils.clamp(data[i + 1] + grain, 0, 255);
        data[i + 2] = THREE.MathUtils.clamp(data[i + 2] + grain, 0, 255);
      }
    }
    ctx.putImageData(image, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
    if (this.renderer) texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    texture.needsUpdate = true;
    return texture;
  }

  private replaceWorldTexture(state: WorldState, layer: string) {
    const nextTexture = this.createWorldTexture(state, layer);
    const oldTexture = this.worldTexture;
    this.worldTexture = nextTexture;

    for (const mesh of [this.surfaceMesh, this.reliefMesh]) {
      if (!mesh) continue;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) {
        if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial) {
          material.map = nextTexture;
          material.needsUpdate = true;
        }
      }
    }
    oldTexture?.dispose();
  }

  private viewPreset(mode: WorldViewMode): ViewPreset {
    if (mode === 'GLOBE' || mode === 'SNOW_GLOBE' || mode === 'RELIEF_DIORAMA' || mode === 'ORBITAL_VIEW') {
      return VIEW_PRESETS[mode];
    }
    return VIEW_PRESETS.GLOBE;
  }

  private resetCameraForView(mode: WorldViewMode) {
    const preset = this.viewPreset(mode);
    this.rotX = preset.rotX;
    this.rotY = preset.rotY;
    this.zoomDistance = preset.distance;
    this.targetZoom = preset.distance;
  }

  public updateScene(state: WorldState, viewMode: WorldViewMode, layer = 'PHYSICAL') {
    if (!this.scene) return;

    const dimensions = `${state.config.width}x${state.config.height}`;
    const needsRebuild = this.currentViewMode !== viewMode || this.currentDimensions !== dimensions || (!this.surfaceMesh && !this.reliefMesh);

    if (!needsRebuild) {
      this.replaceWorldTexture(state, layer);
      if (this.reliefMesh) this.updateReliefGeometry(state);
      this.updateFeatureMarkers(state, viewMode);
      return;
    }

    this.clearWorldMeshes();
    this.worldTexture?.dispose();
    this.worldTexture = this.createWorldTexture(state, layer);
    this.currentViewMode = viewMode;
    this.currentDimensions = dimensions;
    this.resetCameraForView(viewMode);

    if (viewMode === 'GLOBE' || viewMode === 'ORBITAL_VIEW') {
      const radius = viewMode === 'ORBITAL_VIEW' ? 12.5 : 15.5;
      this.surfaceMesh = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 96, 72),
        new THREE.MeshStandardMaterial({ map: this.worldTexture, roughness: 0.82, metalness: 0.02 })
      );
      this.scene.add(this.surfaceMesh);

      this.cloudMesh = new THREE.Mesh(
        new THREE.SphereGeometry(radius * 1.018, 72, 54),
        new THREE.MeshPhysicalMaterial({
          color: 0xd8edf3,
          transparent: true,
          opacity: 0.085,
          roughness: 0.92,
          depthWrite: false
        })
      );
      this.scene.add(this.cloudMesh);

      this.atmosphereMesh = new THREE.Mesh(
        new THREE.SphereGeometry(radius * 1.055, 72, 54),
        new THREE.MeshBasicMaterial({
          color: 0x5cbce0,
          transparent: true,
          opacity: 0.08,
          side: THREE.BackSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        })
      );
      this.scene.add(this.atmosphereMesh);

      if (viewMode === 'ORBITAL_VIEW') {
        this.moonMesh = new THREE.Mesh(
          new THREE.SphereGeometry(2.6, 32, 24),
          new THREE.MeshStandardMaterial({ color: 0x8f989f, roughness: 0.95 })
        );
        this.moonMesh.position.set(27, 8, -13);
        this.scene.add(this.moonMesh);
      }
    } else if (viewMode === 'SNOW_GLOBE') {
      const radius = 10.8;
      this.baseMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(radius * 1.18, radius * 1.38, 4.5, 64),
        new THREE.MeshStandardMaterial({ color: 0x372519, roughness: 0.58, metalness: 0.08 })
      );
      this.baseMesh.position.set(0, -radius - 2.1, 0);
      this.scene.add(this.baseMesh);

      this.surfaceMesh = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 88, 64),
        new THREE.MeshStandardMaterial({ map: this.worldTexture, roughness: 0.86, metalness: 0.01 })
      );
      this.scene.add(this.surfaceMesh);

      this.atmosphereMesh = new THREE.Mesh(
        new THREE.SphereGeometry(radius * 1.045, 64, 48),
        new THREE.MeshBasicMaterial({ color: 0x7ed8ef, transparent: true, opacity: 0.065, side: THREE.BackSide, depthWrite: false })
      );
      this.scene.add(this.atmosphereMesh);

      this.glassDomeMesh = new THREE.Mesh(
        new THREE.SphereGeometry(radius * 1.36, 72, 54),
        new THREE.MeshPhysicalMaterial({
          color: 0xe9fbff,
          transparent: true,
          opacity: 0.11,
          roughness: 0.05,
          transmission: 0.92,
          thickness: 0.7,
          ior: 1.35,
          depthWrite: false
        })
      );
      this.glassDomeMesh.renderOrder = 10;
      this.scene.add(this.glassDomeMesh);

      const snowCount = 260;
      const snowGeo = new THREE.BufferGeometry();
      const snowPos = new Float32Array(snowCount * 3);
      for (let i = 0; i < snowCount; i++) {
        const u = this.seededUnit(state.config.seed, i * 3);
        const v = this.seededUnit(state.config.seed ^ 0x51a7, i * 3 + 1);
        const theta = u * 2 * Math.PI;
        const phi = Math.acos(2 * v - 1);
        const r = Math.cbrt(this.seededUnit(state.config.seed ^ 0x9bc1, i * 3 + 2)) * radius * 1.24;
        snowPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        snowPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        snowPos[i * 3 + 2] = r * Math.cos(phi);
      }
      snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
      this.particleSystem = new THREE.Points(
        snowGeo,
        new THREE.PointsMaterial({ color: 0xeafaff, size: 0.34, transparent: true, opacity: 0.72, depthWrite: false })
      );
      this.scene.add(this.particleSystem);
    } else if (viewMode === 'RELIEF_DIORAMA' || viewMode === 'SQUARE_TILE') {
      this.reliefMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(34, 25.5, Math.max(1, state.config.width - 1), Math.max(1, state.config.height - 1)),
        new THREE.MeshStandardMaterial({ map: this.worldTexture, roughness: 0.86, metalness: 0.01, side: THREE.DoubleSide })
      );
      this.reliefMesh.rotation.x = -Math.PI / 2.75;
      this.updateReliefGeometry(state);
      this.scene.add(this.reliefMesh);
    }

    this.updateFeatureMarkers(state, viewMode, true);
  }

  private updateReliefGeometry(state: WorldState) {
    if (!this.reliefMesh) return;
    const geometry = this.reliefMesh.geometry as THREE.PlaneGeometry;
    const posAttr = geometry.attributes.position as THREE.BufferAttribute;
    const cols = state.config.width;

    for (let i = 0; i < posAttr.count; i++) {
      const gridX = i % cols;
      const gridY = Math.floor(i / cols);
      const tile = state.grid[Math.min(state.config.height - 1, gridY)]?.[Math.min(state.config.width - 1, gridX)];
      const normalized = tile ? THREE.MathUtils.clamp(tile.elevation, -0.55, 1) : 0;
      posAttr.setZ(i, normalized * 2.4);
    }
    posAttr.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  private featureSignature(state: WorldState) {
    return `${Object.keys(state.settlements).length}:${Object.keys(state.ruins).length}:${state.currentYear}`;
  }

  private updateFeatureMarkers(state: WorldState, mode: WorldViewMode, force = false) {
    const signature = this.featureSignature(state);
    if (!force && signature === this.currentFeatureSignature) return;
    this.currentFeatureSignature = signature;

    this.disposeObject(this.featureGroup);
    this.featureGroup = new THREE.Group();

    const settlements = Object.values(state.settlements).slice(0, 180);
    for (const settlement of settlements) {
      const size = settlement.tier === 'METROPOLIS' ? 0.22 : settlement.tier === 'CITY' ? 0.17 : 0.12;
      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(size, 10, 8),
        new THREE.MeshBasicMaterial({ color: 0xf0c15d, transparent: true, opacity: 0.92 })
      );
      this.positionFeature(marker, settlement.tileX, settlement.tileY, state, mode, 0.15);
      this.featureGroup.add(marker);
    }

    for (const row of state.grid) {
      for (const tile of row) {
        if (tile.ruins.length === 0) continue;
        const marker = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.1, 0),
          new THREE.MeshBasicMaterial({ color: 0xa990cb, transparent: true, opacity: 0.78 })
        );
        this.positionFeature(marker, tile.x, tile.y, state, mode, 0.1);
        this.featureGroup.add(marker);
      }
    }

    if (this.featureGroup.children.length > 0) this.scene?.add(this.featureGroup);
  }

  private positionFeature(object: THREE.Object3D, x: number, y: number, state: WorldState, mode: WorldViewMode, lift: number) {
    const u = (x + 0.5) / state.config.width;
    const v = (y + 0.5) / state.config.height;

    if (mode === 'GLOBE' || mode === 'ORBITAL_VIEW' || mode === 'SNOW_GLOBE') {
      const radius = mode === 'ORBITAL_VIEW' ? 12.5 : mode === 'SNOW_GLOBE' ? 10.8 : 15.5;
      const theta = (u - 0.5) * Math.PI * 2;
      const phi = (0.5 - v) * Math.PI;
      const r = radius + lift;
      object.position.set(
        Math.cos(phi) * Math.sin(theta) * r,
        Math.sin(phi) * r,
        Math.cos(phi) * Math.cos(theta) * r
      );
      object.lookAt(0, 0, 0);
      return;
    }

    const px = (u - 0.5) * 34;
    const py = (0.5 - v) * 25.5;
    const tile = state.grid[y]?.[x];
    const pz = (tile ? THREE.MathUtils.clamp(tile.elevation, -0.55, 1) * 2.4 : 0) + lift;
    object.position.set(px, py, pz);
    object.rotation.x = Math.PI / 2.75;
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
    this.rotY = -(u - 0.5) * Math.PI * 2 - Math.PI / 2;
    this.rotX = Math.max(-1.1, Math.min(1.1, (0.5 - v) * Math.PI * 0.82));
  }

  private disposeObject(object: THREE.Object3D | null) {
    if (!object) return;
    this.scene?.remove(object);
    object.traverse(child => {
      const mesh = child as THREE.Mesh;
      mesh.geometry?.dispose();
      const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(material)) material.forEach(mat => mat.dispose());
      else material?.dispose();
    });
  }

  private clearWorldMeshes() {
    this.disposeObject(this.surfaceMesh);
    this.disposeObject(this.baseMesh);
    this.disposeObject(this.cloudMesh);
    this.disposeObject(this.atmosphereMesh);
    this.disposeObject(this.glassDomeMesh);
    this.disposeObject(this.reliefMesh);
    this.disposeObject(this.moonMesh);
    this.disposeObject(this.particleSystem);
    this.disposeObject(this.featureGroup);
    this.surfaceMesh = null;
    this.baseMesh = null;
    this.cloudMesh = null;
    this.atmosphereMesh = null;
    this.glassDomeMesh = null;
    this.reliefMesh = null;
    this.moonMesh = null;
    this.particleSystem = null;
    this.featureGroup = null;
    this.currentFeatureSignature = '';
  }

  private startLoop() {
    const loop = () => {
      this.animFrameId = requestAnimationFrame(loop);
      this.zoomDistance += (this.targetZoom - this.zoomDistance) * 0.095;
      if (this.camera) {
        this.camera.position.x = this.zoomDistance * Math.sin(this.rotY) * Math.cos(this.rotX);
        this.camera.position.y = this.zoomDistance * Math.sin(this.rotX);
        this.camera.position.z = this.zoomDistance * Math.cos(this.rotY) * Math.cos(this.rotX);
        this.camera.lookAt(0, 0, 0);
      }
      if (this.cloudMesh) this.cloudMesh.rotation.y += 0.00045;
      if (this.moonMesh) this.moonMesh.rotation.y += 0.0012;
      if (this.particleSystem) this.particleSystem.rotation.y += 0.0008;
      if (this.renderer && this.scene && this.camera) this.renderer.render(this.scene, this.camera);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  public resize(width: number, height: number) {
    if (!this.renderer || !this.camera || width <= 0 || height <= 0) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public rotate(deltaX: number, deltaY: number) {
    this.rotY += deltaX * 0.008;
    this.rotX = Math.max(-1.18, Math.min(1.18, this.rotX + deltaY * 0.008));
  }

  public zoom(delta: number) {
    const preset = this.viewPreset(this.currentViewMode ?? 'GLOBE');
    const minDistance = Math.max(24, preset.distance * 0.62);
    const maxDistance = Math.max(95, preset.distance * 2.1);
    this.targetZoom = Math.max(minDistance, Math.min(maxDistance, this.targetZoom + delta * 0.032));
  }

  public getRendererInfo() {
    return this.renderer?.info ?? null;
  }

  public dispose() {
    if (this.animFrameId !== null) cancelAnimationFrame(this.animFrameId);
    this.animFrameId = null;
    this.clearWorldMeshes();

    if (this.starfieldPoints) {
      this.disposeObject(this.starfieldPoints);
      this.starfieldPoints = null;
    }

    this.worldTexture?.dispose();
    this.worldTexture = null;

    if (this.renderer) {
      this.renderer.dispose();
      const canvas = this.renderer.domElement;
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    }

    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.currentViewMode = null;
    this.currentDimensions = '';
    this.currentFeatureSignature = '';
  }
}
