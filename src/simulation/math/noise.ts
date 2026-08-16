// Deterministic 2D Simplex Noise & Cellular Voronoi Distance

import { PRNG } from './prng';

export class SimplexNoise {
  private perm: Uint8Array = new Uint8Array(512);
  private permMod12: Uint8Array = new Uint8Array(512);

  // Gradients for 2D
  private static readonly GRAD3: number[][] = [
    [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
    [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
    [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
  ];

  constructor(prng: PRNG) {
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      p[i] = i;
    }
    // Seeded shuffle
    for (let i = 255; i > 0; i--) {
      const r = prng.int(0, i);
      const temp = p[i];
      p[i] = p[r];
      p[r] = temp;
    }
    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
      this.permMod12[i] = this.perm[i] % 12;
    }
  }

  // 2D Simplex Noise in range [-1, 1]
  public noise2D(xin: number, yin: number): number {
    const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
    const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;

    let n0 = 0, n1 = 0, n2 = 0;

    // Skew input space
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const X0 = i - t; // Unskew cell origin
    const Y0 = j - t;
    const x0 = xin - X0; // Distances from cell origin
    const y0 = yin - Y0;

    // Determine which simplex triangle we are in
    let i1 = 0, j1 = 0;
    if (x0 > y0) {
      i1 = 1;
      j1 = 0;
    } else {
      i1 = 0;
      j1 = 1;
    }

    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1.0 + 2.0 * G2;
    const y2 = y0 - 1.0 + 2.0 * G2;

    const ii = i & 255;
    const jj = j & 255;
    const gi0 = this.permMod12[ii + this.perm[jj]];
    const gi1 = this.permMod12[ii + i1 + this.perm[jj + j1]];
    const gi2 = this.permMod12[ii + 1 + this.perm[jj + 1]];

    // Contribution from first corner
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) {
      t0 *= t0;
      n0 = t0 * t0 * (SimplexNoise.GRAD3[gi0][0] * x0 + SimplexNoise.GRAD3[gi0][1] * y0);
    }

    // Contribution from second corner
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) {
      t1 *= t1;
      n1 = t1 * t1 * (SimplexNoise.GRAD3[gi1][0] * x1 + SimplexNoise.GRAD3[gi1][1] * y1);
    }

    // Contribution from third corner
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) {
      t2 *= t2;
      n2 = t2 * t2 * (SimplexNoise.GRAD3[gi2][0] * x2 + SimplexNoise.GRAD3[gi2][1] * y2);
    }

    // Scale to range [-1, 1]
    return 70.0 * (n0 + n1 + n2);
  }

  // Fractal Brownian Motion (fBm) multi-octave noise
  public fbm(x: number, y: number, octaves: number = 5, persistence: number = 0.5, lacunarity: number = 2.0): number {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      total += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    return total / maxValue;
  }

  // Rigid multifractal noise (ideal for sharp mountain ridges)
  public ridgeNoise(x: number, y: number, octaves: number = 4): number {
    let sum = 0;
    let amp = 1.0;
    let freq = 1.0;
    let weight = 1.0;

    for (let i = 0; i < octaves; i++) {
      let val = 1.0 - Math.abs(this.noise2D(x * freq, y * freq));
      val *= val;
      val *= weight;
      weight = Math.max(0, Math.min(1, val * 2.0));
      sum += val * amp;
      amp *= 0.5;
      freq *= 2.0;
    }
    return sum;
  }
}
