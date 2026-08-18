// WORLDSEED — targeted renderer performance recovery.
//
// This is intentionally small and reversible. It restores the pre-regression renderer and
// then applies only measured-cost reductions: one moderate-resolution surface texture,
// cheaper globe geometry/material response, lower DPR, and a capped render cadence.
// Simulation state is never mutated here.

import * as THREE from 'three';
import { PlanetSurfaceCompositor, visualNoise } from '../terrain/planetSurface';
import { ThreeWorldRenderer } from './ThreeWorldRenderer';

const proto = ThreeWorldRenderer.prototype as any;
const originalUpdateScene = proto.updateScene;
const originalResize = proto.resize;
const originalBuildGlobe = proto.buildGlobe;
const originalBuildSnowGlobe = proto.buildSnowGlobe;
const originalStartLoop = proto.startLoop;

const markDirty = (renderer: any, milliseconds = 180) => {
  renderer.__perfDirtyUntil = Math.max(renderer.__perfDirtyUntil ?? 0, performance.now() + milliseconds);
};

// Surface refreshes should follow actual visible state, not the passage of an arbitrary five
// simulation years. The buckets below intentionally trade invisible churn for stability.
proto.surfaceSignature = function surfaceSignature(state: any): string {
  let settlementLoad = 0;
  let abandoned = 0;
  for (const s of Object.values(state.settlements) as any[]) {
    settlementLoad += s.population;
    if (s.isAbandoned) abandoned++;
  }
  return [
    state.config.seed,
    state.config.width,
    state.config.height,
    Object.keys(state.settlements).length,
    abandoned,
    Object.keys(state.polities).length,
    Math.round(settlementLoad / 500),
    Math.round(state.stats.globalAvgTemperature * 2),
    Math.round(state.stats.forestCoverPercentage / 2)
  ].join(':');
};

proto.updateScene = function updateScene(state: any, viewMode: any, layer = 'PHYSICAL') {
  // Replace the old 10 px/tile compositor with an 8 px/tile compositor exactly once.
  // Default 64x48 worlds therefore render a 512x384 surface instead of 640x480, while still
  // preserving eight visual samples per authoritative simulation tile.
  if (!this.__perfCompositorInstalled) {
    this.compositor?.dispose?.();
    this.compositor = new PlanetSurfaceCompositor(8);
    this.lastSurfaceRevision = -1;
    this.__perfCompositorInstalled = true;
  }

  const result = originalUpdateScene.call(this, state, viewMode, layer);
  const texture = this.worldTexture as THREE.CanvasTexture | null;
  if (texture && !this.__perfTextureTuned) {
    texture.anisotropy = 1;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    this.__perfTextureTuned = true;
  }
  markDirty(this, 220);
  return result;
};

proto.buildGlobe = function buildGlobe(texture: THREE.Texture, orbital: boolean) {
  originalBuildGlobe.call(this, texture, orbital);

  if (this.surfaceMesh) {
    this.surfaceMesh.geometry.dispose();
    this.surfaceMesh.geometry = new THREE.SphereGeometry(18, 72, 54);
    const material = this.surfaceMesh.material as THREE.MeshStandardMaterial;
    // Colour-as-bump creates false mountains at biome boundaries. Remove it rather than pay
    // GPU cost for relief that is visually wrong.
    material.bumpMap = null;
    material.bumpScale = 0;
    material.roughness = 0.9;
    material.metalness = 0.02;
    material.needsUpdate = true;
  }

  if (this.atmosphereMesh) {
    this.atmosphereMesh.geometry.dispose();
    this.atmosphereMesh.geometry = new THREE.SphereGeometry(18 * 1.055, 48, 32);
  }
  if (this.cloudMesh) {
    this.cloudMesh.geometry.dispose();
    this.cloudMesh.geometry = new THREE.SphereGeometry(18 * 1.018, 48, 32);
  }
};

proto.buildSnowGlobe = function buildSnowGlobe(texture: THREE.Texture, state: any) {
  originalBuildSnowGlobe.call(this, texture, state);
  if (this.surfaceMesh) {
    this.surfaceMesh.geometry.dispose();
    this.surfaceMesh.geometry = new THREE.SphereGeometry(13, 64, 48);
    const material = this.surfaceMesh.material as THREE.MeshStandardMaterial;
    material.bumpMap = null;
    material.bumpScale = 0;
    material.needsUpdate = true;
  }
};

// Cloud generation is startup work, not simulation work. Keep it modest and deterministic.
proto.createCloudTexture = function createCloudTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const image = ctx.createImageData(canvas.width, canvas.height);

  for (let y = 0; y < canvas.height; y++) {
    const latitude = Math.abs(y / canvas.height - 0.5) * 2;
    const band = 0.58 + 0.42 * Math.cos(latitude * Math.PI * 2.2);
    for (let x = 0; x < canvas.width; x++) {
      const nx = x / canvas.width;
      const ny = y / canvas.height;
      const n0 = visualNoise(7717, Math.floor(nx * 96), Math.floor(ny * 48), 1);
      const n1 = visualNoise(7717, Math.floor(nx * 41), Math.floor(ny * 23), 2);
      const density = Math.max(0, Math.min(1, ((n0 * 0.62 + n1 * 0.38) * band - 0.46) * 3.4));
      const i = (y * canvas.width + x) * 4;
      image.data[i] = 248;
      image.data[i + 1] = 251;
      image.data[i + 2] = 255;
      image.data[i + 3] = Math.round(density * 190);
    }
  }

  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
};

proto.resize = function resize(width: number, height: number) {
  originalResize.call(this, width, height);
  if (this.renderer) {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
    this.renderer.setSize(width, height, false);
  }
  markDirty(this, 150);
};

// Keep animation semantics but cap expensive scene rendering to ~30 fps. The rAF callback
// itself remains lightweight, which preserves disposal semantics and avoids timer leaks.
proto.startLoop = function startLoop() {
  let last = typeof performance !== 'undefined' ? performance.now() : 0;
  let lastRendered = -Infinity;

  const loop = () => {
    this.animFrameId = requestAnimationFrame(loop);
    const now = typeof performance !== 'undefined' ? performance.now() : last + 16;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    this.clock += dt;

    this.zoomDistance += (this.targetZoom - this.zoomDistance) * Math.min(1, dt * 9);
    if (this.camera) {
      this.camera.position.x = this.zoomDistance * Math.sin(this.rotY) * Math.cos(this.rotX);
      this.camera.position.y = this.zoomDistance * Math.sin(this.rotX);
      this.camera.position.z = this.zoomDistance * Math.cos(this.rotY) * Math.cos(this.rotX);
      this.camera.lookAt(0, 0, 0);
    }

    const movingCamera = Math.abs(this.targetZoom - this.zoomDistance) > 0.002;
    const animated = !this.reducedMotion && Boolean(this.cloudMesh || this.moonMesh || this.particleSystem);
    const dirty = now < (this.__perfDirtyUntil ?? 0);
    const due = now - lastRendered >= 33;

    if (due && (animated || movingCamera || dirty)) {
      if (!this.reducedMotion) {
        if (this.cloudMesh) this.cloudMesh.rotation.y += dt * 0.012;
        if (this.moonMesh) {
          const a = this.clock * 0.06;
          this.moonMesh.position.set(Math.cos(a) * 52, 9 + Math.sin(a * 0.7) * 5, Math.sin(a) * 52);
          this.moonMesh.rotation.y += dt * 0.05;
        }
        this.updateSnow(dt);
      }
      if (this.renderer && this.scene && this.camera) this.renderer.render(this.scene, this.camera);
      lastRendered = now;
    }
  };

  this.animFrameId = requestAnimationFrame(loop);
};

for (const method of ['rotate', 'zoom', 'focusTile', 'setSelection'] as const) {
  const original = proto[method];
  proto[method] = function (...args: any[]) {
    const value = original.apply(this, args);
    markDirty(this, 220);
    return value;
  };
}

// Retain a reference so bundlers cannot incorrectly consider the original implementation
// unused while this installation module patches it.
void originalStartLoop;
