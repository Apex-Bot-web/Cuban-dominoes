import { describe, expect, it } from 'vitest';
import type { HandState, Tile } from '../src/types.js';
import { DEFAULT_CONFIG } from '../src/types.js';
import { applyPass, applyPlay } from '../src/hand.js';

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

describe('dominó scoring', () => {
  it('winner team scores the sum of opponents\u2019 remaining pips (standard)', () => {
    // Seat 0 plays its last tile. Opponents are seats 1 & 3.
    const h = fixture({
      hands: [
        [[4, 9]],          // seat 0 (team 0) — about to dominó
        [[9, 9], [1, 2]],  // seat 1 (team 1) — 21 pips
        [[5, 5]],          // seat 2 (team 0, partner) — 10 pips, NOT counted
        [[0, 3]],          // seat 3 (team 1) — 3 pips
      ],
      board: [[7, 4]],
      turn: 0,
    });
    const r = applyPlay(h, { type: 'play', seat: 0, tile: [4, 9], side: 'right' }, DEFAULT_CONFIG);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.hand.result).toMatchObject({
      type: 'domino',
      winnerSeat: 0,
      winnerTeam: 0,
      points: 24, // 21 + 3
    });
  });

  it('scorePips "all" also collects the partner\u2019s pips', () => {
    const h = fixture({
      hands: [[[4, 9]], [[9, 9], [1, 2]], [[5, 5]], [[0, 3]]],
      board: [[7, 4]],
      turn: 0,
    });
    const r = applyPlay(
      h,
      { type: 'play', seat: 0, tile: [4, 9], side: 'right' },
      { ...DEFAULT_CONFIG, scorePips: 'all' },
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.hand.result).toMatchObject({ type: 'domino', points: 34 }); // 24 + 10
  });
});

describe('tranque scoring', () => {
  /** Board [4|7], nobody holds a 4 or 7 => four straight passes block the game. */
  function blockedFixture(hands: Tile[][]): HandState {
    return fixture({ hands, board: [[4, 7]], turn: 0 });
  }

  function runFourPasses(h: HandState, config = DEFAULT_CONFIG): HandState {
    let state = h;
    for (const seat of [0, 1, 2, 3] as const) {
      const r = applyPass(state, seat, config);
      expect(r.ok).toBe(true);
      if (r.ok) state = r.hand;
    }
    return state;
  }

  it('four consecutive passes => tranque; lower-pip team scores opponents\u2019 pips', () => {
    const h = blockedFixture([
      [[1, 1]], // team 0: 2
      [[9, 9]], // team 1: 18
      [[2, 3]], // team 0: +5 => 7
      [[8, 9]], // team 1: +17 => 35
    ]);
    const done = runFourPasses(h);
    expect(done.result).toMatchObject({
      type: 'tranque',
      winnerTeam: 0,
      points: 35,
      teamPips: [7, 35],
      tie: false,
    });
  });

  it('tied tranque with "no-score": nobody scores', () => {
    const h = blockedFixture([
      [[1, 1]], // team 0: 2
      [[2, 0]], // team 1: 2
      [[5, 5]], // team 0: +10 => 12
      [[1, 9]], // team 1: +10 => 12
    ]);
    const done = runFourPasses(h);
    expect(done.result).toMatchObject({ type: 'tranque', points: 0, tie: true });
    expect(done.result && 'winnerTeam' in done.result ? done.result.winnerTeam : undefined)
      .toBeUndefined();
  });

  it('tied tranque with "closer-loses": the closing player\u2019s team loses', () => {
    const h = blockedFixture([
      [[1, 1]],
      [[2, 0]],
      [[5, 5]],
      [[1, 9]],
    ]);
    // Seat 3 makes the 4th pass => seat 3 "closed" => team 1 loses the tie.
    const done = runFourPasses(h, { ...DEFAULT_CONFIG, tieTranque: 'closer-loses' });
    expect(done.result).toMatchObject({
      type: 'tranque',
      winnerTeam: 0,
      points: 12,
      tie: true,
    });
  });

  it('a hand cannot end in tranque while someone still plays in the cycle', () => {
    // Seats 0,1,2 pass; seat 3 can play => counter resets, no tranque.
    const h = blockedFixture([
      [[1, 1]],
      [[2, 0]],
      [[5, 5]],
      [[7, 9], [1, 9]],
    ]);
    let state = h;
    for (const seat of [0, 1, 2] as const) {
      const r = applyPass(state, seat, DEFAULT_CONFIG);
      if (r.ok) state = r.hand;
    }
    expect(state.consecutivePasses).toBe(3);
    const r = applyPlay(state, { type: 'play', seat: 3, tile: [7, 9], side: 'right' }, DEFAULT_CONFIG);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.hand.result).toBeUndefined();
      expect(r.hand.consecutivePasses).toBe(0);
    }
  });
});
