// WORLDSEED — World-informed atmospheric effects
//
// Every particle is spawned from a real tile field, so what the user sees on the map is a
// readout of the simulation rather than decoration: rain falls where it is actually raining,
// snow where it is actually freezing, dust over real deserts, smoke over real environmental
// damage, and flocks over genuinely productive biomass.
//
// The engine never reads or advances the simulation PRNG and never writes to world state.

import { WorldState } from '../../types/simulation';

export type ParticleKind = 'RAIN' | 'SNOW' | 'DUST' | 'SMOKE' | 'FLOCK' | 'EMBER';

export interface Particle {
  x: number; // tile space
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  kind: ParticleKind;
  alpha: number;
}

interface SpawnSite {
  x: number;
  y: number;
  kind: ParticleKind;
}

const MAX_PARTICLES = 220;
const SITE_REFRESH_TICKS = 120;

export class ParticleEngine {
  private particles: Particle[] = [];
  private sites: SpawnSite[] = [];
  private tickCounter = SITE_REFRESH_TICKS;
  private cursor = 0;
  private enabled = true;

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) this.particles.length = 0;
  }

  /**
   * Rebuilds the spawn map from current tile state. Sampling a bounded stride keeps this
   * O(tiles/stride) and independent of how fast the simulation is running.
   */
  private refreshSites(state: WorldState) {
    const { width, height } = state.config;
    const sites: SpawnSite[] = [];
    const stride = Math.max(1, Math.floor(Math.sqrt((width * height) / 260)));

    for (let y = 0; y < height; y += stride) {
      for (let x = 0; x < width; x += stride) {
        const tile = state.grid[y][x];
        const damage = Math.max(tile.environmentalDamage, tile.pollution);

        if (damage > 0.35) {
          sites.push({ x, y, kind: 'SMOKE' });
          continue;
        }
        if (tile.biome === 'VOLCANIC_BARREN' || tile.biome === 'HYDROTHERMAL_RIFT') {
          sites.push({ x, y, kind: 'EMBER' });
          continue;
        }
        if (tile.currentTemp < -2 && tile.rainfall > 0.3) {
          sites.push({ x, y, kind: 'SNOW' });
          continue;
        }
        if (tile.rainfall > 0.62) {
          sites.push({ x, y, kind: 'RAIN' });
          continue;
        }
        if (!tile.isWater && tile.moisture < 0.2 && tile.currentTemp > 16) {
          sites.push({ x, y, kind: 'DUST' });
          continue;
        }
        if (!tile.isWater && tile.biomass > 620) {
          sites.push({ x, y, kind: 'FLOCK' });
        }
      }
    }

    this.sites = sites;
  }

  public update(state: WorldState, dt: number) {
    if (!this.enabled) return;

    this.tickCounter++;
    if (this.tickCounter >= SITE_REFRESH_TICKS || this.sites.length === 0) {
      this.tickCounter = 0;
      this.refreshSites(state);
    }

    const { width, height } = state.config;
    const budget = Math.min(MAX_PARTICLES, this.sites.length * 2);

    // Deterministic round-robin over spawn sites: no PRNG, and coverage stays even.
    let spawns = Math.min(3, budget - this.particles.length);
    while (spawns-- > 0 && this.sites.length > 0) {
      this.cursor = (this.cursor + 7) % this.sites.length;
      this.spawn(this.sites[this.cursor]);
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life += dt;

      if (p.x < 0) p.x += width;
      if (p.x >= width) p.x -= width;

      if (p.life >= p.maxLife || p.y < -1 || p.y >= height + 1) {
        this.particles[i] = this.particles[this.particles.length - 1];
        this.particles.pop();
      }
    }
  }

  private spawn(site: SpawnSite) {
    const jitter = ((this.cursor * 2654435761) % 1000) / 1000 - 0.5;
    const base = { x: site.x + jitter, y: site.y + jitter * 0.6, life: 0, kind: site.kind };

    switch (site.kind) {
      case 'RAIN':
        this.particles.push({ ...base, vx: 0.6, vy: 5.5, maxLife: 1.1, size: 1.1, alpha: 0.4 });
        break;
      case 'SNOW':
        this.particles.push({ ...base, vx: jitter * 0.7, vy: 1.2, maxLife: 2.6, size: 1.5, alpha: 0.72 });
        break;
      case 'DUST':
        this.particles.push({ ...base, vx: 2.2, vy: jitter * 0.4, maxLife: 2.2, size: 1.6, alpha: 0.26 });
        break;
      case 'SMOKE':
        this.particles.push({ ...base, vx: 0.8, vy: -1.1, maxLife: 3.0, size: 2.6, alpha: 0.32 });
        break;
      case 'EMBER':
        this.particles.push({ ...base, vx: jitter * 0.5, vy: -1.6, maxLife: 1.8, size: 1.2, alpha: 0.8 });
        break;
      case 'FLOCK':
        this.particles.push({ ...base, vx: 1.8, vy: -0.25, maxLife: 3.4, size: 2.2, alpha: 0.55 });
        break;
    }
  }

  public render(
    ctx: CanvasRenderingContext2D,
    originX: number,
    originY: number,
    tileSize: number,
    canvasWidth: number,
    canvasHeight: number
  ) {
    if (!this.enabled || this.particles.length === 0) return;
    ctx.save();
    for (const p of this.particles) {
      const px = originX + p.x * tileSize;
      const py = originY + p.y * tileSize;
      if (px < -10 || px > canvasWidth + 10 || py < -10 || py > canvasHeight + 10) continue;

      const fade = 1 - p.life / p.maxLife;
      const alpha = p.alpha * Math.max(0, Math.min(1, fade * 1.6));
      const scale = Math.max(0.6, tileSize / 18);

      switch (p.kind) {
        case 'RAIN':
          ctx.strokeStyle = `rgba(150, 205, 240, ${alpha})`;
          ctx.lineWidth = Math.max(0.6, p.size * scale * 0.5);
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px + p.vx * scale * 0.8, py + p.vy * scale * 0.8);
          ctx.stroke();
          break;
        case 'FLOCK':
          ctx.strokeStyle = `rgba(226, 236, 248, ${alpha})`;
          ctx.lineWidth = Math.max(0.7, scale * 0.7);
          ctx.beginPath();
          ctx.moveTo(px - p.size * scale, py - p.size * scale * 0.55);
          ctx.lineTo(px, py);
          ctx.lineTo(px + p.size * scale, py - p.size * scale * 0.55);
          ctx.stroke();
          break;
        case 'SMOKE':
          ctx.fillStyle = `rgba(96, 92, 88, ${alpha})`;
          ctx.beginPath();
          ctx.arc(px, py, p.size * scale * (1 + p.life * 0.5), 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'EMBER':
          ctx.fillStyle = `rgba(255, 148, 72, ${alpha})`;
          ctx.beginPath();
          ctx.arc(px, py, p.size * scale * 0.6, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'DUST':
          ctx.fillStyle = `rgba(216, 186, 132, ${alpha})`;
          ctx.beginPath();
          ctx.arc(px, py, p.size * scale * 0.7, 0, Math.PI * 2);
          ctx.fill();
          break;
        default:
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.beginPath();
          ctx.arc(px, py, p.size * scale * 0.7, 0, Math.PI * 2);
          ctx.fill();
      }
    }
    ctx.restore();
  }
}
