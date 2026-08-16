// Procedural Vector/Canvas Organism Sprite Generator (CC0-1.0)

import { MorphologicalGroup, Species } from '../../types/simulation';

export class OrganismSpriteEngine {
  private static spriteCache: Map<string, HTMLCanvasElement> = new Map();

  public static getOrganismCanvas(species: Species, size: number = 32): HTMLCanvasElement {
    const key = `${species.id}_${size}_${species.colorHex}`;
    if (this.spriteCache.has(key)) {
      return this.spriteCache.get(key)!;
    }

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    this.renderOrganism(ctx, species, size);
    this.spriteCache.set(key, canvas);
    return canvas;
  }

  private static renderOrganism(ctx: CanvasRenderingContext2D, species: Species, s: number) {
    ctx.clearRect(0, 0, s, s);
    const color = species.colorHex;
    const m = species.morphology;
    const cx = s / 2;
    const cy = s / 2;

    ctx.fillStyle = color;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;

    switch (m) {
      case 'AUTOTROPH_PLANT':
        // Branching fronds / crown
        ctx.beginPath();
        ctx.moveTo(cx, s * 0.85);
        ctx.lineTo(cx, cy);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx - s * 0.2, cy - s * 0.1, s * 0.2, 0, Math.PI * 2);
        ctx.arc(cx + s * 0.2, cy - s * 0.1, s * 0.2, 0, Math.PI * 2);
        ctx.arc(cx, cy - s * 0.25, s * 0.22, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;

      case 'FUNGUS_MYCELIUM':
        // Mushroom cap & stalk
        ctx.beginPath();
        ctx.arc(cx, cy - s * 0.05, s * 0.35, Math.PI, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillRect(cx - s * 0.08, cy - s * 0.05, s * 0.16, s * 0.4);
        ctx.strokeRect(cx - s * 0.08, cy - s * 0.05, s * 0.16, s * 0.4);
        break;

      case 'INVERTEBRATE_ARTHROPOD':
        // Segmented carapace and mandibles/legs
        ctx.beginPath();
        ctx.ellipse(cx, cy, s * 0.28, s * 0.18, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Legs
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.moveTo(cx + i * s * 0.15, cy - s * 0.15);
          ctx.lineTo(cx + i * s * 0.22, cy - s * 0.35);
          ctx.moveTo(cx + i * s * 0.15, cy + s * 0.15);
          ctx.lineTo(cx + i * s * 0.22, cy + s * 0.35);
          ctx.stroke();
        }
        break;

      case 'PISCINE':
        // Fish streamlined body & caudal fin
        ctx.beginPath();
        ctx.ellipse(cx - s * 0.05, cy, s * 0.28, s * 0.15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + s * 0.2, cy);
        ctx.lineTo(cx + s * 0.38, cy - s * 0.2);
        ctx.lineTo(cx + s * 0.38, cy + s * 0.2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;

      case 'REPTILIAN':
      case 'AMPHIBIAN':
        // Quadruped body with tail
        ctx.beginPath();
        ctx.ellipse(cx, cy, s * 0.25, s * 0.16, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Head
        ctx.beginPath();
        ctx.arc(cx - s * 0.28, cy, s * 0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;

      case 'AVIAN':
        // Winged flier
        ctx.beginPath();
        ctx.ellipse(cx, cy, s * 0.18, s * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Wings
        ctx.beginPath();
        ctx.moveTo(cx - s * 0.1, cy);
        ctx.lineTo(cx - s * 0.4, cy - s * 0.25);
        ctx.lineTo(cx - s * 0.05, cy + s * 0.1);
        ctx.moveTo(cx + s * 0.1, cy);
        ctx.lineTo(cx + s * 0.4, cy - s * 0.25);
        ctx.lineTo(cx + s * 0.05, cy + s * 0.1);
        ctx.stroke();
        break;

      case 'MAMMALIAN':
        // Quadruped or Biped with ears
        ctx.beginPath();
        ctx.ellipse(cx, cy + s * 0.05, s * 0.22, s * 0.28, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy - s * 0.22, s * 0.14, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Ears
        ctx.fillRect(cx - s * 0.14, cy - s * 0.38, s * 0.06, s * 0.1);
        ctx.fillRect(cx + s * 0.08, cy - s * 0.38, s * 0.06, s * 0.1);
        break;

      default:
        // Generic symbiont / organism orb
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.28, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;
    }
  }
}
