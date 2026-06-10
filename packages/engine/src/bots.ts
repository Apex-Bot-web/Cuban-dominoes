import type { Action, HandState, Seat, Tile } from './types.js';
import { partnerOf, teamOf } from './types.js';
import { canPlay, legalMoves, type LegalMove } from './hand.js';
import { isDouble, pipSum } from './tiles.js';
import { mulberry32 } from './rng.js';

export type BotLevel = 'facil' | 'medio' | 'duro';

/**
 * Decide an action for `seat` given full hand state. Bots run server-side, so
 * receiving HandState is fine — but they only READ what a human could know:
 * their own hand, the board, and the pass history. (Enforced by code review,
 * worth keeping honest: a bot that peeks is just a cheater with a job title.)
 */
export function botAction(
  hand: HandState,
  seat: Seat,
  level: BotLevel,
  seed = 1,
): Action {
  if (!canPlay(hand, seat)) return { type: 'pass', seat };
  const moves = legalMoves(hand, seat);

  let move: LegalMove;
  switch (level) {
    case 'facil':
      move = moves[Math.floor(mulberry32(seed ^ (hand.board.length * 2654435761))() * moves.length)]!;
      break;
    case 'medio':
      move = greedyMove(moves);
      break;
    case 'duro':
      move = duroMove(hand, seat, moves);
      break;
  }
  return { type: 'play', seat, tile: move.tile, side: move.side };
}

/** Medio: dump the heaviest tile; among equals prefer doubles (they're liabilities). */
function greedyMove(moves: LegalMove[]): LegalMove {
  return moves.reduce((best, m) => {
    const a = pipSum(m.tile) + (isDouble(m.tile) ? 0.5 : 0);
    const b = pipSum(best.tile) + (isDouble(best.tile) ? 0.5 : 0);
    return a > b ? m : best;
  });
}

/**
 * Duro: weighted scoring with the inferences a strong table player makes.
 * - Track passes: a pass on ends [x,y] means that seat holds no x and no y.
 * - Count played suits: prefer steering the board toward numbers we control
 *   and that left-hand opponent is known to lack.
 * - Protect the partner: avoid creating ends the partner has passed on.
 * - Shed doubles early and heavy tiles generally.
 */
function duroMove(hand: HandState, seat: Seat, moves: LegalMove[]): LegalMove {
  const myTeam = teamOf(seat);
  const partner = partnerOf(seat);
  const opponents = ([0, 1, 2, 3] as Seat[]).filter((s) => teamOf(s) !== myTeam);

  // Numbers each seat is known NOT to hold (from passes at the time they passed).
  const knownVoid: Set<number>[] = [new Set(), new Set(), new Set(), new Set()];
  for (const p of hand.passHistory) {
    knownVoid[p.seat]!.add(p.ends[0]);
    knownVoid[p.seat]!.add(p.ends[1]);
  }

  // How many of each number remain unseen by me (not on board, not in my hand).
  const myHand = hand.hands[seat]!;
  const seenCount = new Array<number>(19).fill(0); // generous upper bound for maxPip
  const bump = (t: Tile) => {
    seenCount[t[0]] = (seenCount[t[0]] ?? 0) + 1;
    if (t[0] !== t[1]) seenCount[t[1]] = (seenCount[t[1]] ?? 0) + 1;
  };
  hand.board.forEach(bump);
  myHand.forEach(bump);

  // My suit strength: copies of each number I hold.
  const mySuit = new Array<number>(19).fill(0);
  for (const t of myHand) {
    mySuit[t[0]] = (mySuit[t[0]] ?? 0) + 1;
    if (t[0] !== t[1]) mySuit[t[1]] = (mySuit[t[1]] ?? 0) + 1;
  }

  let best: LegalMove = moves[0]!;
  let bestScore = -Infinity;

  for (const move of moves) {
    const exposed = exposedEnd(hand, move);
    let score = 0;

    // Shed weight: pips matter at hand end, get rid of them.
    score += pipSum(move.tile) * 1.0;
    // Doubles are dead weight late; play them while they fit.
    if (isDouble(move.tile)) score += 4;
    // Keep flexibility: prefer exposing a number I still hold copies of.
    score += (mySuit[exposed] ?? 0) * 3;
    // Squeeze opponents known to be void on the exposed number.
    for (const opp of opponents) {
      if (knownVoid[opp]!.has(exposed)) score += 6;
    }
    // Don't hang the partner on a number they've shown they lack.
    if (knownVoid[partner]!.has(exposed)) score -= 7;
    // Mild bonus for exposing scarce numbers (harder for others to answer).
    const remainingUnseen = numberPopulation(exposed) - (seenCount[exposed] ?? 0);
    score += Math.max(0, 4 - remainingUnseen) * 0.5;

    if (score > bestScore) {
      bestScore = score;
      best = move;
    }
  }
  return best;
}

/** The number that becomes the new open end if this move is made. */
function exposedEnd(hand: HandState, move: LegalMove): number {
  const first = hand.board[0];
  const last = hand.board[hand.board.length - 1];
  if (!first || !last) {
    return move.tile[1]; // opening: right end of tile as placed
  }
  const endValue = move.side === 'left' ? first[0] : last[1];
  return move.tile[0] === endValue ? move.tile[1] : move.tile[0];
}

/** Total copies of a number in a double-9 set = 10 tiles contain it (incl. its double). */
function numberPopulation(_n: number): number {
  return 10;
}
