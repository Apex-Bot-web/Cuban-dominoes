import { describe, expect, it } from 'vitest';
import { fullSet, pipSum, sameTile, handPips } from '../src/tiles.js';
import { deal } from '../src/hand.js';
import { DEFAULT_CONFIG } from '../src/types.js';

describe('tile set', () => {
  it('double-9 set has exactly 55 tiles', () => {
    expect(fullSet(9)).toHaveLength(55);
  });

  it('double-6 set has exactly 28 tiles (config sanity)', () => {
    expect(fullSet(6)).toHaveLength(28);
  });

  it('set contains no duplicates (order-insensitive)', () => {
    const tiles = fullSet(9);
    for (let i = 0; i < tiles.length; i++) {
      for (let j = i + 1; j < tiles.length; j++) {
        expect(sameTile(tiles[i]!, tiles[j]!)).toBe(false);
      }
    }
  });

  it('total pips of double-9 set = 495', () => {
    // Each number 0..9 appears in 10 tiles => sum = 10 * (0+1+...+9) ... computed directly:
    const total = fullSet(9).reduce((s, t) => s + pipSum(t), 0);
    expect(total).toBe(495);
  });

  it('sameTile is order-insensitive', () => {
    expect(sameTile([3, 7], [7, 3])).toBe(true);
    expect(sameTile([3, 7], [3, 6])).toBe(false);
  });
});

describe('dealing', () => {
  it('deals 10 tiles to each of 4 players, 15 sleep', () => {
    const { hands, sleeping } = deal(DEFAULT_CONFIG, 42);
    expect(hands).toHaveLength(4);
    for (const h of hands) expect(h).toHaveLength(10);
    expect(sleeping).toHaveLength(15);
  });

  it('dealt + sleeping tiles reconstruct the full set with no duplicates', () => {
    const { hands, sleeping } = deal(DEFAULT_CONFIG, 7);
    const all = [...hands.flat(), ...sleeping];
    expect(all).toHaveLength(55);
    const totalPips = all.reduce((s, t) => s + pipSum(t), 0);
    expect(totalPips).toBe(495);
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        expect(sameTile(all[i]!, all[j]!)).toBe(false);
      }
    }
  });

  it('same seed => identical deal; different seed => different deal', () => {
    const a = deal(DEFAULT_CONFIG, 123);
    const b = deal(DEFAULT_CONFIG, 123);
    const c = deal(DEFAULT_CONFIG, 124);
    expect(a.hands).toEqual(b.hands);
    expect(a.hands).not.toEqual(c.hands);
  });

  it('handPips sums correctly', () => {
    expect(handPips([[9, 9], [0, 1]])).toBe(19);
    expect(handPips([])).toBe(0);
  });
});
