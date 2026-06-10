import type { Action, GameConfig, MatchState, Seat, Team, Tile } from './types.js';
import { DEFAULT_CONFIG, SEATS, teamOf } from './types.js';
import { applyPass, applyPlay, createHand, type ApplyResult } from './hand.js';
import { nextRandom } from './rng.js';
import { sameTile } from './tiles.js';

// ---------------------------------------------------------------------------
// Match creation
// ---------------------------------------------------------------------------

export function createMatch(
  config: Partial<GameConfig> = {},
  seed: number = (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0,
): MatchState {
  const cfg: GameConfig = { ...DEFAULT_CONFIG, ...config };
  let rngState = seed >>> 0;

  // We need the deal before we can find the double-max holder, so create the
  // hand with a provisional salida and then correct it.
  const { hand, rngState: afterDeal } = createHand(cfg, 0, rngState);
  rngState = afterDeal;

  let salida: Seat = 0;
  if (cfg.firstLead === 'double-max') {
    const doubleMax: Tile = [cfg.maxPip, cfg.maxPip];
    const holder = SEATS.find((s) => hand.hands[s]!.some((t) => sameTile(t, doubleMax)));
    // With 40 of 55 tiles dealt, the double-9 sleeps ~27% of the time.
    // Fallback: random seat.
    if (holder !== undefined) {
      salida = holder;
    } else {
      let value: number;
      [value, rngState] = nextRandom(rngState);
      salida = Math.floor(value * 4) as Seat;
    }
  } else {
    let value: number;
    [value, rngState] = nextRandom(rngState);
    salida = Math.floor(value * 4) as Seat;
  }

  hand.turn = salida;
  hand.salida = salida;

  return {
    config: cfg,
    teamScores: [0, 0],
    handNumber: 1,
    hand,
    nextSalida: salida,
    rngState,
  };
}

// ---------------------------------------------------------------------------
// Applying actions at match level
// ---------------------------------------------------------------------------

export type MatchApplyResult =
  | { ok: true; match: MatchState }
  | { ok: false; error: string };

/**
 * Apply a play/pass to the current hand. If the hand resolves, team scores are
 * updated and `nextSalida` is set, but the next hand is NOT auto-dealt — call
 * `startNextHand` for that. (This gives the UI a natural "hand over" screen.)
 */
export function applyAction(match: MatchState, action: Action): MatchApplyResult {
  if (match.winnerTeam !== undefined) {
    return { ok: false, error: 'match-finished' };
  }

  const result: ApplyResult =
    action.type === 'play'
      ? applyPlay(match.hand, action, match.config)
      : applyPass(match.hand, action.seat, match.config);

  if (!result.ok) return { ok: false, error: result.error };

  const next: MatchState = { ...match, hand: result.hand, teamScores: [...match.teamScores] };

  const handResult = result.hand.result;
  if (handResult) {
    if (handResult.type === 'domino') {
      next.teamScores[handResult.winnerTeam] += handResult.points;
      next.nextSalida = handResult.winnerSeat;
    } else {
      // tranque
      if (handResult.winnerTeam !== undefined) {
        next.teamScores[handResult.winnerTeam] += handResult.points;
        next.nextSalida = tranqueSalida(result.hand, handResult.winnerTeam);
      } else {
        // Unscored tie: same salida repeats.
        next.nextSalida = result.hand.salida;
      }
    }
    const t0 = next.teamScores[0];
    const t1 = next.teamScores[1];
    if (t0 >= next.config.targetScore || t1 >= next.config.targetScore) {
      next.winnerTeam = (t0 >= next.config.targetScore ? 0 : 1) as Team;
    }
  }

  return { ok: true, match: next };
}

/** On a tranque, the winning-team player holding fewer pips leads next. */
function tranqueSalida(hand: { hands: Tile[][] }, winnerTeam: Team): Seat {
  const seats = SEATS.filter((s) => teamOf(s) === winnerTeam);
  const pips = (s: Seat) => hand.hands[s]!.reduce((sum, t) => sum + t[0] + t[1], 0);
  const a = seats[0]!;
  const b = seats[1]!;
  return pips(a) <= pips(b) ? a : b;
}

/** Deal the next hand. Errors if the current hand is unresolved or the match is over. */
export function startNextHand(match: MatchState): MatchApplyResult {
  if (match.winnerTeam !== undefined) return { ok: false, error: 'match-finished' };
  if (!match.hand.result) return { ok: false, error: 'hand-in-progress' };

  const { hand, rngState } = createHand(match.config, match.nextSalida, match.rngState);
  return {
    ok: true,
    match: {
      ...match,
      hand,
      rngState,
      handNumber: match.handNumber + 1,
    },
  };
}
