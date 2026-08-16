// Procedural Architectural & Infrastructure Sprite Generator (CC0-1.0)

import { Settlement, RuinSite } from '../../types/simulation';

export class CivilizationSpriteEngine {
  private static spriteCache: Map<string, HTMLCanvasElement> = new Map();

  public static getSettlementCanvas(settlement: Settlement, size: number = 32): HTMLCanvasElement {
    const key = `sett_${settlement.tier}_${size}_${settlement.infrastructure.hasWalls ? 'w' : ''}`;
    if (this.spriteCache.has(key)) {
      return this.spriteCache.get(key)!;
    }

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    this.renderSettlement(ctx, settlement, size);
    this.spriteCache.set(key, canvas);
    return canvas;
  }

  public static getRuinCanvas(size: number = 32): HTMLCanvasElement {
    const key = `ruin_${size}`;
    if (this.spriteCache.has(key)) return this.spriteCache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, size, size);
    const s = size;
    // Broken pillar & crumbling blocks
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(s * 0.2, s * 0.4, s * 0.18, s * 0.45);
    ctx.fillRect(s * 0.6, s * 0.55, s * 0.18, s * 0.3);
    // Overgrown moss
    ctx.fillStyle = '#10b981';
    ctx.fillRect(s * 0.18, s * 0.75, s * 0.22, s * 0.1);
    ctx.fillRect(s * 0.58, s * 0.8, s * 0.22, s * 0.08);

    this.spriteCache.set(key, canvas);
    return canvas;
  }

  private static renderSettlement(ctx: CanvasRenderingContext2D, s: Settlement, size: number) {
    ctx.clearRect(0, 0, size, size);
    const cx = size / 2;
    const cy = size / 2;

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1;

    switch (s.tier) {
      case 'CAMP':
        // Nomadic hide tent
        ctx.fillStyle = '#d97706';
        ctx.beginPath();
        ctx.moveTo(cx, cy - size * 0.3);
        ctx.lineTo(cx + size * 0.3, cy + size * 0.3);
        ctx.lineTo(cx - size * 0.3, cy + size * 0.3);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;

      case 'HAMLET':
        // Two thatched clay huts
        ctx.fillStyle = '#b45309';
        ctx.fillRect(cx - size * 0.3, cy - size * 0.1, size * 0.25, size * 0.35);
        ctx.fillRect(cx + size * 0.05, cy, size * 0.25, size * 0.25);
        ctx.fillStyle = '#fde047'; // Thatched roof
        ctx.beginPath();
        ctx.moveTo(cx - size * 0.175, cy - size * 0.28);
        ctx.lineTo(cx - size * 0.02, cy - size * 0.1);
        ctx.lineTo(cx - size * 0.33, cy - size * 0.1);
        ctx.fill();
        break;

      case 'VILLAGE':
        // Wooden palisade and central granary
        ctx.fillStyle = '#92400e';
        ctx.fillRect(cx - size * 0.35, cy - size * 0.2, size * 0.7, size * 0.55);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(cx - size * 0.15, cy - size * 0.35, size * 0.3, size * 0.4);
        break;

      case 'TOWN':
        // Stone hall and watchtower
        ctx.fillStyle = '#64748b';
        ctx.fillRect(cx - size * 0.35, cy - size * 0.15, size * 0.7, size * 0.5);
        ctx.fillStyle = '#38bdf8'; // Tower spire
        ctx.beginPath();
        ctx.moveTo(cx - size * 0.2, cy - size * 0.4);
        ctx.lineTo(cx - size * 0.05, cy - size * 0.15);
        ctx.lineTo(cx - size * 0.35, cy - size * 0.15);
        ctx.fill();
        break;

      case 'CITY':
        // Fortified battlements and temple dome
        ctx.fillStyle = '#475569';
        ctx.fillRect(cx - size * 0.4, cy - size * 0.25, size * 0.8, size * 0.6);
        ctx.fillStyle = '#f59e0b'; // Gold dome
        ctx.beginPath();
        ctx.arc(cx, cy - size * 0.15, size * 0.22, Math.PI, 0);
        ctx.fill();
        ctx.stroke();
        break;

      case 'METROPOLIS':
        // Monumental imperial palace & aqueduct
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(cx - size * 0.45, cy - size * 0.3, size * 0.9, size * 0.7);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(cx - size * 0.15, cy - size * 0.45, size * 0.3, size * 0.5);
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(cx, cy - size * 0.45, size * 0.15, Math.PI, 0);
        ctx.fill();
        break;
    }
  }
}
