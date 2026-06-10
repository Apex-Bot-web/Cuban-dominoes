import { describe, expect, it } from 'vitest';
import type { HandState, Tile } from '../src/types.js';
import { DEFAULT_CONFIG } from '../src/types.js';
import { applyPass, applyPlay, boardEnds, legalMoves } from '../src/hand.js';

/** Build a hand state by fiat for surgical tests. */
function fixture(partial: Partial<HandState> & { hands: Tile[][] }): HandState {
  return {
    board: [],
    sleeping: [],
    turn: 0,
    consecutivePasses: 0,
    passHistory: [],
    salida: 0,
    ...partial,
  };
}

describe('legal moves', () => {
  it('opening move: every tile in hand is legal', () => {
    const h = fixture({ hands: [[[1, 2], [9, 9], [0, 5]], [], [], []] });
    expect(legalMoves(h, 0)).toHaveLength(3);
  });

  it('matches either open end, both sides counted separately', () => {
    // Board: [3|5] => ends 3 (left) and 5 (right)
    const h = fixture({
      hands: [[[3, 5], [5, 9], [2, 2]], [], [], []],
      board: [[3, 5]],
    });
    const moves = legalMoves(h, 0);
    // [3,5] fits left (3) and right (5) = 2 moves; [5,9] fits right only = 1; [2,2] none.
    expect(moves).toHaveLength(3);
    expect(moves.filter((m) => m.side === 'left')).toHaveLength(1);
    expect(moves.filter((m) => m.side === 'right')).toHaveLength(2);
  });
});

describe('applyPlay', () => {
  it('rejects out-of-turn plays', () => {
    const h = fixture({ hands: [[[1, 1]], [[2, 2]], [], []], turn: 0 });
    const r = applyPlay(h, { type: 'play', seat: 1, tile: [2, 2] }, DEFAULT_CONFIG);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('not-your-turn');
  });

  it('rejects tiles not in hand', () => {
    const h = fixture({ hands: [[[1, 1]], [], [], []] });
    const r = applyPlay(h, { type: 'play', seat: 0, tile: [9, 9] }, DEFAULT_CONFIG);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('tile-not-in-hand');
  });

  it('rejects tiles that fit neither end', () => {
    const h = fixture({ hands: [[[1, 1]], [], [], []], board: [[4, 7]] });
    const r = applyPlay(h, { type: 'play', seat: 0, tile: [1, 1], side: 'right' }, DEFAULT_CONFIG);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('tile-does-not-fit');
  });

  it('orients tiles correctly on both ends and keeps the chain valid', () => {
    // Board [4|7]. Play [7,2] right => [4|7][7|2]. Play [4,4] left => [4|4][4|7][7|2].
    let h = fixture({
      hands: [[[2, 7], [8, 8]], [[4, 4], [9, 8]], [], []],
      board: [[4, 7]],
      turn: 0,
    });
    let r = applyPlay(h, { type: 'play', seat: 0, tile: [2, 7], side: 'right' }, DEFAULT_CONFIG);
    expect(r.ok).toBe(true);
    if (r.ok) h = r.hand;
    expect(h.board).toEqual([[4, 7], [7, 2]]);
    expect(boardEnds(h)).toEqual([4, 2]);

    r = applyPlay(h, { type: 'play', seat: 1, tile: [4, 4], side: 'left' }, DEFAULT_CONFIG);
    expect(r.ok).toBe(true);
    if (r.ok) h = r.hand;
    expect(h.board).toEqual([[4, 4], [4, 7], [7, 2]]);
    expect(boardEnds(h)).toEqual([4, 2]);
    // Chain invariant: adjacent tiles touch with equal pips.
    for (let i = 0; i < h.board.length - 1; i++) {
      expect(h.board[i]![1]).toBe(h.board[i + 1]![0]);
    }
  });

  it('infers the side when unambiguous, demands it when ambiguous', () => {
    // Board [4|7]: [7,2] only fits right => side optional.
    const h1 = fixture({ hands: [[[7, 2]], [], [], []], board: [[4, 7]] });
    const r1 = applyPlay(h1, { type: 'play', seat: 0, tile: [7, 2] }, DEFAULT_CONFIG);
    expect(r1.ok).toBe(true);

    // Board [4|7]: [4,7] fits both ends => side required.
    const h2 = fixture({ hands: [[[4, 7]], [], [], []], board: [[4, 7]] });
    const r2 = applyPlay(h2, { type: 'play', seat: 0, tile: [4, 7] }, DEFAULT_CONFIG);
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.error).toBe('side-required');
  });

  it('does not mutate the input state (pure)', () => {
    const h = fixture({ hands: [[[1, 1], [2, 3]], [], [], []] });
    const before = JSON.stringify(h);
    applyPlay(h, { type: 'play', seat: 0, tile: [1, 1] }, DEFAULT_CONFIG);
    expect(JSON.stringify(h)).toBe(before);
  });

  it('advances turn 0 -> 1 -> 2 -> 3 -> 0', () => {
    let h = fixture({
      hands: [[[1, 1], [9, 8]], [[1, 2], [0, 0]], [[2, 3], [0, 1]], [[3, 4], [0, 2]]],
    });
    const plays: Array<{ seat: 0 | 1 | 2 | 3; tile: Tile; side?: 'left' | 'right' }> = [
      { seat: 0, tile: [1, 1] },
      { seat: 1, tile: [1, 2], side: 'right' }, // board [1|1]: both ends are 1 — side required
      { seat: 2, tile: [2, 3], side: 'right' },
      { seat: 3, tile: [3, 4], side: 'right' },
    ];
    for (const p of plays) {
      expect(h.turn).toBe(p.seat);
      const r = applyPlay(h, { type: 'play', ...p }, DEFAULT_CONFIG);
      expect(r.ok).toBe(true);
      if (r.ok) h = r.hand;
    }
    expect(h.turn).toBe(0);
  });
});

describe('applyPass', () => {
  it('rejects a pass when a legal move exists (no sandbagging)', () => {
    const h = fixture({ hands: [[[4, 9]], [], [], []], board: [[4, 7]] });
    const r = applyPass(h, 0, DEFAULT_CONFIG);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('pass-with-legal-move');
  });

  it('accepts a forced pass and records it with the open ends', () => {
    const h = fixture({ hands: [[[1, 1]], [[4, 9]], [], []], board: [[4, 7]] });
    const r = applyPass(h, 0, DEFAULT_CONFIG);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.hand.passHistory).toEqual([{ seat: 0, ends: [4, 7] }]);
      expect(r.hand.turn).toBe(1);
      expect(r.hand.consecutivePasses).toBe(1);
    }
  });

  it('a play resets the consecutive pass counter', () => {
    let h = fixture({
      hands: [[[1, 1]], [[7, 9]], [], []],
      board: [[4, 7]],
      turn: 0,
    });
    let r = applyPass(h, 0, DEFAULT_CONFIG);
    if (r.ok) h = r.hand;
    expect(h.consecutivePasses).toBe(1);
    r = applyPlay(h, { type: 'play', seat: 1, tile: [7, 9], side: 'right' }, DEFAULT_CONFIG);
    expect(r.ok).toBe(true);
    if (r.ok) h = r.hand;
    expect(h.consecutivePasses).toBe(0);
  });
});
