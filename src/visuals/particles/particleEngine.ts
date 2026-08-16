// Dynamic Weather, Water Current, Migration & Atmospheric Particle Engine

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: 'RAIN' | 'SNOW' | 'DUST' | 'SMOKE' | 'RIVER_FLOW' | 'CARAVAN' | 'BIRD';
}

export class ParticleEngine {
  private particles: Particle[] = [];
  private maxParticles: number = 250;

  public update(width: number, height: number, time: number) {
    // Spawn ambient particles
    if (this.particles.length < this.maxParticles && Math.random() < 0.6) {
      this.spawnParticle(width, height);
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life++;

      // Toroidal wrapping
      if (p.x < 0) p.x += width;
      if (p.x >= width) p.x -= width;

      if (p.life >= p.maxLife || p.y < 0 || p.y >= height) {
        this.particles.splice(i, 1);
      }
    }
  }

  private spawnParticle(width: number, height: number) {
    const typeRoll = Math.random();
    let type: Particle['type'] = 'RAIN';
    let vx = 0;
    let vy = 0;
    let maxLife = 60;
    let size = 1.5;
    let color = 'rgba(56, 189, 248, 0.4)';

    if (typeRoll < 0.35) {
      type = 'RAIN';
      vx = 0.5;
      vy = 2.5;
      maxLife = 40;
      color = 'rgba(125, 211, 252, 0.35)';
    } else if (typeRoll < 0.6) {
      type = 'SNOW';
      vx = (Math.random() - 0.5) * 0.4;
      vy = 0.8;
      maxLife = 80;
      size = 2;
      color = 'rgba(255, 255, 255, 0.6)';
    } else if (typeRoll < 0.8) {
      type = 'DUST';
      vx = 1.2;
      vy = (Math.random() - 0.5) * 0.2;
      maxLife = 70;
      size = 1.8;
      color = 'rgba(251, 191, 36, 0.25)';
    } else {
      type = 'BIRD';
      vx = 1.5;
      vy = -0.3;
      maxLife = 120;
      size = 2.5;
      color = 'rgba(241, 245, 249, 0.7)';
    }

    this.particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx,
      vy,
      life: 0,
      maxLife,
      size,
      color,
      type
    });
  }

  public render(
    ctx: CanvasRenderingContext2D,
    originX: number,
    originY: number,
    tileSize: number,
    canvasWidth: number,
    canvasHeight: number
  ) {
    for (const p of this.particles) {
      const px = originX + p.x * tileSize;
      const py = originY + p.y * tileSize;

      if (px < 0 || px > canvasWidth || py < 0 || py > canvasHeight) continue;

      ctx.fillStyle = p.color;
      ctx.beginPath();
      if (p.type === 'RAIN') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1;
        ctx.moveTo(px, py);
        ctx.lineTo(px + p.vx * 3, py + p.vy * 3);
        ctx.stroke();
      } else if (p.type === 'BIRD') {
        // V-shape bird flock
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.5;
        ctx.moveTo(px - 3, py - 2);
        ctx.lineTo(px, py);
        ctx.lineTo(px + 3, py - 2);
        ctx.stroke();
      } else {
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}
