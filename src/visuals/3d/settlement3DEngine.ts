// 3D Procedural Architectural Evolution & Settlement Engine (CC0-1.0)

import { Settlement, RuinSite, WorldConfig } from '../../types/simulation';

export interface Architecture3DBlock {
  type: 'WALL' | 'ROOF' | 'DOME' | 'TOWER' | 'PILLAR' | 'CHIMNEY' | 'AQUEDUCT' | 'ARCOLOGY';
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  color: string;
  roofType?: 'FLAT' | 'PITCHED' | 'DOME' | 'SPIRE';
}

export class Settlement3DEngine {
  // Generate dimensional 3D architectural blocks for a settlement based on tier, infrastructure, and age
  public static generateSettlementBlocks(settlement: Settlement): Architecture3DBlock[] {
    const blocks: Architecture3DBlock[] = [];
    const tier = settlement.tier;

    if (tier === 'CAMP') {
      // Nomadic leather tents & central fire pit
      blocks.push({
        type: 'ROOF',
        x: 0,
        y: 0,
        z: 0,
        width: 14,
        height: 10,
        depth: 14,
        color: '#d97706',
        roofType: 'PITCHED'
      });
      blocks.push({
        type: 'WALL',
        x: -12,
        y: 0,
        z: 8,
        width: 10,
        height: 7,
        depth: 10,
        color: '#b45309',
        roofType: 'PITCHED'
      });
    } else if (tier === 'HAMLET' || tier === 'VILLAGE') {
      // Timber & thatch huts with palisade
      const count = tier === 'HAMLET' ? 3 : 6;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const dist = 12 + (i % 2) * 6;
        blocks.push({
          type: 'WALL',
          x: Math.cos(angle) * dist,
          y: 0,
          z: Math.sin(angle) * dist,
          width: 8,
          height: 8,
          depth: 8,
          color: '#78350f',
          roofType: 'PITCHED'
        });
      }
      if (settlement.infrastructure.hasWalls) {
        // Wooden palisade perimeter
        blocks.push({
          type: 'WALL',
          x: 0,
          y: 0,
          z: 0,
          width: 36,
          height: 4,
          depth: 36,
          color: '#92400e',
          roofType: 'FLAT'
        });
      }
    } else if (tier === 'TOWN' || tier === 'CITY') {
      // Stone halls, fortified keep & watchtower
      blocks.push({
        type: 'WALL',
        x: 0,
        y: 0,
        z: 0,
        width: 22,
        height: 14,
        depth: 22,
        color: '#475569',
        roofType: 'FLAT'
      });
      // Watchtower Spire
      blocks.push({
        type: 'TOWER',
        x: -10,
        y: -14,
        z: -10,
        width: 8,
        height: 24,
        depth: 8,
        color: '#334155',
        roofType: 'SPIRE'
      });
      if (settlement.infrastructure.hasTemple) {
        // Temple Dome
        blocks.push({
          type: 'DOME',
          x: 8,
          y: -12,
          z: 8,
          width: 12,
          height: 10,
          depth: 12,
          color: '#f59e0b',
          roofType: 'DOME'
        });
      }
    } else if (tier === 'METROPOLIS') {
      // Monumental citadel, palace dome, and aqueducts
      blocks.push({
        type: 'ARCOLOGY',
        x: 0,
        y: 0,
        z: 0,
        width: 32,
        height: 20,
        depth: 32,
        color: '#1e293b',
        roofType: 'FLAT'
      });
      // Golden Palace Dome
      blocks.push({
        type: 'DOME',
        x: 0,
        y: -20,
        z: 0,
        width: 18,
        height: 16,
        depth: 18,
        color: '#fbbf24',
        roofType: 'DOME'
      });
      // Flanking Towers
      for (const [tx, tz] of [[-14, -14], [14, -14], [-14, 14], [14, 14]]) {
        blocks.push({
          type: 'TOWER',
          x: tx,
          y: -18,
          z: tz,
          width: 8,
          height: 28,
          depth: 8,
          color: '#0f172a',
          roofType: 'SPIRE'
        });
      }
    }

    return blocks;
  }

  // Render 3D settlement model in isometric / relief space
  public static renderSettlement3D(
    ctx: CanvasRenderingContext2D,
    settlement: Settlement,
    screenX: number,
    screenY: number,
    scale: number = 1.0
  ) {
    const blocks = this.generateSettlementBlocks(settlement);

    // Render sorted blocks
    for (const b of blocks) {
      const bx = screenX + b.x * scale;
      const by = screenY + (b.z * 0.5 - b.height) * scale;
      const bw = b.width * scale;
      const bh = b.height * scale;

      ctx.fillStyle = b.color;
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 1;

      // Base wall extrusion
      ctx.fillRect(bx - bw / 2, by, bw, bh);
      ctx.strokeRect(bx - bw / 2, by, bw, bh);

      // Roof / Dome top
      if (b.roofType === 'DOME') {
        ctx.beginPath();
        ctx.arc(bx, by, bw / 2, Math.PI, 0);
        ctx.fill();
        ctx.stroke();
      } else if (b.roofType === 'SPIRE') {
        ctx.beginPath();
        ctx.moveTo(bx, by - bh * 0.6);
        ctx.lineTo(bx + bw / 2, by);
        ctx.lineTo(bx - bw / 2, by);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (b.roofType === 'PITCHED') {
        ctx.beginPath();
        ctx.moveTo(bx, by - bh * 0.4);
        ctx.lineTo(bx + bw / 2, by);
        ctx.lineTo(bx - bw / 2, by);
        ctx.closePath();
        ctx.fillStyle = '#fde047'; // Thatched roof color
        ctx.fill();
        ctx.stroke();
      }
    }
  }
}
