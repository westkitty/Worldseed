// Procedural Biome Pixel Tile & Texture Generator (CC0-1.0)

import { BiomeType } from '../../types/simulation';

export class BiomeTilesetEngine {
  private static tileCache: Map<string, HTMLCanvasElement> = new Map();

  // Generate or retrieve cached 32x32 procedural tile for a biome
  public static getTileCanvas(biome: BiomeType, seed: number = 0, variant: number = 0): HTMLCanvasElement {
    const key = `${biome}_${variant % 4}`;
    if (this.tileCache.has(key)) {
      return this.tileCache.get(key)!;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;

    this.renderBiomeTexture(ctx, biome, variant);
    this.tileCache.set(key, canvas);
    return canvas;
  }

  private static renderBiomeTexture(ctx: CanvasRenderingContext2D, biome: BiomeType, variant: number) {
    ctx.clearRect(0, 0, 32, 32);

    switch (biome) {
      case 'DEEP_OCEAN':
        ctx.fillStyle = '#061325';
        ctx.fillRect(0, 0, 32, 32);
        ctx.fillStyle = '#0b213f';
        ctx.fillRect(2, 4, 12, 6);
        ctx.fillRect(16, 18, 14, 8);
        // Abyssal trench shimmer
        ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
        ctx.fillRect(8, 12, 16, 2);
        break;

      case 'SHALLOW_OCEAN':
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(0, 0, 32, 32);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(4, 6, 8, 4);
        ctx.fillRect(18, 14, 10, 5);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(6, 7, 4, 1);
        ctx.fillRect(20, 15, 6, 1);
        break;

      case 'COASTAL_REEF':
        ctx.fillStyle = '#06b6d4';
        ctx.fillRect(0, 0, 32, 32);
        ctx.fillStyle = '#f43f5e'; // Coral polyps
        ctx.fillRect(6, 8, 5, 5);
        ctx.fillRect(20, 18, 6, 6);
        ctx.fillStyle = '#10b981'; // Sea kelp
        ctx.fillRect(14, 12, 4, 8);
        break;

      case 'HYDROTHERMAL_RIFT':
        ctx.fillStyle = '#1e1b4b';
        ctx.fillRect(0, 0, 32, 32);
        ctx.fillStyle = '#7e22ce';
        ctx.fillRect(4, 14, 24, 4);
        ctx.fillStyle = '#f97316'; // Glowing magma vent
        ctx.fillRect(12, 15, 8, 2);
        ctx.fillStyle = '#fde047';
        ctx.fillRect(15, 15, 2, 2);
        break;

      case 'TUNDRA':
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(0, 0, 32, 32);
        ctx.fillStyle = '#cbd5e1'; // Permafrost patches
        ctx.fillRect(2, 2, 12, 8);
        ctx.fillRect(16, 16, 14, 12);
        ctx.fillStyle = '#475569'; // Exposed rock
        ctx.fillRect(8, 20, 6, 4);
        break;

      case 'TAIGA':
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, 32, 32);
        // Conifer needle canopy
        ctx.fillStyle = '#064e3b';
        ctx.fillRect(4, 4, 10, 10);
        ctx.fillRect(18, 14, 12, 14);
        ctx.fillStyle = '#047857';
        ctx.fillRect(6, 6, 6, 6);
        ctx.fillRect(20, 16, 8, 8);
        break;

      case 'TEMPERATE_FOREST':
        ctx.fillStyle = '#166534';
        ctx.fillRect(0, 0, 32, 32);
        // Deciduous crown clusters
        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.arc(10, 12, 7, 0, Math.PI * 2);
        ctx.arc(22, 20, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(9, 10, 4, 0, Math.PI * 2);
        ctx.arc(21, 18, 5, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'TEMPERATE_GRASSLAND':
        ctx.fillStyle = '#4d7c0f';
        ctx.fillRect(0, 0, 32, 32);
        ctx.fillStyle = '#65a30d';
        ctx.fillRect(4, 4, 8, 6);
        ctx.fillRect(16, 18, 12, 8);
        ctx.fillStyle = '#84cc16'; // Wildflower sprigs
        ctx.fillRect(6, 14, 2, 4);
        ctx.fillRect(24, 8, 2, 4);
        break;

      case 'TROPICAL_RAINFOREST':
        ctx.fillStyle = '#064e3b';
        ctx.fillRect(0, 0, 32, 32);
        ctx.fillStyle = '#047857';
        ctx.beginPath();
        ctx.arc(12, 12, 9, 0, Math.PI * 2);
        ctx.arc(22, 22, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(10, 10, 5, 0, Math.PI * 2);
        ctx.arc(20, 20, 5, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'SAVANNA':
        ctx.fillStyle = '#b45309';
        ctx.fillRect(0, 0, 32, 32);
        ctx.fillStyle = '#d97706';
        ctx.fillRect(2, 6, 14, 10);
        ctx.fillRect(18, 16, 12, 10);
        // Acacia umbrella canopy
        ctx.fillStyle = '#78350f';
        ctx.fillRect(8, 20, 2, 6);
        ctx.fillStyle = '#15803d';
        ctx.fillRect(4, 18, 10, 3);
        break;

      case 'HOT_DESERT':
        ctx.fillStyle = '#ca8a04';
        ctx.fillRect(0, 0, 32, 32);
        ctx.fillStyle = '#eab308';
        // Sand dune ridges
        ctx.beginPath();
        ctx.moveTo(0, 10);
        ctx.quadraticCurveTo(16, 4, 32, 12);
        ctx.lineTo(32, 20);
        ctx.quadraticCurveTo(16, 12, 0, 18);
        ctx.fill();
        break;

      case 'COLD_DESERT':
        ctx.fillStyle = '#64748b';
        ctx.fillRect(0, 0, 32, 32);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(4, 8, 12, 6);
        ctx.fillRect(18, 16, 10, 8);
        break;

      case 'WETLAND':
        ctx.fillStyle = '#0f766e';
        ctx.fillRect(0, 0, 32, 32);
        ctx.fillStyle = '#14b8a6'; // Water pool
        ctx.fillRect(6, 10, 12, 8);
        ctx.fillStyle = '#115e59'; // Mangrove root clusters
        ctx.fillRect(4, 8, 4, 12);
        ctx.fillRect(20, 14, 6, 10);
        break;

      case 'ALPINE':
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(0, 0, 32, 32);
        ctx.fillStyle = '#ffffff'; // Glacial ice cap
        ctx.beginPath();
        ctx.moveTo(16, 4);
        ctx.lineTo(28, 28);
        ctx.lineTo(4, 28);
        ctx.fill();
        ctx.fillStyle = '#475569'; // Mountain crag shadow
        ctx.beginPath();
        ctx.moveTo(16, 4);
        ctx.lineTo(16, 28);
        ctx.lineTo(4, 28);
        ctx.fill();
        break;

      case 'VOLCANIC_BARREN':
        ctx.fillStyle = '#262626';
        ctx.fillRect(0, 0, 32, 32);
        ctx.fillStyle = '#171717';
        ctx.fillRect(4, 4, 14, 14);
        // Basalt fissures & glowing magma veins
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(6, 16, 20, 2);
        ctx.fillStyle = '#f97316';
        ctx.fillRect(10, 16, 8, 2);
        break;
    }
  }
}
