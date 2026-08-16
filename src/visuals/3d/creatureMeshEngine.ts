// Procedural 3D/Dimensional Creature Morphology & Phenotype Generator (CC0-1.0)

import { Species, MorphologicalGroup } from '../../types/simulation';

export interface Creature3DPart {
  type: 'TORSO' | 'HEAD' | 'LIMB' | 'WING' | 'FIN' | 'TAIL' | 'ANTENNA' | 'EYE' | 'HORN' | 'ARMOR' | 'SHELL' | 'BIOLUM';
  x: number;
  y: number;
  z: number;
  sizeX: number;
  sizeY: number;
  sizeZ: number;
  color: string;
  shape: 'ELLIPSOID' | 'CYLINDER' | 'SEGMENTED_BOX' | 'CONE' | 'CRESCENT';
}

export interface Creature3DPhenotype {
  speciesId: string;
  parts: Creature3DPart[];
  primaryColor: string;
  secondaryColor: string;
  glowColor?: string;
  boundingRadius: number;
}

export class CreatureMeshEngine {
  private static phenotypeCache: Map<string, Creature3DPhenotype> = new Map();

  // Generate 3D dimensional phenotype parts based on actual genetic traits
  public static generatePhenotype(species: Species): Creature3DPhenotype {
    const key = `${species.id}_${species.genome.bodySizeMeters}_${species.genome.locomotion}_${species.genome.manipulationOrgan}_${species.colorHex}`;
    if (this.phenotypeCache.has(key)) {
      return this.phenotypeCache.get(key)!;
    }

    const parts: Creature3DPart[] = [];
    const g = species.genome;
    const color = species.colorHex;
    const isWater = species.trophicLevel === 'PRODUCER' || species.morphology === 'PISCINE' || species.morphology === 'AUTOTROPH_ALGAE';

    // 1. Torso / Core Body (Dimensional segmentation)
    const torsoSegments = g.bodySizeMeters > 3 ? 3 : (species.morphology === 'INVERTEBRATE_ARTHROPOD' ? 4 : 2);
    for (let i = 0; i < torsoSegments; i++) {
      const zOffset = (i - torsoSegments / 2) * 8;
      const taper = 1.0 - Math.abs(i - torsoSegments / 2) * 0.25;
      parts.push({
        type: 'TORSO',
        x: 0,
        y: 0,
        z: zOffset,
        sizeX: 10 * taper,
        sizeY: 8 * taper,
        sizeZ: 10 * taper,
        color: color,
        shape: species.morphology === 'INVERTEBRATE_ARTHROPOD' ? 'SEGMENTED_BOX' : 'ELLIPSOID'
      });
    }

    // 2. Head & Sensory Organs
    parts.push({
      type: 'HEAD',
      x: 0,
      y: -4,
      z: -(torsoSegments / 2 + 0.8) * 8,
      sizeX: 7,
      sizeY: 6,
      sizeZ: 7,
      color: color,
      shape: 'ELLIPSOID'
    });

    // Eyes / Sensory Modality
    const eyeColor = g.sensoryModality === 'OPTIC' ? '#38bdf8' : (g.sensoryModality === 'THERMAL' ? '#f43f5e' : '#fde047');
    parts.push({
      type: 'EYE',
      x: -4,
      y: -6,
      z: -(torsoSegments / 2 + 0.8) * 8,
      sizeX: 2,
      sizeY: 2,
      sizeZ: 2,
      color: eyeColor,
      shape: 'ELLIPSOID'
    });
    parts.push({
      type: 'EYE',
      x: 4,
      y: -6,
      z: -(torsoSegments / 2 + 0.8) * 8,
      sizeX: 2,
      sizeY: 2,
      sizeZ: 2,
      color: eyeColor,
      shape: 'ELLIPSOID'
    });

    // 3. Limbs & Locomotion
    if (g.locomotion === 'QUADRUPEDAL' || g.locomotion === 'CRAWLING') {
      const pairCount = g.locomotion === 'QUADRUPEDAL' ? 2 : 3;
      for (let p = 0; p < pairCount; p++) {
        const limbZ = (p - (pairCount - 1) / 2) * 9;
        // Left limb
        parts.push({
          type: 'LIMB',
          x: -12,
          y: 8,
          z: limbZ,
          sizeX: 3,
          sizeY: 10,
          sizeZ: 3,
          color: color,
          shape: 'CYLINDER'
        });
        // Right limb
        parts.push({
          type: 'LIMB',
          x: 12,
          y: 8,
          z: limbZ,
          sizeX: 3,
          sizeY: 10,
          sizeZ: 3,
          color: color,
          shape: 'CYLINDER'
        });
      }
    } else if (g.locomotion === 'BIPEDAL') {
      parts.push({
        type: 'LIMB',
        x: -5,
        y: 12,
        z: 2,
        sizeX: 3.5,
        sizeY: 14,
        sizeZ: 3.5,
        color: color,
        shape: 'CYLINDER'
      });
      parts.push({
        type: 'LIMB',
        x: 5,
        y: 12,
        z: 2,
        sizeX: 3.5,
        sizeY: 14,
        sizeZ: 3.5,
        color: color,
        shape: 'CYLINDER'
      });
    } else if (g.locomotion === 'WINGED_FLIGHT' || g.locomotion === 'GLIDING') {
      // Wings
      parts.push({
        type: 'WING',
        x: -18,
        y: -4,
        z: -2,
        sizeX: 18,
        sizeY: 2,
        sizeZ: 8,
        color: color,
        shape: 'CRESCENT'
      });
      parts.push({
        type: 'WING',
        x: 18,
        y: -4,
        z: -2,
        sizeX: 18,
        sizeY: 2,
        sizeZ: 8,
        color: color,
        shape: 'CRESCENT'
      });
    } else if (g.locomotion === 'SWIMMING') {
      // Dorsal & Caudal Fins
      parts.push({
        type: 'FIN',
        x: 0,
        y: -8,
        z: 0,
        sizeX: 2,
        sizeY: 8,
        sizeZ: 6,
        color: color,
        shape: 'CONE'
      });
      parts.push({
        type: 'FIN',
        x: 0,
        y: 0,
        z: (torsoSegments / 2 + 1) * 8,
        sizeX: 2,
        sizeY: 10,
        sizeZ: 8,
        color: color,
        shape: 'CRESCENT'
      });
    }

    // 4. Manipulation Organs (Opposable thumbs, tentacles, prehensile trunks)
    if (g.manipulationOrgan === 'OPPOSABLE_DIGITS') {
      parts.push({
        type: 'LIMB',
        x: -8,
        y: 0,
        z: -(torsoSegments / 2) * 8,
        sizeX: 2,
        sizeY: 8,
        sizeZ: 2,
        color: color,
        shape: 'CYLINDER'
      });
      parts.push({
        type: 'LIMB',
        x: 8,
        y: 0,
        z: -(torsoSegments / 2) * 8,
        sizeX: 2,
        sizeY: 8,
        sizeZ: 2,
        color: color,
        shape: 'CYLINDER'
      });
    }

    // 5. Bioluminescent or Arcane Glow
    const glowColor = species.isSapient ? '#38bdf8' : (g.cognition > 50 ? '#a855f7' : undefined);
    if (glowColor) {
      parts.push({
        type: 'BIOLUM',
        x: 0,
        y: -6,
        z: -(torsoSegments / 2 + 0.8) * 8,
        sizeX: 3,
        sizeY: 3,
        sizeZ: 3,
        color: glowColor,
        shape: 'ELLIPSOID'
      });
    }

    const phenotype: Creature3DPhenotype = {
      speciesId: species.id,
      parts,
      primaryColor: color,
      secondaryColor: '#0f172a',
      glowColor,
      boundingRadius: 25
    };

    this.phenotypeCache.set(key, phenotype);
    return phenotype;
  }

  // Render 3D creature model with interactive pitch/yaw rotation on Canvas
  public static renderCreature3D(
    ctx: CanvasRenderingContext2D,
    species: Species,
    centerX: number,
    centerY: number,
    scale: number = 1.0,
    rotX: number = 0.3,
    rotY: number = 0.6
  ) {
    const phenotype = this.generatePhenotype(species);
    const cosY = Math.cos(rotY);
    const sinY = Math.sin(rotY);
    const cosX = Math.cos(rotX);
    const sinX = Math.sin(rotX);

    // Transform parts and sort back-to-front (Z-sorting for 3D depth)
    const transformed = phenotype.parts.map(part => {
      // Yaw rotation
      const x1 = part.x * cosY + part.z * sinY;
      const z1 = -part.x * sinY + part.z * cosY;
      // Pitch rotation
      const y2 = part.y * cosX - z1 * sinX;
      const z2 = part.y * sinX + z1 * cosX;

      return {
        part,
        screenX: centerX + x1 * scale,
        screenY: centerY + y2 * scale,
        depth: z2,
        radX: Math.max(1.5, part.sizeX * scale),
        radY: Math.max(1.5, part.sizeY * scale)
      };
    });

    transformed.sort((a, b) => a.depth - b.depth);

    // Render sorted 3D primitives
    for (const item of transformed) {
      const p = item.part;
      ctx.fillStyle = p.color;
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 1;

      // Directional light shading approximation
      const shade = Math.max(0.3, Math.min(1.0, 0.7 + (item.depth / 40) * 0.3));
      ctx.globalAlpha = 0.95;

      ctx.beginPath();
      if (p.shape === 'ELLIPSOID' || p.shape === 'CYLINDER') {
        ctx.ellipse(item.screenX, item.screenY, item.radX, item.radY, 0, 0, Math.PI * 2);
      } else if (p.shape === 'SEGMENTED_BOX') {
        ctx.rect(item.screenX - item.radX, item.screenY - item.radY, item.radX * 2, item.radY * 2);
      } else if (p.shape === 'CRESCENT' || p.shape === 'CONE') {
        ctx.arc(item.screenX, item.screenY, item.radX, 0, Math.PI);
      }
      ctx.fill();
      ctx.stroke();

      // Bioluminescent / Magic Glow halo
      if (p.type === 'BIOLUM') {
        ctx.fillStyle = phenotype.glowColor || '#38bdf8';
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.arc(item.screenX, item.screenY, item.radX * 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }
    }
  }
}
