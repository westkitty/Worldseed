import * as THREE from 'three';
import { ThreeWorldRenderer } from './ThreeWorldRenderer';
import { WorldState, WorldViewMode } from '../../types/simulation';

const proto = ThreeWorldRenderer.prototype as any;

const structuralFeatureSignature = (state: WorldState): string => {
  const settlements = Object.values(state.settlements)
    .map(settlement => `${settlement.id}:${settlement.tileX}:${settlement.tileY}:${settlement.tier}:${settlement.isAbandoned ? 1 : 0}`)
    .join('|');
  const ruins = Object.values(state.ruins)
    .map(ruin => `${ruin.id}:${ruin.collapsedYear}:${Math.round(ruin.decayLevel * 10)}`)
    .join('|');
  return `${settlements}::${ruins}`;
};

const sampledSurfaceSignature = (state: WorldState): string => {
  const { width, height } = state.config;
  const points = [
    [0, 0],
    [Math.floor(width / 3), Math.floor(height / 3)],
    [Math.floor(width / 2), Math.floor(height / 2)],
    [Math.max(0, width - 1), Math.max(0, height - 1)]
  ];
  return points
    .map(([x, y]) => {
      const tile = state.grid[y]?.[x];
      return tile
        ? `${tile.biome}:${Math.round(tile.environmentalDamage * 10)}:${Math.round(tile.pollution * 10)}`
        : 'x';
    })
    .join('|');
};

const findRichestTile = (state: WorldState): { x: number; y: number } => {
  const { width, height } = state.config;
  let best = { x: Math.floor(width / 2), y: Math.floor(height / 2), score: -Infinity };
  const bandCount = Math.min(24, width);

  for (let band = 0; band < bandCount; band++) {
    const centerX = Math.floor(((band + 0.5) / bandCount) * width) % width;
    let score = 0;
    let weightedY = 0;
    let weight = 0;
    const span = Math.max(1, Math.floor(width / 8));

    for (let dx = -span; dx <= span; dx++) {
      const x = (centerX + dx + width) % width;
      for (let y = 0; y < height; y++) {
        const tile = state.grid[y]?.[x];
        if (!tile) continue;
        const latitudeWeight = 0.45 + Math.sin(((y + 0.5) / height) * Math.PI) * 0.55;
        const tileScore = (
          (tile.isWater ? 0 : 3.2) +
          Math.min(2.5, tile.biomass / 380) +
          tile.vegetationDensity * 1.6 +
          (tile.settlementId ? 10 : 0) +
          (tile.ruins.length > 0 ? 6 : 0) +
          tile.infrastructureLevel * 1.2
        ) * latitudeWeight;
        score += tileScore;
        weightedY += y * Math.max(0.1, tileScore);
        weight += Math.max(0.1, tileScore);
      }
    }

    if (score > best.score) {
      best = {
        x: centerX,
        y: Math.max(0, Math.min(height - 1, Math.round(weightedY / Math.max(1, weight)))),
        score
      };
    }
  }

  return { x: best.x, y: best.y };
};

proto.createWorldTexture = function (state: WorldState, layer: string): THREE.CanvasTexture {
  const self: any = this;
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
      sourceCtx.fillStyle = self.layerColor(state, tile, layer);
      sourceCtx.fillRect(x, y, 1, 1);
    }
  }

  const scale = 12;
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('WORLDSEED could not create the 3D world texture canvas.');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);

  const seed = state.config.seed >>> 0;
  ctx.save();
  ctx.globalAlpha = 0.035;
  for (let i = 0; i < 420; i++) {
    const x = self.seededUnit(seed ^ 0x574f524c, i * 2) * canvas.width;
    const y = self.seededUnit(seed ^ 0x53454544, i * 2 + 1) * canvas.height;
    const size = 1 + self.seededUnit(seed ^ 0x54455854, i) * 3;
    ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#000000';
    ctx.fillRect(x, y, size, size);
  }
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  if (self.renderer) texture.anisotropy = Math.min(6, self.renderer.capabilities.getMaxAnisotropy());
  texture.needsUpdate = true;
  return texture;
};

proto.featureSignature = function (state: WorldState): string {
  return structuralFeatureSignature(state);
};

const originalUpdateScene = proto.updateScene;
proto.updateScene = function (state: WorldState, viewMode: WorldViewMode, layer = 'PHYSICAL') {
  const self: any = this;
  const previousMode = self.currentViewMode as WorldViewMode | null;
  const visualSignature = [
    state.config.seed,
    viewMode,
    layer,
    Math.floor(state.currentYear / 5),
    state.currentBranchId,
    state.events.length,
    structuralFeatureSignature(state),
    sampledSurfaceSignature(state)
  ].join('::');

  if (self.__worldseedVisualSignature === visualSignature && previousMode === viewMode) {
    self.updateFeatureMarkers(state, viewMode);
    return;
  }

  self.__worldseedVisualSignature = visualSignature;
  originalUpdateScene.call(this, state, viewMode, layer);

  if (self.cloudMesh) self.cloudMesh.visible = false;
  if (self.renderer) self.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

  if (
    previousMode !== viewMode &&
    (viewMode === 'GLOBE' || viewMode === 'SNOW_GLOBE' || viewMode === 'ORBITAL_VIEW')
  ) {
    const focus = findRichestTile(state);
    self.focusTile(focus.x, focus.y, state.config.width, state.config.height);
  }
};
