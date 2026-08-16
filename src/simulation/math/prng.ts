// Deterministic seeded Pseudo-Random Number Generator (Mulberry32 & SplitMix32)

export class PRNG {
  private s: number;

  constructor(seed: number | string) {
    if (typeof seed === 'string') {
      this.s = PRNG.hashString(seed);
    } else {
      this.s = (seed | 0) || 123456789;
    }
  }

  // Hash string into 32-bit integer
  public static hashString(str: string): number {
    let hash = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      hash = Math.imul(hash ^ str.charCodeAt(i), 3432918353);
      hash = (hash << 13) | (hash >>> 19);
    }
    return hash >>> 0;
  }

  // Generate uniform float [0, 1)
  public next(): number {
    let t = (this.s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Float in range [min, max)
  public float(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  // Integer in range [min, max] inclusive
  public int(min: number, max: number): number {
    return Math.floor(min + this.next() * (max - min + 1));
  }

  // Boolean with given probability of true
  public bool(prob: number = 0.5): boolean {
    return this.next() < prob;
  }

  // Standard normal distribution (Box-Muller transform)
  public gaussian(mean: number = 0, stdDev: number = 1): number {
    let u1 = this.next();
    let u2 = this.next();
    while (u1 <= 1e-15) u1 = this.next(); // avoid log(0)
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return mean + z0 * stdDev;
  }

  // Pick random element from array
  public choice<T>(array: T[]): T {
    if (!array || array.length === 0) return undefined as any;
    return array[this.int(0, array.length - 1)];
  }

  // Pick with weights
  public weightedChoice<T>(items: T[], weights: number[]): T {
    let total = 0;
    for (let i = 0; i < weights.length; i++) {
      total += weights[i];
    }
    let r = this.next() * total;
    for (let i = 0; i < items.length; i++) {
      if (r < weights[i]) return items[i];
      r -= weights[i];
    }
    return items[items.length - 1];
  }

  // Shuffle array in-place
  public shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      const temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }
    return array;
  }

  // Clone current PRNG state
  public clone(): PRNG {
    const p = new PRNG(1);
    p.s = this.s;
    return p;
  }
}
