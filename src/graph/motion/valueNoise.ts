import { hashStringToIndex } from '../../manifest/colorHash';

/**
 * Deterministic, continuous 1D "value noise" — smooth interpolated
 * pseudo-randomness, not a sine wave. A sine has an exact, audible period;
 * this doesn't: it's a hash-seeded random value at every integer lattice
 * point, cosine-interpolated between them, so it never exactly repeats
 * within any observation window a user could plausibly sit through (the
 * effective period is the lattice hash's own cycle length, not something
 * perceptible). This is the same technique real value-noise/Perlin-style
 * generators use, minus gradient interpolation (unnecessary for a 1D
 * ambient-drift signal). Two independent instances (one per axis,
 * distinctly seeded) give a node's 2D drift — see `useGraphSimulation.ts`.
 *
 * `hashStringToIndex` (this codebase's existing string-hash convention,
 * also used by the Layout Engine's own jitter) is deliberately used only
 * ONCE here, to turn `seed` into a single numeric base — it's a weak
 * multiplicative hash, and calling it directly per lattice point (e.g.
 * hashing `"${seed}:${lattice}"` as a string) was tried and measured to
 * produce near-identical output for adjacent integers, since the string
 * differs only in its last character/digit and the hash barely moves in
 * response. `mixInt` below is a proper avalanche integer hash (the
 * standard 32-bit `fmix` finalizer, as used in MurmurHash3) applied to
 * the *combination* of the seed base and the lattice index — adjacent
 * lattice points hash to fully decorrelated values, which is what makes
 * the interpolated noise actually vary rather than sitting frozen.
 */

function mixInt(x: number): number {
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x = x ^ (x >>> 16);
  return x >>> 0;
}

function latticeValue(seedBase: number, lattice: number): number {
  const mixed = mixInt((seedBase ^ Math.imul(lattice + 1, 0x9e3779b1)) >>> 0);
  return (mixed % 1_000_000) / 1_000_000 * 2 - 1;
}

function smooth(t: number): number {
  // Cosine easing between lattice points — C1-continuous (no visible
  // "kinks" at integer boundaries) without needing gradient vectors.
  return (1 - Math.cos(t * Math.PI)) / 2;
}

/**
 * Returns a function `(t) => value in [-1, 1]` — continuous, smooth, and
 * fully determined by `seed`. `t` is expected to advance slowly (see
 * `NOISE_TIME_SCALE` in `useGraphSimulation.ts`) since one full lattice
 * step spans `t=1`.
 */
export function createNoise1D(seed: string): (t: number) => number {
  const seedBase = hashStringToIndex(seed, 0x7fffffff);
  return (t: number) => {
    const lattice = Math.floor(t);
    const frac = t - lattice;
    const a = latticeValue(seedBase, lattice);
    const b = latticeValue(seedBase, lattice + 1);
    return a + (b - a) * smooth(frac);
  };
}
