/**
 * Mulberry32 — tiny, fast, seedable PRNG.
 * Deterministic shuffles make every game replayable from (seed, action log),
 * which is gold for bug reports, anti-cheat audits, and tests.
 */

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Advance a numeric rng state once; returns [randomFloat, newState]. */
export function nextRandom(state: number): [number, number] {
  let a = state >>> 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return [value, a >>> 0];
}

/** Fisher–Yates shuffle driven by an explicit rng state. Returns new state. */
export function shuffleInPlace<T>(arr: T[], rngState: number): number {
  let state = rngState;
  for (let i = arr.length - 1; i > 0; i--) {
    let value: number;
    [value, state] = nextRandom(state);
    const j = Math.floor(value * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return state;
}
