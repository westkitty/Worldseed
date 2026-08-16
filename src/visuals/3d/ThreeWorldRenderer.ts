// Genuine WebGL True 3D World Renderer using Three.js (CC0-1.0)

import * as THREE from 'three';
import { WorldState, WorldViewMode } from '../../types/simulation';

export class ThreeWorldRenderer {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private animFrameId: number | null = null;

  // Active 3D Objects
  private globeMesh: THREE.Mesh | null = null;
  private cloudMesh: THREE.Mesh | null = null;
  private glassDomeMesh: THREE.Mesh | null = null;
  private reliefMesh: THREE.Mesh | null = null;
  private moonMesh: THREE.Mesh | null = null;
  private starfieldPoints: THREE.Points | null = null;
  private particleSystem: THREE.Points | null = null;
  private worldTexture: THREE.CanvasTexture | null = null;

  // Camera & Orbit State
  public rotX: number = 0.3;
  public rotY: number = 0.0;
  public zoomDistance: number = 50;
  private targetZoom: number = 50;

  // State
  private currentViewMode: WorldViewMode = 'GLOBE';
  private onTileClickCallback?: (x: number, y: number) => void;
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouseVec: THREE.Vector2 = new THREE.Vector2();

  constructor(container: HTMLElement, onTileClick?: (x: number, y: number) => void) {
    this.container = container;
    this.onTileClickCallback = onTileClick;
    this.init();
  }

  private init() {
    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 600;

    // 1. WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(0, 0, this.zoomDistance);

    // 3. Scene & Lighting
    this.scene = new THREE.Scene();
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfffaed, 1.2);
    dirLight.position.set(60, 40, 50);
    this.scene.add(dirLight);

    // Background Starfield for 3D Space
    this.createStarfield();

    // Start render loop
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
    const starMat = new THREE.PointsMaterial({
      color: 0x94a3b8,
      size: 1.2,
      transparent: true,
      opacity: 0.6
    });
    this.starfieldPoints = new THREE.Points(starGeo, starMat);
    this.scene.add(this.starfieldPoints);
  }

  // Generate dynamic canvas texture from WorldGrid
  private createWorldTexture(state: WorldState): THREE.CanvasTexture {
    const width = state.config.width;
    const height = state.config.height;
    const canvas = document.createElement('canvas');
    canvas.width = width * 8;
    canvas.height = height * 8;
    const ctx = canvas.getContext('2d')!;

    const biomeColors: Record<string, string> = {
      DEEP_OCEAN: '#0284c7',
      SHALLOW_OCEAN: '#38bdf8',
      HYDROTHERMAL_RIFT: '#dc2626',
      COASTAL_REEF: '#06b6d4',
      TUNDRA: '#e2e8f0',
      TAIGA: '#334155',
      TEMPERATE_FOREST: '#15803d',
      TEMPERATE_GRASSLAND: '#65a30d',
      TROPICAL_RAINFOREST: '#14532d',
      SAVANNA: '#ca8a04',
      HOT_DESERT: '#eab308',
      COLD_DESERT: '#94a3b8',
      WETLAND: '#047857',
      ALPINE: '#f8fafc',
      VOLCANIC_BARREN: '#451a03'
    };

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tile = state.grid[y]?.[x];
        if (tile) {
          ctx.fillStyle = biomeColors[tile.biome] || '#15803d';
          ctx.fillRect(x * 8, y * 8, 8, 8);
        }
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;
    return texture;
  }

  // Build / Update 3D Scene based on View Mode and World State
  public updateScene(state: WorldState, viewMode: WorldViewMode) {
    if (!this.scene) return;
    this.currentViewMode = viewMode;

    // Dispose prior objects
    this.clearWorldMeshes();

    // Create World Texture
    if (this.worldTexture) this.worldTexture.dispose();
    this.worldTexture = this.createWorldTexture(state);

    if (viewMode === 'GLOBE' || viewMode === 'ORBITAL_VIEW') {
      // 1. Globe Mesh (SphereGeometry)
      const radius = 18;
      const sphereGeo = new THREE.SphereGeometry(radius, 48, 48);
      const sphereMat = new THREE.MeshStandardMaterial({
        map: this.worldTexture,
        roughness: 0.7,
        metalness: 0.1
      });
      this.globeMesh = new THREE.Mesh(sphereGeo, sphereMat);
      this.scene.add(this.globeMesh);

      // Cloud Sphere
      const cloudGeo = new THREE.SphereGeometry(radius * 1.025, 32, 32);
      const cloudMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.25,
        roughness: 0.9
      });
      this.cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
      this.scene.add(this.cloudMesh);

      if (viewMode === 'ORBITAL_VIEW') {
        // Orbiting 3D Moon
        const moonGeo = new THREE.SphereGeometry(3.5, 24, 24);
        const moonMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8 });
        this.moonMesh = new THREE.Mesh(moonGeo, moonMat);
        this.moonMesh.position.set(38, 12, -15);
        this.scene.add(this.moonMesh);
      }
    } else if (viewMode === 'SNOW_GLOBE') {
      // 2. Snow Globe (Pedestal + Mini Globe + Glass Dome + 3D Snow Particles)
      const radius = 14;

      // Wooden Pedestal
      const baseGeo = new THREE.CylinderGeometry(radius * 1.2, radius * 1.4, 5, 32);
      const baseMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.5 });
      const baseMesh = new THREE.Mesh(baseGeo, baseMat);
      baseMesh.position.set(0, -radius - 2, 0);
      this.scene.add(baseMesh);
      this.globeMesh = baseMesh; // register for cleanup

      // Miniature Terrain Globe
      const sphereGeo = new THREE.SphereGeometry(radius, 32, 32);
      const sphereMat = new THREE.MeshStandardMaterial({ map: this.worldTexture, roughness: 0.8 });
      const miniGlobe = new THREE.Mesh(sphereGeo, sphereMat);
      this.scene.add(miniGlobe);

      // Glass Outer Shell
      const glassGeo = new THREE.SphereGeometry(radius * 1.35, 32, 32);
      const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.35,
        roughness: 0.05,
        transmission: 0.9,
        ior: 1.4
      });
      this.glassDomeMesh = new THREE.Mesh(glassGeo, glassMat);
      this.scene.add(this.glassDomeMesh);

      // Volumetric 3D Snow Particle Swirl
      const snowCount = 400;
      const snowGeo = new THREE.BufferGeometry();
      const snowPos = new Float32Array(snowCount * 3);
      for (let i = 0; i < snowCount * 3; i += 3) {
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);
        const r = Math.cbrt(Math.random()) * (radius * 1.2);
        snowPos[i] = r * Math.sin(phi) * Math.cos(theta);
        snowPos[i + 1] = r * Math.sin(phi) * Math.sin(theta);
        snowPos[i + 2] = r * Math.cos(phi);
      }
      snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
      const snowMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.7, transparent: true, opacity: 0.8 });
      this.particleSystem = new THREE.Points(snowGeo, snowMat);
      this.scene.add(this.particleSystem);
    } else if (viewMode === 'RELIEF_DIORAMA' || viewMode === 'SQUARE_TILE') {
      // 3. Relief Diorama Tabletop (3D Plane with Vertex Elevation Displacement)
      const w = 36;
      const h = 28;
      const reliefGeo = new THREE.PlaneGeometry(w, h, state.config.width, state.config.height);

      // Displace vertices based on tile elevation
      const posAttr = reliefGeo.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        const gridX = i % (state.config.width + 1);
        const gridY = Math.floor(i / (state.config.width + 1));
        const tile = state.grid[gridY]?.[gridX];
        if (tile) {
          const elev = Math.max(0, tile.elevation) * 4.0;
          posAttr.setZ(i, elev);
        }
      }
      reliefGeo.computeVertexNormals();

      const reliefMat = new THREE.MeshStandardMaterial({
        map: this.worldTexture,
        roughness: 0.8,
        metalness: 0.05
      });
      this.reliefMesh = new THREE.Mesh(reliefGeo, reliefMat);
      this.reliefMesh.rotation.x = -Math.PI / 3;
      this.scene.add(this.reliefMesh);
    }
  }

  private clearWorldMeshes() {
    if (!this.scene) return;
    const meshes = [this.globeMesh, this.cloudMesh, this.glassDomeMesh, this.reliefMesh, this.moonMesh, this.particleSystem];
    for (const m of meshes) {
      if (m) {
        this.scene.remove(m);
        if ((m as any).geometry) (m as any).geometry.dispose();
        if ((m as any).material) {
          if (Array.isArray((m as any).material)) {
            (m as any).material.forEach((mat: THREE.Material) => mat.dispose());
          } else {
            ((m as any).material as THREE.Material).dispose();
          }
        }
      }
    }
    this.globeMesh = null;
    this.cloudMesh = null;
    this.glassDomeMesh = null;
    this.reliefMesh = null;
    this.moonMesh = null;
    this.particleSystem = null;
  }

  // Animation Frame Loop
  private startLoop() {
    const loop = () => {
      this.animFrameId = requestAnimationFrame(loop);

      // Lerp zoom
      this.zoomDistance += (this.targetZoom - this.zoomDistance) * 0.1;
      if (this.camera) {
        this.camera.position.x = this.zoomDistance * Math.sin(this.rotY) * Math.cos(this.rotX);
        this.camera.position.y = this.zoomDistance * Math.sin(this.rotX);
        this.camera.position.z = this.zoomDistance * Math.cos(this.rotY) * Math.cos(this.rotX);
        this.camera.lookAt(0, 0, 0);
      }

      // Rotate clouds / moon
      if (this.cloudMesh) this.cloudMesh.rotation.y += 0.0008;
      if (this.moonMesh) this.moonMesh.rotation.y += 0.003;
      if (this.particleSystem) this.particleSystem.rotation.y += 0.002;

      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  // Handle Resize
  public resize(width: number, height: number) {
    if (!this.renderer || !this.camera) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  // Orbit controls
  public rotate(deltaX: number, deltaY: number) {
    this.rotY += deltaX * 0.01;
    this.rotX = Math.max(-1.4, Math.min(1.4, this.rotX + deltaY * 0.01));
  }

  public zoom(delta: number) {
    this.targetZoom = Math.max(22, Math.min(120, this.targetZoom + delta * 0.05));
  }

  // Full Resource Cleanup
  public dispose() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    this.clearWorldMeshes();
    if (this.starfieldPoints) {
      this.scene?.remove(this.starfieldPoints);
      this.starfieldPoints.geometry.dispose();
      (this.starfieldPoints.material as THREE.Material).dispose();
    }
    if (this.worldTexture) this.worldTexture.dispose();
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
    this.renderer = null;
    this.scene = null;
    this.camera = null;
  }
}
