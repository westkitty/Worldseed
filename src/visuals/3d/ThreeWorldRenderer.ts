// Genuine WebGL True 3D World Renderer using Three.js (CC0-1.0)

import * as THREE from 'three';
import { WorldState, WorldViewMode } from '../../types/simulation';

export class ThreeWorldRenderer {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private animFrameId: number | null = null;

  private globeMesh: THREE.Mesh | null = null;
  private miniGlobeMesh: THREE.Mesh | null = null;
  private cloudMesh: THREE.Mesh | null = null;
  private glassDomeMesh: THREE.Mesh | null = null;
  private reliefMesh: THREE.Mesh | null = null;
  private moonMesh: THREE.Mesh | null = null;
  private starfieldPoints: THREE.Points | null = null;
  private particleSystem: THREE.Points | null = null;
  private worldTexture: THREE.CanvasTexture | null = null;
  private selectableSurfaceMesh: THREE.Mesh | null = null;

  public rotX = 0.3;
  public rotY = 0.0;
  public zoomDistance = 50;
  private targetZoom = 50;

  private currentViewMode: WorldViewMode = 'GLOBE';
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
    const starMat = new THREE.PointsMaterial({ color: 0x94a3b8, size: 1.2, transparent: true, opacity: 0.6 });
    this.starfieldPoints = new THREE.Points(starGeo, starMat);
    this.scene.add(this.starfieldPoints);
  }

  private createWorldTexture(state: WorldState): THREE.CanvasTexture {
    const width = state.config.width;
    const height = state.config.height;
    const canvas = document.createElement('canvas');
    canvas.width = width * 8;
    canvas.height = height * 8;
    const ctx = canvas.getContext('2d')!;

    const biomeColors: Record<string, string> = {
      DEEP_OCEAN: '#0284c7', SHALLOW_OCEAN: '#38bdf8', HYDROTHERMAL_RIFT: '#dc2626',
      COASTAL_REEF: '#06b6d4', TUNDRA: '#e2e8f0', TAIGA: '#334155',
      TEMPERATE_FOREST: '#15803d', TEMPERATE_GRASSLAND: '#65a30d', TROPICAL_RAINFOREST: '#14532d',
      SAVANNA: '#ca8a04', HOT_DESERT: '#eab308', COLD_DESERT: '#94a3b8',
      WETLAND: '#047857', ALPINE: '#f8fafc', VOLCANIC_BARREN: '#451a03'
    };

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tile = state.grid[y]?.[x];
        if (!tile) continue;
        ctx.fillStyle = biomeColors[tile.biome] || '#15803d';
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

  public updateScene(state: WorldState, viewMode: WorldViewMode) {
    if (!this.scene) return;
    this.currentViewMode = viewMode;
    this.clearWorldMeshes();

    this.worldTexture?.dispose();
    this.worldTexture = this.createWorldTexture(state);

    if (viewMode === 'GLOBE' || viewMode === 'ORBITAL_VIEW') {
      const radius = 18;
      const sphereGeo = new THREE.SphereGeometry(radius, 48, 48);
      const sphereMat = new THREE.MeshStandardMaterial({ map: this.worldTexture, roughness: 0.7, metalness: 0.1 });
      this.globeMesh = new THREE.Mesh(sphereGeo, sphereMat);
      this.selectableSurfaceMesh = this.globeMesh;
      this.scene.add(this.globeMesh);

      const cloudGeo = new THREE.SphereGeometry(radius * 1.025, 32, 32);
      const cloudMat = new THREE.MeshStandardMaterial({
        color: 0xffffff, transparent: true, opacity: 0.25, roughness: 0.9, depthWrite: false
      });
      this.cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
      this.scene.add(this.cloudMesh);

      if (viewMode === 'ORBITAL_VIEW') {
        const moonGeo = new THREE.SphereGeometry(3.5, 24, 24);
        const moonMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8 });
        this.moonMesh = new THREE.Mesh(moonGeo, moonMat);
        this.moonMesh.position.set(38, 12, -15);
        this.scene.add(this.moonMesh);
      }
    } else if (viewMode === 'SNOW_GLOBE') {
      const radius = 14;

      const baseGeo = new THREE.CylinderGeometry(radius * 1.2, radius * 1.4, 5, 32);
      const baseMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.5 });
      this.globeMesh = new THREE.Mesh(baseGeo, baseMat);
      this.globeMesh.position.set(0, -radius - 2, 0);
      this.scene.add(this.globeMesh);

      const sphereGeo = new THREE.SphereGeometry(radius, 32, 32);
      const sphereMat = new THREE.MeshStandardMaterial({ map: this.worldTexture, roughness: 0.8 });
      this.miniGlobeMesh = new THREE.Mesh(sphereGeo, sphereMat);
      this.selectableSurfaceMesh = this.miniGlobeMesh;
      this.scene.add(this.miniGlobeMesh);

      const glassGeo = new THREE.SphereGeometry(radius * 1.35, 32, 32);
      const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff, transparent: true, opacity: 0.35, roughness: 0.05,
        transmission: 0.9, ior: 1.4, depthWrite: false
      });
      this.glassDomeMesh = new THREE.Mesh(glassGeo, glassMat);
      this.scene.add(this.glassDomeMesh);

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
      const snowMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.7, transparent: true, opacity: 0.8, depthWrite: false });
      this.particleSystem = new THREE.Points(snowGeo, snowMat);
      this.scene.add(this.particleSystem);
    } else if (viewMode === 'RELIEF_DIORAMA' || viewMode === 'SQUARE_TILE') {
      const reliefGeo = new THREE.PlaneGeometry(
        36,
        28,
        Math.max(1, state.config.width - 1),
        Math.max(1, state.config.height - 1)
      );

      const posAttr = reliefGeo.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        const gridX = i % state.config.width;
        const gridY = Math.floor(i / state.config.width);
        const tile = state.grid[gridY]?.[gridX];
        if (tile) posAttr.setZ(i, Math.max(0, tile.elevation) * 4.0);
      }
      posAttr.needsUpdate = true;
      reliefGeo.computeVertexNormals();

      const reliefMat = new THREE.MeshStandardMaterial({
        map: this.worldTexture, roughness: 0.8, metalness: 0.05, side: THREE.DoubleSide
      });
      this.reliefMesh = new THREE.Mesh(reliefGeo, reliefMat);
      this.reliefMesh.rotation.x = -Math.PI / 3;
      this.selectableSurfaceMesh = this.reliefMesh;
      this.scene.add(this.reliefMesh);
    }
  }

  public pickTile(clientX: number, clientY: number, state: WorldState): { x: number; y: number } | null {
    if (!this.camera || !this.selectableSurfaceMesh) return null;

    const rect = this.container.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    this.mouseVec.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseVec.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouseVec, this.camera);

    const hit = this.raycaster.intersectObject(this.selectableSurfaceMesh, false)[0];
    if (!hit?.uv) return null;

    const width = state.config.width;
    const height = state.config.height;
    const u = THREE.MathUtils.clamp(hit.uv.x, 0, 0.999999);
    const v = THREE.MathUtils.clamp(hit.uv.y, 0, 0.999999);
    return {
      x: Math.min(width - 1, Math.max(0, Math.floor(u * width))),
      y: Math.min(height - 1, Math.max(0, Math.floor((1 - v) * height)))
    };
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
    this.disposeObject(this.globeMesh);
    this.disposeObject(this.miniGlobeMesh);
    this.disposeObject(this.cloudMesh);
    this.disposeObject(this.glassDomeMesh);
    this.disposeObject(this.reliefMesh);
    this.disposeObject(this.moonMesh);
    this.disposeObject(this.particleSystem);

    this.globeMesh = null;
    this.miniGlobeMesh = null;
    this.cloudMesh = null;
    this.glassDomeMesh = null;
    this.reliefMesh = null;
    this.moonMesh = null;
    this.particleSystem = null;
    this.selectableSurfaceMesh = null;
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

  public dispose() {
    if (this.animFrameId !== null) cancelAnimationFrame(this.animFrameId);
    this.animFrameId = null;
    this.clearWorldMeshes();

    if (this.starfieldPoints) {
      this.scene?.remove(this.starfieldPoints);
      this.starfieldPoints.geometry.dispose();
      (this.starfieldPoints.material as THREE.Material).dispose();
      this.starfieldPoints = null;
    }

    this.worldTexture?.dispose();
    this.worldTexture = null;

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
      if (this.renderer.domElement.parentNode) this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }

    this.renderer = null;
    this.scene = null;
    this.camera = null;
  }
}
