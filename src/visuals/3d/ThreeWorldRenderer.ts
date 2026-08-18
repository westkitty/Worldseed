// WORLDSEED — WebGL hero-view renderer (Three.js)
//
// Composition rules:
//  * The planet is the subject. Every mode frames it large, lit from one consistent sun,
//    against restrained space.
//  * Expensive GPU resources are created once per view build. A simulation tick only
//    repaints the shared surface canvas and flags the existing texture for re-upload.
//  * Visual variation is deterministic (derived from the world seed) so a reloaded or
//    restored world looks identical.

import * as THREE from 'three';
import { WorldState, WorldViewMode } from '../../types/simulation';
import { PlanetSurfaceCompositor, SurfaceLayer, visualNoise } from '../terrain/planetSurface';

const GLOBE_RADIUS = 18;
const SNOW_RADIUS = 13;

/** The full set of generated planetary textures for one composited world state. */
interface PlanetMaps {
  albedo: THREE.Texture;
  normal: THREE.Texture;
  roughness: THREE.Texture;
  metalness: THREE.Texture;
  clearcoat: THREE.Texture;
  cloud: THREE.Texture;
}

export class ThreeWorldRenderer {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private animFrameId: number | null = null;

  private worldGroup: THREE.Group | null = null;
  private surfaceMesh: THREE.Mesh | null = null;
  private reliefMesh: THREE.Mesh | null = null;
  private oceanPlane: THREE.Mesh | null = null;
  private atmosphereMesh: THREE.Mesh | null = null;
  private cloudMesh: THREE.Mesh | null = null;
  private glassDomeMesh: THREE.Mesh | null = null;
  private baseMesh: THREE.Mesh | null = null;
  private moonMesh: THREE.Mesh | null = null;
  private starfieldPoints: THREE.Points | null = null;
  private particleSystem: THREE.Points | null = null;
  private snowVelocity: Float32Array | null = null;

  private sunLight: THREE.DirectionalLight | null = null;
  private rimLight: THREE.DirectionalLight | null = null;

  private compositor = new PlanetSurfaceCompositor(14);
  private worldTexture: THREE.CanvasTexture | null = null;
  private normalTexture: THREE.CanvasTexture | null = null;
  private roughnessTexture: THREE.CanvasTexture | null = null;
  private metalnessTexture: THREE.CanvasTexture | null = null;
  private clearcoatTexture: THREE.CanvasTexture | null = null;
  private cloudTexture: THREE.CanvasTexture | null = null;
  private lastSurfaceRevision = -1;

  public rotX = 0.28;
  public rotY = 0.6;
  public zoomDistance = 46;
  private targetZoom = 46;
  // Composed hero framing keeps the planet clear of the bottom time deck by settling the
  // subject slightly above true centre instead of dead-centring it in the viewport.
  private verticalBias = 0;

  private currentViewMode: WorldViewMode | null = null;
  private currentDimensions = '';
  private raycaster = new THREE.Raycaster();
  private mouseVec = new THREE.Vector2();
  private clock = 0;
  private reducedMotion = false;
  private selectionMarker: THREE.Mesh | null = null;
  private hasFramedWorld = false;

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

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.98;
    this.renderer.domElement.dataset.worldseedRenderer = 'three';
    this.renderer.domElement.style.display = 'block';
    this.container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(38, width / height, 0.5, 4000);
    this.camera.position.set(0, 0, this.zoomDistance);

    this.scene = new THREE.Scene();
    this.worldGroup = new THREE.Group();
    this.scene.add(this.worldGroup);

    // A single sun plus a cool bounce keeps every mode lit the same way, which is what
    // makes the six presentation modes feel like one planet.
    // The sun sits above and slightly behind the default camera position, so the hero face
    // of the planet is lit and the terminator falls near the limb rather than across the
    // middle of the subject. A hemisphere fill (cool "sky" from above, dark "ground" from
    // below) reads as soft bounced light instead of the flat, shadow-crushing ambient wash a
    // single AmbientLight produces, so the night limb keeps a trace of form.
    this.scene.add(new THREE.HemisphereLight(0x33455f, 0x0a0d14, 1.35));
    this.sunLight = new THREE.DirectionalLight(0xfff4e2, 2.1);
    this.sunLight.position.set(-16, 44, 58);
    this.scene.add(this.sunLight);
    this.rimLight = new THREE.DirectionalLight(0x74a9ff, 0.32);
    this.rimLight.position.set(48, -34, -30);
    this.scene.add(this.rimLight);

    this.createStarfield();
    this.startLoop();
  }

  /**
   * A deterministic starfield with a genuine brightness distribution — many faint stars, a
   * few bright ones — restrained colour-temperature variation, and soft circular sprites
   * instead of uniform square dots. A custom shader is used because PointsMaterial cannot
   * vary per-star size, colour and softness together.
   */
  private createStarfield() {
    if (!this.scene) return;
    const count = 2200;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    const alphas = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const u = visualNoise(9176, i, 1, 3);
      const v = visualNoise(9176, i, 2, 5);
      const theta = u * Math.PI * 2;
      const phi = Math.acos(2 * v - 1);
      const r = 900;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      // A cubed distribution skews heavily toward dim stars, with only the rare few near 1 —
      // real sky brightness, not a flat random spread.
      const brightness = Math.pow(visualNoise(9176, i, 3, 7), 3.4);
      sizes[i] = 0.7 + brightness * 2.6;
      alphas[i] = 0.28 + brightness * 0.72;

      // Extremely restrained colour-temperature variation: mostly neutral white, occasionally
      // drifting warm or cool, never saturated.
      const temper = visualNoise(9176, i, 4, 11);
      if (temper < 0.15) {
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.92;
        colors[i * 3 + 2] = 0.8;
      } else if (temper > 0.88) {
        colors[i * 3] = 0.82;
        colors[i * 3 + 1] = 0.9;
        colors[i * 3 + 2] = 1.0;
      } else {
        colors[i * 3] = 0.94;
        colors[i * 3 + 1] = 0.96;
        colors[i * 3 + 2] = 1.0;
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));

    this.starfieldPoints = new THREE.Points(
      geo,
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: `
          attribute float aSize;
          attribute vec3 aColor;
          attribute float aAlpha;
          varying vec3 vColor;
          varying float vAlpha;
          void main() {
            vColor = aColor;
            vAlpha = aAlpha;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = aSize;
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          varying vec3 vColor;
          varying float vAlpha;
          void main() {
            vec2 c = gl_PointCoord - vec2(0.5);
            float falloff = smoothstep(0.5, 0.0, length(c));
            gl_FragColor = vec4(vColor, falloff * vAlpha);
          }
        `
      })
    );
    this.scene.add(this.starfieldPoints);
  }

  /** Signature of everything the surface image depends on. Cheap to compute per tick. */
  private surfaceSignature(state: WorldState): string {
    let settlementLoad = 0;
    for (const s of Object.values(state.settlements)) settlementLoad += s.population + (s.isAbandoned ? 1e6 : 0);
    return [
      state.config.seed,
      Math.floor(state.currentYear / 5),
      Object.keys(state.settlements).length,
      Object.keys(state.polities).length,
      Math.round(settlementLoad / 50),
      Math.round(state.stats.globalAvgTemperature * 4),
      Math.round(state.stats.forestCoverPercentage)
    ].join(':');
  }

  /** Builds (once) or re-tags (on revision change) a CanvasTexture for one compositor layer. */
  private syncTexture(
    slot: 'worldTexture' | 'normalTexture' | 'roughnessTexture' | 'metalnessTexture' | 'clearcoatTexture' | 'cloudTexture',
    canvas: HTMLCanvasElement,
    isColor: boolean,
    revisionChanged: boolean
  ): THREE.CanvasTexture {
    let tex = this[slot];
    if (!tex || tex.image !== canvas) {
      tex?.dispose();
      tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      if (isColor) tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = this.renderer?.capabilities.getMaxAnisotropy() ?? 1;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.needsUpdate = true;
      this[slot] = tex;
    } else if (revisionChanged) {
      tex.needsUpdate = true;
    }
    return tex;
  }

  private refreshSurface(state: WorldState, layer: SurfaceLayer) {
    const result = this.compositor.compose(state, layer, this.surfaceSignature(state));
    const revisionChanged = result.revision !== this.lastSurfaceRevision;
    if (revisionChanged) this.lastSurfaceRevision = result.revision;

    const albedo = this.syncTexture('worldTexture', result.canvas, true, revisionChanged);
    const normal = this.syncTexture('normalTexture', result.normalCanvas, false, revisionChanged);
    const roughness = this.syncTexture('roughnessTexture', result.roughnessCanvas, false, revisionChanged);
    const metalness = this.syncTexture('metalnessTexture', result.metalnessCanvas, false, revisionChanged);
    const clearcoat = this.syncTexture('clearcoatTexture', result.clearcoatCanvas, false, revisionChanged);
    const cloud = this.syncTexture('cloudTexture', result.cloudCanvas, false, revisionChanged);

    return { albedo, normal, roughness, metalness, clearcoat, cloud };
  }

  /**
   * One coherent material for every solid presentation of the planet (globe, snow globe,
   * relief). Roughness/metalness/clearcoat are supplied entirely by the generated maps, so
   * the scalar factors stay at 1 and never re-scale what the compositor already decided.
   */
  private createPlanetMaterial(maps: {
    albedo: THREE.Texture;
    normal: THREE.Texture;
    roughness: THREE.Texture;
    metalness: THREE.Texture;
    clearcoat: THREE.Texture;
  }): THREE.MeshPhysicalMaterial {
    return new THREE.MeshPhysicalMaterial({
      map: maps.albedo,
      normalMap: maps.normal,
      normalScale: new THREE.Vector2(1, 1),
      roughness: 1,
      roughnessMap: maps.roughness,
      metalness: 1,
      metalnessMap: maps.metalness,
      clearcoat: 1,
      clearcoatMap: maps.clearcoat,
      clearcoatRoughness: 0.06
    });
  }

  public updateScene(state: WorldState, viewMode: WorldViewMode, layer: SurfaceLayer = 'PHYSICAL') {
    if (!this.scene || !this.worldGroup) return;

    const dimensions = `${state.config.width}x${state.config.height}`;
    const maps = this.refreshSurface(state, layer);
    const needsRebuild = this.currentViewMode !== viewMode || this.currentDimensions !== dimensions;

    if (!needsRebuild) {
      // Live update path: no geometry, material or texture object is recreated.
      if (this.reliefMesh) this.updateReliefGeometry(state);
      return;
    }

    this.clearWorldMeshes();
    this.currentViewMode = viewMode;
    this.currentDimensions = dimensions;

    if (viewMode === 'GLOBE' || viewMode === 'ORBITAL_VIEW') {
      this.buildGlobe(maps, viewMode === 'ORBITAL_VIEW');
    } else if (viewMode === 'SNOW_GLOBE') {
      this.buildSnowGlobe(maps, state);
    } else {
      this.buildRelief(maps, state);
    }

    this.frameView(viewMode);
    if (!this.hasFramedWorld) {
      this.hasFramedWorld = true;
      this.frameMostInterestingRegion(state);
    }
  }

  private buildGlobe(maps: PlanetMaps, orbital: boolean) {
    if (!this.worldGroup) return;

    this.surfaceMesh = new THREE.Mesh(new THREE.SphereGeometry(GLOBE_RADIUS, 128, 96), this.createPlanetMaterial(maps));
    this.worldGroup.add(this.surfaceMesh);

    // Atmosphere: a back-face shell with a soft, restrained Fresnel falloff reads as thin air
    // seen edge-on rather than a glowing outline.
    this.atmosphereMesh = new THREE.Mesh(
      new THREE.SphereGeometry(GLOBE_RADIUS * 1.055, 64, 48),
      new THREE.ShaderMaterial({
        transparent: true,
        side: THREE.BackSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uColor: { value: new THREE.Color(0x9fc4e8) },
          uIntensity: { value: orbital ? 0.7 : 0.58 }
        },
        vertexShader: `
          varying vec3 vNormalView;
          varying vec3 vViewDir;
          void main() {
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            vNormalView = normalize(normalMatrix * normal);
            vViewDir = normalize(-mvPosition.xyz);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          uniform vec3 uColor;
          uniform float uIntensity;
          varying vec3 vNormalView;
          varying vec3 vViewDir;
          void main() {
            float rim = 1.0 - abs(dot(normalize(vNormalView), normalize(vViewDir)));
            float falloff = pow(clamp(rim, 0.0, 1.0), 4.4);
            gl_FragColor = vec4(uColor * falloff * uIntensity, falloff * 0.62);
          }
        `
      })
    );
    this.worldGroup.add(this.atmosphereMesh);

    // Broken, climate-derived cloud deck. Deterministic, and restrained enough that terrain
    // stays readable beneath it.
    this.cloudMesh = new THREE.Mesh(
      new THREE.SphereGeometry(GLOBE_RADIUS * 1.018, 64, 48),
      new THREE.MeshStandardMaterial({
        map: maps.cloud,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
        roughness: 1
      })
    );
    this.worldGroup.add(this.cloudMesh);

    if (orbital) {
      this.moonMesh = new THREE.Mesh(
        new THREE.SphereGeometry(3.6, 48, 32),
        new THREE.MeshStandardMaterial({ map: this.createMoonTexture(), roughness: 0.95, metalness: 0 })
      );
      this.moonMesh.position.set(46, 9, -18);
      this.worldGroup.add(this.moonMesh);
    }
  }

  private buildSnowGlobe(maps: PlanetMaps, state: WorldState) {
    if (!this.worldGroup) return;

    this.surfaceMesh = new THREE.Mesh(new THREE.SphereGeometry(SNOW_RADIUS, 96, 72), this.createPlanetMaterial(maps));
    this.surfaceMesh.position.y = 1.5;
    this.worldGroup.add(this.surfaceMesh);

    // Turned wooden plinth with a brass collar — the object should feel like it sits
    // on a shelf, so the base has real silhouette rather than a flat disc.
    const plinth = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: 0x4a2c17, roughness: 0.62, metalness: 0.06 });
    const brass = new THREE.MeshStandardMaterial({ color: 0xc79a4b, roughness: 0.3, metalness: 0.85 });

    const foot = new THREE.Mesh(new THREE.CylinderGeometry(SNOW_RADIUS * 1.02, SNOW_RADIUS * 1.24, 3.1, 64), wood);
    foot.position.y = -SNOW_RADIUS - 3.4;
    plinth.add(foot);

    const collar = new THREE.Mesh(new THREE.TorusGeometry(SNOW_RADIUS * 0.99, 0.62, 20, 64), brass);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = -SNOW_RADIUS - 1.6;
    plinth.add(collar);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(SNOW_RADIUS * 0.86, SNOW_RADIUS * 1.0, 1.6, 64), wood);
    neck.position.y = -SNOW_RADIUS - 1.0;
    plinth.add(neck);

    this.baseMesh = plinth as unknown as THREE.Mesh;
    this.worldGroup.add(plinth);

    // Glass: physical transmission with a touch of thickness so the rim refracts.
    this.glassDomeMesh = new THREE.Mesh(
      new THREE.SphereGeometry(SNOW_RADIUS * 1.42, 96, 72),
      new THREE.MeshPhysicalMaterial({
        color: 0xeaf4ff,
        transparent: true,
        opacity: 0.24,
        roughness: 0.03,
        transmission: 0.94,
        thickness: 2.2,
        ior: 1.48,
        clearcoat: 1,
        clearcoatRoughness: 0.02,
        metalness: 0,
        depthWrite: false,
        side: THREE.FrontSide
      })
    );
    this.glassDomeMesh.position.y = 1.5;
    this.glassDomeMesh.renderOrder = 10;
    this.worldGroup.add(this.glassDomeMesh);

    // Bounded snow, contained inside the dome and falling under its own gentle gravity.
    const snowCount = 520;
    const snowPos = new Float32Array(snowCount * 3);
    this.snowVelocity = new Float32Array(snowCount);
    const seed = state.config.seed | 0;
    for (let i = 0; i < snowCount; i++) {
      const u = visualNoise(seed, i, 11, 13);
      const v = visualNoise(seed, i, 17, 19);
      const w = visualNoise(seed, i, 23, 29);
      const theta = u * Math.PI * 2;
      const phi = Math.acos(2 * v - 1);
      const r = Math.cbrt(w) * SNOW_RADIUS * 1.34;
      snowPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      snowPos[i * 3 + 1] = r * Math.cos(phi) + 1.5;
      snowPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      this.snowVelocity[i] = 0.012 + visualNoise(seed, i, 31, 37) * 0.03;
    }
    const snowGeo = new THREE.BufferGeometry();
    snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
    this.particleSystem = new THREE.Points(
      snowGeo,
      new THREE.PointsMaterial({ color: 0xffffff, size: 0.24, transparent: true, opacity: 0.85, depthWrite: false })
    );
    this.worldGroup.add(this.particleSystem);
  }

  private buildRelief(maps: PlanetMaps, state: WorldState) {
    if (!this.worldGroup) return;
    const cols = state.config.width;
    const rows = state.config.height;
    const spanX = 42;
    const spanZ = spanX * (rows / cols);

    this.reliefMesh = new THREE.Mesh(new THREE.PlaneGeometry(spanX, spanZ, cols - 1, rows - 1), this.createPlanetMaterial(maps));
    this.reliefMesh.rotation.x = -Math.PI / 2;
    this.updateReliefGeometry(state);
    this.worldGroup.add(this.reliefMesh);

    // A translucent sea plane at exactly the simulation's sea level makes elevation legible,
    // using the same restrained clearcoat Fresnel language as the globe's ocean.
    this.oceanPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(spanX, spanZ),
      new THREE.MeshPhysicalMaterial({
        color: 0x1b4f7a,
        transparent: true,
        opacity: 0.72,
        roughness: 0.1,
        metalness: 0.14,
        clearcoat: 0.55,
        clearcoatRoughness: 0.06,
        transmission: 0.35,
        thickness: 1.4
      })
    );
    this.oceanPlane.rotation.x = -Math.PI / 2;
    this.oceanPlane.position.y = 0.02;
    this.worldGroup.add(this.oceanPlane);

    // Carved slab sides so the diorama reads as a physical object on a table.
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(spanX * 1.02, 2.6, spanZ * 1.02),
      new THREE.MeshStandardMaterial({ color: 0x2a2f3a, roughness: 0.85, metalness: 0.08 })
    );
    slab.position.y = -1.5;
    this.baseMesh = slab;
    this.worldGroup.add(slab);
  }

  /**
   * Displaces the relief plane from tile elevation.
   * Simulation elevation is a normalised -1..1 field with sea level near 0.42, so it is
   * mapped directly into scene units instead of being treated as metres.
   */
  private updateReliefGeometry(state: WorldState) {
    if (!this.reliefMesh) return;
    const geometry = this.reliefMesh.geometry as THREE.PlaneGeometry;
    const posAttr = geometry.attributes.position as THREE.BufferAttribute;
    const cols = state.config.width;
    const rows = state.config.height;
    const seaLevel = state.config.seaLevel;
    // Vertical exaggeration is deliberate but restrained: enough that valleys, ranges and
    // coastal shelves read as terrain, not so much that the diorama becomes a bed of needles.
    const landScale = 5.5;
    const seaScale = 2.4;

    for (let i = 0; i < posAttr.count; i++) {
      const gridX = Math.min(cols - 1, i % cols);
      const gridY = Math.min(rows - 1, Math.floor(i / cols));
      const tile = state.grid[gridY]?.[gridX];
      if (!tile) {
        posAttr.setZ(i, 0);
        continue;
      }
      const rel = tile.elevation - seaLevel;
      posAttr.setZ(i, rel >= 0 ? rel * landScale : rel * seaScale);
    }
    posAttr.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
  }

  private createMoonTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#8b8f98';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < 90; i++) {
      const x = visualNoise(4231, i, 1, 2) * canvas.width;
      const y = visualNoise(4231, i, 2, 3) * canvas.height;
      const r = 1.5 + visualNoise(4231, i, 3, 4) * 9;
      ctx.fillStyle = `rgba(${90 + visualNoise(4231, i, 4, 5) * 40}, ${94 + visualNoise(4231, i, 5, 6) * 40}, ${102 + visualNoise(4231, i, 6, 7) * 40}, 0.7)`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /**
   * Camera distance that fits a sphere of `radius` inside the smaller viewport axis with
   * `margin` headroom (1.0 = exactly touching the edges).
   */
  private distanceToFit(radius: number, margin: number): number {
    const camera = this.camera;
    if (!camera) return radius * 3;
    const vFov = (camera.fov * Math.PI) / 180;
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
    const limiting = Math.min(vFov, hFov);
    return (radius * margin) / Math.tan(limiting / 2);
  }

  /** Per-mode camera framing so each hero view is composed rather than merely displayed. */
  private frameView(viewMode: WorldViewMode) {
    switch (viewMode) {
      // Framing is derived from the subject's radius and the camera's field of view so the
      // planet is large but never cropped by the viewport. Globe and Orbital additionally
      // settle a little above dead centre so the permanent time deck at the bottom of the
      // screen never reads as colliding with the subject.
      case 'GLOBE':
        this.targetZoom = this.distanceToFit(GLOBE_RADIUS, 1.32);
        this.rotX = 0.26;
        this.verticalBias = GLOBE_RADIUS * 0.11;
        break;
      case 'ORBITAL_VIEW':
        this.targetZoom = this.distanceToFit(GLOBE_RADIUS, 2.6);
        this.rotX = 0.14;
        this.verticalBias = GLOBE_RADIUS * 0.11;
        break;
      case 'SNOW_GLOBE':
        this.targetZoom = this.distanceToFit(SNOW_RADIUS * 1.42, 1.5);
        this.rotX = 0.16;
        this.verticalBias = 0;
        break;
      default:
        this.targetZoom = this.distanceToFit(23, 1.08);
        this.rotX = 0.62;
        this.verticalBias = 0;
        break;
    }
    this.zoomDistance = this.targetZoom;
    if (this.worldGroup) this.worldGroup.position.y = this.verticalBias;
  }

  public setSelection(state: WorldState, tile: { x: number; y: number } | null) {
    if (!this.worldGroup) return;
    if (!tile) {
      if (this.selectionMarker) {
        this.disposeObject(this.selectionMarker, this.worldGroup);
        this.selectionMarker = null;
      }
      return;
    }

    if (!this.selectionMarker) {
      this.selectionMarker = new THREE.Mesh(
        new THREE.RingGeometry(0.62, 0.92, 40),
        new THREE.MeshBasicMaterial({ color: 0x6fd0ff, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthTest: false })
      );
      this.selectionMarker.renderOrder = 20;
      this.worldGroup.add(this.selectionMarker);
    }

    const { width, height } = state.config;
    const u = (tile.x + 0.5) / width;
    const v = (tile.y + 0.5) / height;

    if (this.reliefMesh) {
      const geo = this.reliefMesh.geometry as THREE.PlaneGeometry;
      const params = geo.parameters;
      const px = (u - 0.5) * params.width;
      const pz = (v - 0.5) * params.height;
      const t = state.grid[tile.y]?.[tile.x];
      const rel = t ? t.elevation - state.config.seaLevel : 0;
      this.selectionMarker.position.set(px, (rel >= 0 ? rel * 5.5 : rel * 2.4) + 0.3, pz);
      this.selectionMarker.rotation.set(-Math.PI / 2, 0, 0);
      this.selectionMarker.scale.setScalar(1);
    } else if (this.surfaceMesh) {
      const radius = (this.surfaceMesh.geometry as THREE.SphereGeometry).parameters.radius;
      const lon = (u - 0.5) * Math.PI * 2;
      const lat = (0.5 - v) * Math.PI;
      const normal = new THREE.Vector3(
        Math.cos(lat) * Math.sin(lon + Math.PI),
        Math.sin(lat),
        Math.cos(lat) * Math.cos(lon + Math.PI)
      ).normalize();
      this.selectionMarker.position.copy(normal.clone().multiplyScalar(radius * 1.012)).add(this.surfaceMesh.position);
      this.selectionMarker.lookAt(this.selectionMarker.position.clone().add(normal));
      this.selectionMarker.scale.setScalar(radius / 18);
    }
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

  /**
   * Points the camera at a tile.
   * The earlier transform inverted longitude and added a ninety-degree offset, which could
   * put the requested tile on the limb or the far side of the planet; this matches the
   * spherical surface coordinates directly so locator jumps land in the visible hemisphere.
   */
  public focusTile(tileX: number, tileY: number, width: number, height: number) {
    const u = (tileX + 0.5) / width;
    const v = (tileY + 0.5) / height;
    this.rotY = (u - 0.5) * Math.PI * 2;
    this.rotX = Math.max(-1.1, Math.min(1.1, (0.5 - v) * Math.PI));
  }

  /**
   * Opening framing. Rather than showing an arbitrary meridian, the camera settles on the
   * longitude band carrying the most land, life and settlement — the part of the world most
   * likely to make someone want to look closer.
   */
  public frameMostInterestingRegion(state: WorldState) {
    const { width, height } = state.config;
    const bandCount = Math.min(24, width);
    const span = Math.max(1, Math.floor(width / 8));
    let best = { x: Math.floor(width / 2), y: Math.floor(height / 2), score: -Infinity };

    for (let band = 0; band < bandCount; band++) {
      const centerX = Math.floor(((band + 0.5) / bandCount) * width) % width;
      let score = 0;
      let weightedY = 0;
      let weight = 0;

      for (let dx = -span; dx <= span; dx++) {
        const x = (centerX + dx + width) % width;
        for (let y = 0; y < height; y++) {
          const tile = state.grid[y]?.[x];
          if (!tile) continue;
          // Latitude weighting keeps the framing off the poles, where the equirectangular
          // surface is most distorted.
          const latitudeWeight = 0.45 + Math.sin(((y + 0.5) / height) * Math.PI) * 0.55;
          const tileScore =
            ((tile.isWater ? 0 : 3.2) +
              Math.min(2.5, tile.biomass / 380) +
              tile.vegetationDensity * 1.6 +
              (tile.settlementId ? 10 : 0) +
              (tile.ruins.length > 0 ? 6 : 0) +
              tile.infrastructureLevel * 1.2) *
            latitudeWeight;
          score += tileScore;
          weightedY += y * Math.max(0.1, tileScore);
          weight += Math.max(0.1, tileScore);
        }
      }

      if (score > best.score) {
        best = { x: centerX, y: Math.max(0, Math.min(height - 1, Math.round(weightedY / Math.max(1, weight)))), score };
      }
    }

    this.focusTile(best.x, best.y, width, height);
  }

  private disposeObject(object: THREE.Object3D | null, parent?: THREE.Object3D) {
    if (!object) return;
    (parent ?? this.worldGroup ?? this.scene)?.remove(object);
    object.traverse(child => {
      const mesh = child as THREE.Mesh;
      mesh.geometry?.dispose();
      const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(material)) material.forEach(mat => mat.dispose());
      else material?.dispose();
    });
  }

  private clearWorldMeshes() {
    for (const mesh of [
      this.surfaceMesh,
      this.reliefMesh,
      this.oceanPlane,
      this.atmosphereMesh,
      this.cloudMesh,
      this.glassDomeMesh,
      this.baseMesh,
      this.moonMesh,
      this.particleSystem,
      this.selectionMarker
    ]) {
      this.disposeObject(mesh);
    }
    this.surfaceMesh = null;
    this.reliefMesh = null;
    this.oceanPlane = null;
    this.atmosphereMesh = null;
    this.cloudMesh = null;
    this.glassDomeMesh = null;
    this.baseMesh = null;
    this.moonMesh = null;
    this.particleSystem = null;
    this.selectionMarker = null;
    this.snowVelocity = null;
  }

  private startLoop() {
    let last = typeof performance !== 'undefined' ? performance.now() : 0;
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
        this.camera.lookAt(0, this.reliefMesh ? 0 : 0, 0);
      }

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
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  private updateSnow(dt: number) {
    if (!this.particleSystem || !this.snowVelocity) return;
    const geo = this.particleSystem.geometry as THREE.BufferGeometry;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const floor = -SNOW_RADIUS * 0.98 + 1.5;
    const ceiling = SNOW_RADIUS * 1.3 + 1.5;
    for (let i = 0; i < pos.count; i++) {
      let y = pos.getY(i) - this.snowVelocity[i] * dt * 60 * 0.06;
      if (y < floor) y = ceiling;
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
    this.particleSystem.rotation.y += dt * 0.04;
  }

  public resize(width: number, height: number) {
    if (!this.renderer || !this.camera || width <= 0 || height <= 0) return;
    const previousAspect = this.camera.aspect;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    // A narrower window makes the horizontal field of view the limiting one, so the framing
    // has to be recomputed or the planet gets cropped.
    if (this.currentViewMode && Math.abs(previousAspect - this.camera.aspect) > 0.001) {
      this.frameView(this.currentViewMode);
    }
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height, false);
    this.renderer.domElement.style.width = `${width}px`;
    this.renderer.domElement.style.height = `${height}px`;
  }

  public rotate(deltaX: number, deltaY: number) {
    this.rotY += deltaX * 0.008;
    this.rotX = Math.max(-1.35, Math.min(1.35, this.rotX + deltaY * 0.008));
  }

  public zoom(delta: number) {
    const isRelief = !!this.reliefMesh;
    const min = isRelief ? 26 : 24;
    const max = isRelief ? 120 : 220;
    this.targetZoom = Math.max(min, Math.min(max, this.targetZoom * (1 + delta * 0.0012)));
  }

  public getRendererInfo() {
    return this.renderer?.info ?? null;
  }

  public dispose() {
    if (this.animFrameId !== null) cancelAnimationFrame(this.animFrameId);
    this.animFrameId = null;
    this.clearWorldMeshes();
    if (this.starfieldPoints) {
      this.disposeObject(this.starfieldPoints, this.scene ?? undefined);
      this.starfieldPoints = null;
    }
    this.worldTexture?.dispose();
    this.normalTexture?.dispose();
    this.roughnessTexture?.dispose();
    this.metalnessTexture?.dispose();
    this.clearcoatTexture?.dispose();
    this.cloudTexture?.dispose();
    this.worldTexture = null;
    this.normalTexture = null;
    this.roughnessTexture = null;
    this.metalnessTexture = null;
    this.clearcoatTexture = null;
    this.cloudTexture = null;
    this.compositor.dispose();
    this.lastSurfaceRevision = -1;

    if (this.renderer) {
      const canvas = this.renderer.domElement;
      this.renderer.dispose();
      // Explicitly release the WebGL context; browsers cap the number of live contexts and
      // WORLDSEED allows unlimited view switching.
      this.renderer.forceContextLoss();
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    }
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.worldGroup = null;
    this.sunLight = null;
    this.rimLight = null;
    this.currentViewMode = null;
    this.currentDimensions = '';
  }
}
