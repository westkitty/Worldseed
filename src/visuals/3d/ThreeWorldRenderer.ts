// Genuine WebGL True 3D World Renderer using Three.js (CC0-1.0)

import * as THREE from 'three';
import { WorldState, WorldViewMode } from '../../types/simulation';

export class ThreeWorldRenderer {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private animFrameId: number | null = null;

  private surfaceMesh: THREE.Mesh | null = null;
  private baseMesh: THREE.Mesh | null = null;
  private cloudMesh: THREE.Mesh | null = null;
  private glassDomeMesh: THREE.Mesh | null = null;
  private reliefMesh: THREE.Mesh | null = null;
  private moonMesh: THREE.Mesh | null = null;
  private starfieldPoints: THREE.Points | null = null;
  private particleSystem: THREE.Points | null = null;
  private worldTexture: THREE.CanvasTexture | null = null;

  public rotX = 0.3;
  public rotY = 0.0;
  public zoomDistance = 50;
  private targetZoom = 50;

  private currentViewMode: WorldViewMode | null = null;
  private currentDimensions = '';
  private raycaster = new THREE.Raycaster();
  private mouseVec = new THREE.Vector2();

  constructor(container: HTMLElement) {
    this.container = container;
    this.init();
  }

  private init() {
    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 600;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.domElement.dataset.worldseedRenderer = 'three';
    this.container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(0, 0, this.zoomDistance);

    this.scene = new THREE.Scene();
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const dirLight = new THREE.DirectionalLight(0xfffaed, 1.2);
    dirLight.position.set(60, 40, 50);
    this.scene.add(dirLight);

    this.createStarfield();
    this.startLoop();
  }

  private createStarfield() {
    if (!this.scene) return;
    const starGeo = new THREE.BufferGeometry();
    const count = 1200;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 500;
      positions[i + 1] = (Math.random() - 0.5) * 500;
      positions[i + 2] = (Math.random() - 0.5) * 500;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.starfieldPoints = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ color: 0x94a3b8, size: 1.2, transparent: true, opacity: 0.6 })
    );
    this.scene.add(this.starfieldPoints);
  }

  private biomeColor(biome: string): string {
    const colors: Record<string, string> = {
      DEEP_OCEAN: '#0284c7', SHALLOW_OCEAN: '#38bdf8', HYDROTHERMAL_RIFT: '#dc2626',
      COASTAL_REEF: '#06b6d4', TUNDRA: '#e2e8f0', TAIGA: '#334155',
      TEMPERATE_FOREST: '#15803d', TEMPERATE_GRASSLAND: '#65a30d', TROPICAL_RAINFOREST: '#14532d',
      SAVANNA: '#ca8a04', HOT_DESERT: '#eab308', COLD_DESERT: '#94a3b8',
      WETLAND: '#047857', ALPINE: '#f8fafc', VOLCANIC_BARREN: '#451a03'
    };
    return colors[biome] || '#15803d';
  }

  private hashHue(value: string): number {
    let hash = 0;
    for (let i = 0; i < value.length; i++) hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
    return Math.abs(hash) % 360;
  }

  private layerColor(state: WorldState, tile: WorldState['grid'][number][number], layer: string): string {
    switch (layer) {
      case 'TEMPERATURE': {
        const t = THREE.MathUtils.clamp((tile.currentTemp + 35) / 85, 0, 1);
        return `hsl(${220 - t * 220} 82% 52%)`;
      }
      case 'RAINFALL': {
        const r = THREE.MathUtils.clamp(tile.rainfall, 0, 1);
        return `hsl(${210 - r * 25} 86% ${22 + r * 48}%)`;
      }
      case 'BIODIVERSITY': {
        const activity = THREE.MathUtils.clamp((tile.biomass / 1000 + tile.vegetationDensity) / 2, 0, 1);
        return `hsl(${25 + activity * 115} 72% ${26 + activity * 34}%)`;
      }
      case 'POLITICAL':
        return tile.polityId ? `hsl(${this.hashHue(tile.polityId)} 68% 50%)` : (tile.isWater ? '#0c4a6e' : '#334155');
      case 'SETTLEMENTS':
        return tile.settlementId ? '#f59e0b' : (tile.infrastructureLevel > 0 ? '#a16207' : (tile.isWater ? '#0c4a6e' : '#1f2937'));
      case 'CULTURES':
        return tile.dominantCultureId ? (state.cultures[tile.dominantCultureId]?.colorHex || `hsl(${this.hashHue(tile.dominantCultureId)} 62% 50%)`) : (tile.isWater ? '#0c4a6e' : '#334155');
      case 'LANGUAGES': {
        const languageId = tile.dominantCultureId ? state.cultures[tile.dominantCultureId]?.languageId : undefined;
        return languageId ? `hsl(${this.hashHue(languageId)} 68% 52%)` : (tile.isWater ? '#0c4a6e' : '#334155');
      }
      case 'DISEASES':
        return tile.activeContagionIds.length > 0 ? '#ef4444' : (tile.isWater ? '#0c4a6e' : '#1f2937');
      case 'RUINS_ARCHAEOLOGY':
        return tile.ruins.length > 0 || tile.fossils.length > 0 ? '#a855f7' : (tile.isWater ? '#0c4a6e' : '#292524');
      case 'ENVIRONMENTAL_SCARS': {
        const damage = THREE.MathUtils.clamp(Math.max(tile.environmentalDamage, tile.pollution, tile.erosionLevel), 0, 1);
        return damage > 0.05 ? `hsl(${42 - damage * 42} 82% ${48 - damage * 18}%)` : this.biomeColor(tile.biome);
      }
      default:
        return this.biomeColor(tile.biome);
    }
  }

  private createWorldTexture(state: WorldState, layer: string): THREE.CanvasTexture {
    const width = state.config.width;
    const height = state.config.height;
    const canvas = document.createElement('canvas');
    canvas.width = width * 8;
    canvas.height = height * 8;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('WORLDSEED could not create the 3D world texture canvas.');

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tile = state.grid[y]?.[x];
        if (!tile) continue;
        ctx.fillStyle = this.layerColor(state, tile, layer);
        ctx.fillRect(x * 8, y * 8, 8, 8);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
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

  public updateScene(state: WorldState, viewMode: WorldViewMode, layer = 'PHYSICAL') {
    if (!this.scene) return;

    const dimensions = `${state.config.width}x${state.config.height}`;
    const needsRebuild = this.currentViewMode !== viewMode || this.currentDimensions !== dimensions || (!this.surfaceMesh && !this.reliefMesh);

    if (!needsRebuild) {
      this.replaceWorldTexture(state, layer);
      if (this.reliefMesh) this.updateReliefGeometry(state);
      return;
    }

    this.clearWorldMeshes();
    this.worldTexture?.dispose();
    this.worldTexture = this.createWorldTexture(state, layer);
    this.currentViewMode = viewMode;
    this.currentDimensions = dimensions;

    if (viewMode === 'GLOBE' || viewMode === 'ORBITAL_VIEW') {
      const radius = 18;
      this.surfaceMesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 48), new THREE.MeshStandardMaterial({ map: this.worldTexture, roughness: 0.7, metalness: 0.1 }));
      this.scene.add(this.surfaceMesh);

      this.cloudMesh = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.025, 32, 32), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.2, depthWrite: false, roughness: 0.9 }));
      this.scene.add(this.cloudMesh);

      if (viewMode === 'ORBITAL_VIEW') {
        this.moonMesh = new THREE.Mesh(new THREE.SphereGeometry(3.5, 24, 24), new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8 }));
        this.moonMesh.position.set(38, 12, -15);
        this.scene.add(this.moonMesh);
      }
    } else if (viewMode === 'SNOW_GLOBE') {
      const radius = 14;
      this.baseMesh = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.2, radius * 1.4, 5, 32), new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.5 }));
      this.baseMesh.position.set(0, -radius - 2, 0);
      this.scene.add(this.baseMesh);

      this.surfaceMesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 40, 40), new THREE.MeshStandardMaterial({ map: this.worldTexture, roughness: 0.8 }));
      this.scene.add(this.surfaceMesh);

      this.glassDomeMesh = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.35, 40, 40), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, roughness: 0.05, transmission: 0.88, ior: 1.4, depthWrite: false }));
      this.glassDomeMesh.renderOrder = 10;
      this.scene.add(this.glassDomeMesh);

      const snowCount = 400;
      const snowGeo = new THREE.BufferGeometry();
      const snowPos = new Float32Array(snowCount * 3);
      for (let i = 0; i < snowCount * 3; i += 3) {
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2 * Math.PI;
        const phi = Math.acos(2 * v - 1);
        const r = Math.cbrt(Math.random()) * (radius * 1.2);
        snowPos[i] = r * Math.sin(phi) * Math.cos(theta);
        snowPos[i + 1] = r * Math.sin(phi) * Math.sin(theta);
        snowPos[i + 2] = r * Math.cos(phi);
      }
      snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
      this.particleSystem = new THREE.Points(snowGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.7, transparent: true, opacity: 0.8, depthWrite: false }));
      this.scene.add(this.particleSystem);
    } else if (viewMode === 'RELIEF_DIORAMA' || viewMode === 'SQUARE_TILE') {
      this.reliefMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(36, 28, Math.max(1, state.config.width - 1), Math.max(1, state.config.height - 1)),
        new THREE.MeshStandardMaterial({ map: this.worldTexture, roughness: 0.8, metalness: 0.05, side: THREE.DoubleSide })
      );
      this.reliefMesh.rotation.x = -Math.PI / 3;
      this.updateReliefGeometry(state);
      this.scene.add(this.reliefMesh);
    }
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
      // Simulation elevation is stored in meter-like values (hundreds/thousands). Convert
      // that range into deliberate scene units instead of multiplying meters directly,
      // which previously produced enormous needle mountains and camera clipping.
      const normalized = tile ? THREE.MathUtils.clamp(tile.elevation / 1800, -0.35, 1.25) : 0;
      posAttr.setZ(i, normalized * 3.4);
    }
    posAttr.needsUpdate = true;
    geometry.computeVertexNormals();
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
    this.rotX = Math.max(-1.35, Math.min(1.35, (0.5 - v) * Math.PI * 0.9));
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
    this.disposeObject(this.glassDomeMesh);
    this.disposeObject(this.reliefMesh);
    this.disposeObject(this.moonMesh);
    this.disposeObject(this.particleSystem);
    this.surfaceMesh = null;
    this.baseMesh = null;
    this.cloudMesh = null;
    this.glassDomeMesh = null;
    this.reliefMesh = null;
    this.moonMesh = null;
    this.particleSystem = null;
  }

  private startLoop() {
    const loop = () => {
      this.animFrameId = requestAnimationFrame(loop);
      this.zoomDistance += (this.targetZoom - this.zoomDistance) * 0.1;
      if (this.camera) {
        this.camera.position.x = this.zoomDistance * Math.sin(this.rotY) * Math.cos(this.rotX);
        this.camera.position.y = this.zoomDistance * Math.sin(this.rotX);
        this.camera.position.z = this.zoomDistance * Math.cos(this.rotY) * Math.cos(this.rotX);
        this.camera.lookAt(0, 0, 0);
      }
      if (this.cloudMesh) this.cloudMesh.rotation.y += 0.0008;
      if (this.moonMesh) this.moonMesh.rotation.y += 0.003;
      if (this.particleSystem) this.particleSystem.rotation.y += 0.002;
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
    this.rotY += deltaX * 0.01;
    this.rotX = Math.max(-1.4, Math.min(1.4, this.rotX + deltaY * 0.01));
  }

  public zoom(delta: number) {
    this.targetZoom = Math.max(22, Math.min(120, this.targetZoom + delta * 0.05));
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
  }
}
