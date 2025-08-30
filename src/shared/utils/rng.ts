// src/shared/utils/rng.ts
export interface RandomSource {
  next(): number; // [0, 1)
  getSeed(): number;
  setSeed(seed: number): void;
}

/** Deterministic LCG in [0,1) */
export class LcgRng implements RandomSource {
  private state: number;
  constructor(seed: number) {
    this.state = seed >>> 0;
  }
  next(): number {
    this.state = (this.state * 1664525 + 1013904223) >>> 0;
    return this.state / 0x100000000;
  }
  getSeed(): number {
    return this.state >>> 0;
  }
  setSeed(seed: number): void {
    this.state = seed >>> 0;
  }
  static make(seed: number): () => number {
    const inst = new LcgRng(seed);
    return () => inst.next();
  }
}

/**
 * Utility to derive a seed from arbitrary inputs.
 * E.g. combine table size, ball radius, or even Date.now().
 */
export function deriveSeed(...parts: number[]): number {
  // simple xor-fold of all inputs into a 32-bit int
  let seed = 0xc0ffee;
  for (const p of parts) {
    seed ^= (p * 1000) | 0;
    seed = (seed >>> 0) ^ ((seed << 13) | (seed >>> 19));
  }
  return seed >>> 0;
}

/** Quick "random" seed using time + Math.random (non-deterministic). */
export function randomSeed(): number {
  return (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
}
