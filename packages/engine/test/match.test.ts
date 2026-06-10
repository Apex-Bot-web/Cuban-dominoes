import { describe, expect, it } from 'vitest';
import { applyAction, createMatch, startNextHand } from '../src/match.js';
import { botAction, type BotLevel } from '../src/bots.js';
import { sameTile } from '../src/tiles.js';
import type { MatchState, Seat } from '../src/types.js';

describe('match creation', () => {
  it('first lead goes to the double-9 holder when dealt', () => {
    // Scan seeds to find one where the 9-9 was dealt, then assert the salida.
    for (let seed = 1; seed < 50; seed++) {
      const m = createMatch({}, seed);
      const holder = ([0, 1, 2, 3] as Seat[]).find((s) =>
        m.hand.hands[s]!.some((t) => sameTile(t, [9, 9])),
      );
      if (holder !== undefined) {
        expect(m.hand.salida).toBe(holder);
        expect(m.hand.turn).toBe(holder);
        return;
      }
    }
    throw new Error('no seed in range dealt the 9-9 (statistically impossible)');
  });

  it('same seed reproduces the identical match', () => {
    const a = createMatch({}, 777);
    const b = createMatch({}, 777);
    expect(a.hand.hands).toEqual(b.hand.hands);
    expect(a.hand.salida).toBe(b.hand.salida);
  });

  it('cannot start the next hand while one is in progress', () => {
    const m = createMatch({}, 5);
    const r = startNextHand(m);
    expect(r.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Full-match simulation: the integration test that exercises everything.
// ---------------------------------------------------------------------------

function playFullMatch(seed: number, levels: BotLevel[]): MatchState {
  let match = createMatch({}, seed);
  let safety = 100_000;

  while (match.winnerTeam === undefined && safety-- > 0) {
    if (match.hand.result) {
      const r = startNextHand(match);
      if (!r.ok) throw new Error(`startNextHand failed: ${r.error}`);
      match = r.match;
      continue;
    }
    const seat = match.hand.turn;
    const action = botAction(match.hand, seat, levels[seat]!, seed);
    const r = applyAction(match, action);
    if (!r.ok) throw new Error(`bot produced illegal action at seat ${seat}: ${r.error}`);
    match = r.match;
  }
  if (safety <= 0) throw new Error('match did not terminate');
  return match;
}

describe('full bot matches', () => {
  it('100 random-seed matches all terminate legally with a winner at >= target', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const m = playFullMatch(seed, ['medio', 'medio', 'medio', 'medio']);
      expect(m.winnerTeam).toBeDefined();
      expect(Math.max(m.teamScores[0], m.teamScores[1])).toBeGreaterThanOrEqual(
        m.config.targetScore,
      );
      expect(Math.min(m.teamScores[0], m.teamScores[1])).toBeLessThan(m.config.targetScore);
    }
  });

  it('mixed bot levels also complete cleanly (facil/medio/duro interop)', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const m = playFullMatch(seed, ['duro', 'facil', 'duro', 'medio']);
      expect(m.winnerTeam).toBeDefined();
    }
  });

  it('duro bots beat facil bots over a sample (sanity check, not a proof)', () => {
    let duroWins = 0;
    const games = 60;
    for (let seed = 1; seed <= games; seed++) {
      // Team 0 = duro, team 1 = facil.
      const m = playFullMatch(seed * 31 + 7, ['duro', 'facil', 'duro', 'facil']);
      if (m.winnerTeam === 0) duroWins++;
    }
    // Dominoes has heavy luck variance; demand a clear majority, not domination.
    expect(duroWins).toBeGreaterThan(games / 2);
  });

  it('match scores only ever increase and hands are sequential', () => {
    let match = createMatch({}, 999);
    let prev: [number, number] = [0, 0];
    let prevHand = 1;
    let safety = 100_000;
    while (match.winnerTeam === undefined && safety-- > 0) {
      if (match.hand.result) {
        const r = startNextHand(match);
        if (!r.ok) break;
        match = r.match;
        expect(match.handNumber).toBe(prevHand + 1);
        prevHand = match.handNumber;
        continue;
      }
      const r = applyAction(match, botAction(match.hand, match.hand.turn, 'medio'));
      if (!r.ok) throw new Error(r.error);
      match = r.match;
      expect(match.teamScores[0]).toBeGreaterThanOrEqual(prev[0]);
      expect(match.teamScores[1]).toBeGreaterThanOrEqual(prev[1]);
      prev = [match.teamScores[0], match.teamScores[1]];
    }
    expect(match.winnerTeam).toBeDefined();
  });
});
