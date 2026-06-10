import { describe, expect, it } from 'vitest';
import { createMatch, applyAction } from '../src/match.js';
import { playerView } from '../src/view.js';
import { botAction } from '../src/bots.js';
import type { Seat } from '../src/types.js';

/**
 * Anti-leak audit — the security contract the server relies on.
 *
 * Public-at-the-table info (board, open ends, pass history, tile counts,
 * scores) is allowed in a view. Concealed info (other hands, sleeping tiles)
 * must be absent. We enforce this two ways:
 *   1. A strict key whitelist, so a future field can't slip in unnoticed.
 *   2. A JSON scan of the view minus its legitimately tile-shaped public
 *      fields, so nothing tile-like hides in new/scalar fields.
 */
describe('playerView information hiding', () => {
  const WHITELIST = [
    'seat',
    'myHand',
    'board',
    'openEnds',
    'tileCounts',
    'sleepingCount',
    'turn',
    'salida',
    'passHistory',
    'teamScores',
    'handNumber',
    'targetScore',
    'result',
    'matchWinnerTeam',
  ].sort();

  it('views expose only whitelisted fields and conceal hidden tiles', () => {
    let match = createMatch({}, 4242);

    // Advance 12 plies so there's real state to leak.
    for (let i = 0; i < 12 && !match.hand.result; i++) {
      const r = applyAction(match, botAction(match.hand, match.hand.turn, 'medio'));
      if (!r.ok) throw new Error(r.error);
      match = r.match;
    }

    for (const seat of [0, 1, 2, 3] as Seat[]) {
      const view = playerView(match, seat);

      // 1. No surprise fields — in particular never `hands` or `sleeping`.
      for (const key of Object.keys(view)) {
        expect(WHITELIST).toContain(key);
      }
      expect(view).not.toHaveProperty('hands');
      expect(view).not.toHaveProperty('sleeping');

      // 2. Strip the fields that legitimately contain tiles / number pairs,
      //    then verify nothing tile-shaped remains anywhere else.
      const {
        myHand: _m,
        board: _b,
        openEnds: _o,
        passHistory: _p,
        teamScores: _t,
        tileCounts: _c,
        ...rest
      } = view;
      const json = JSON.stringify(rest);
      expect(json).not.toMatch(/\[\s*\d+\s*,\s*\d+\s*\]/);

      // 3. The seat does see its own hand and the public board, correctly.
      expect(view.myHand).toEqual(match.hand.hands[seat]);
      expect(view.board).toEqual(match.hand.board);
      expect(view.tileCounts.reduce((a, b) => a + b, 0)).toBe(
        match.hand.hands.flat().length,
      );
      expect(view.sleepingCount).toBe(15);
    }
  });

  it('opponents\u2019 pip totals are revealed only after the hand resolves', () => {
    const match = createMatch({}, 4242);
    const view = playerView(match, 0);
    expect(view.result).toBeUndefined();
  });
});
