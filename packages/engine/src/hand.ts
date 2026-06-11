import type {
  BoardSide,
  GameConfig,
  HandResult,
  HandState,
  PlayAction,
  Seat,
  Team,
  Tile,
} from './types.js';
import { teamOf } from './types.js';
import { fullSet, handPips, tileInHand } from './tiles.js';
import { shuffleInPlace } from './rng.js';

// ---------------------------------------------------------------------------
// Dealing
// ---------------------------------------------------------------------------

export interface DealResult {
  hands: Tile[][];
  sleeping: Tile[];
  rngState: number;
}

export function deal(config: GameConfig, rngState: number): DealResult {
  const tiles = fullSet(config.maxPip);
  const needed = config.handSize * 4;
  if (needed > tiles.length) {
    throw new Error(
      `Cannot deal ${config.handSize} tiles to 4 players from a ${tiles.length}-tile set`,
    );
  }
  const newState = shuffleInPlace(tiles, rngState);
  const hands: Tile[][] = [[], [], [], []];
  for (let i = 0; i < needed; i++) {
    hands[i % 4]!.push(tiles[i]!);
  }
  return { hands, sleeping: tiles.slice(needed), rngState: newState };
}

export function createHand(
  config: GameConfig,
  salida: Seat,
  rngState: number,
): { hand: HandState; rngState: number } {
  const { hands, sleeping, rngState: newState } = deal(config, rngState);
  return {
    hand: {
      hands,
      board: [],
      sleeping,
      turn: salida,
      consecutivePasses: 0,
      passHistory: [],
      salida,
    },
    rngState: newState,
  };
}

// ---------------------------------------------------------------------------
// Board ends & legal moves
// ---------------------------------------------------------------------------

/** Open ends of the chain, or undefined if the board is empty. */
export function boardEnds(hand: HandState): readonly [number, number] | undefined {
  const first = hand.board[0];
  const last = hand.board[hand.board.length - 1];
  if (!first || !last) return undefined;
  return [first[0], last[1]];
}

export interface LegalMove {
  tile: Tile;
  side: BoardSide;
}

/** All legal placements for a seat. Opening move: any tile (side is canonically 'right'). */
export function legalMoves(hand: HandState, seat: Seat): LegalMove[] {
  const playerHand = hand.hands[seat]!;
  const ends = boardEnds(hand);
  if (!ends) {
    return playerHand.map((tile) => ({ tile, side: 'right' as const }));
  }
  const [left, right] = ends;
  const moves: LegalMove[] = [];
  for (const tile of playerHand) {
    if (tile[0] === left || tile[1] === left) moves.push({ tile, side: 'left' });
    if (tile[0] === right || tile[1] === right) moves.push({ tile, side: 'right' });
  }
  return moves;
}

export function canPlay(hand: HandState, seat: Seat): boolean {
  return legalMoves(hand, seat).length > 0;
}

function nextSeat(seat: Seat): Seat {
  return ((seat + 1) % 4) as Seat;
}

// ---------------------------------------------------------------------------
// Applying actions (pure: input state is not mutated)
// ---------------------------------------------------------------------------

export type ActionError =
  | 'hand-finished'
  | 'not-your-turn'
  | 'tile-not-in-hand'
  | 'tile-does-not-fit'
  | 'side-required'
  | 'pass-with-legal-move';

export type ApplyResult =
  | { ok: true; hand: HandState }
  | { ok: false; error: ActionError };

function cloneHand(hand: HandState): HandState {
  return {
    hands: hand.hands.map((h) => h.slice()),
    board: hand.board.slice(),
    sleeping: hand.sleeping.slice(),
    turn: hand.turn,
    consecutivePasses: hand.consecutivePasses,
    passHistory: hand.passHistory.slice(),
    salida: hand.salida,
    ...(hand.result !== undefined ? { result: hand.result } : {}),
  };
}

export function applyPlay(
  state: HandState,
  action: PlayAction,
  config: GameConfig,
): ApplyResult {
  if (state.result) return { ok: false, error: 'hand-finished' };
  if (action.seat !== state.turn) return { ok: false, error: 'not-your-turn' };

  const next = cloneHand(state);
  const playerHand = next.hands[action.seat]!;
  const idx = tileInHand(playerHand, action.tile);
  if (idx === -1) return { ok: false, error: 'tile-not-in-hand' };
  const tile = playerHand[idx]!;

  const ends = boardEnds(next);
  if (!ends) {
    // Opening move: any tile, oriented as given.
    playerHand.splice(idx, 1);
    next.board.push(tile);
  } else {
    const [left, right] = ends;
    let side = action.side;
    if (!side) {
      // Infer the side when unambiguous; demand it otherwise.
      const fitsLeft = tile[0] === left || tile[1] === left;
      const fitsRight = tile[0] === right || tile[1] === right;
      if (fitsLeft && fitsRight) return { ok: false, error: 'side-required' };
      side = fitsLeft ? 'left' : fitsRight ? 'right' : undefined;
      if (!side) return { ok: false, error: 'tile-does-not-fit' };
    }
    if (side === 'left') {
      if (tile[1] === left) next.board.unshift(tile);
      else if (tile[0] === left) next.board.unshift([tile[1], tile[0]]);
      else return { ok: false, error: 'tile-does-not-fit' };
    } else {
      if (tile[0] === right) next.board.push(tile);
      else if (tile[1] === right) next.board.push([tile[1], tile[0]]);
      else return { ok: false, error: 'tile-does-not-fit' };
    }
    playerHand.splice(idx, 1);
  }

  next.consecutivePasses = 0;

  if (playerHand.length === 0) {
    next.result = scoreDomino(next, action.seat, config);
  } else {
    next.turn = nextSeat(next.turn);
  }
  return { ok: true, hand: next };
}

export function applyPass(state: HandState, seat: Seat, config: GameConfig): ApplyResult {
  if (state.result) return { ok: false, error: 'hand-finished' };
  if (seat !== state.turn) return { ok: false, error: 'not-your-turn' };
  if (canPlay(state, seat)) return { ok: false, error: 'pass-with-legal-move' };

  const next = cloneHand(state);
  const ends = boardEnds(next)!; // a pass is impossible on an empty board (opening move always has plays)
  next.passHistory.push({ seat, ends });
  next.consecutivePasses += 1;

  if (next.consecutivePasses >= 4) {
    next.result = scoreTranque(next, seat, config);
  } else {
    next.turn = nextSeat(next.turn);
  }
  return { ok: true, hand: next };
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

function pipsBySeat(hand: HandState): [number, number, number, number] {
  return [
    handPips(hand.hands[0]!),
    handPips(hand.hands[1]!),
    handPips(hand.hands[2]!),
    handPips(hand.hands[3]!),
  ];
}

function scoreDomino(hand: HandState, winnerSeat: Seat, config: GameConfig): HandResult {
  const pips = pipsBySeat(hand);
  const winnerTeam = teamOf(winnerSeat);
  const opponents = ([0, 1, 2, 3] as Seat[]).filter((s) => teamOf(s) !== winnerTeam);
  let points = opponents.reduce((sum: number, s) => sum + pips[s]!, 0);
  if (config.scorePips === 'all') {
    const partner = ((winnerSeat + 2) % 4) as Seat;
    points += pips[partner]!;
  }
  return { type: 'domino', winnerSeat, winnerTeam, points, pipsBySeat: pips };
}

function scoreTranque(hand: HandState, closerSeat: Seat, config: GameConfig): HandResult {
  const pips = pipsBySeat(hand);
  const teamPips: [number, number] = [pips[0]! + pips[2]!, pips[1]! + pips[3]!];

  // Cuban rule: the individual with the fewest pips wins it for their team.
  // A tie only occurs when the minimum pip count is shared across both teams.
  const minPip = Math.min(...pips);
  const teamsWithMin = new Set(
    ([0, 1, 2, 3] as Seat[]).filter((s) => pips[s]! === minPip).map((s) => teamOf(s)),
  );

  let winnerTeam: Team | undefined;
  let tie = false;
  if (teamsWithMin.size === 1) {
    winnerTeam = [...teamsWithMin][0]!;
  } else {
    tie = true;
    if (config.tieTranque === 'closer-loses') {
      winnerTeam = (1 - teamOf(closerSeat)) as Team;
    }
  }

  if (winnerTeam === undefined) {
    return { type: 'tranque', points: 0, pipsBySeat: pips, teamPips, tie };
  }

  // Note: the 'all' scorePips variant only changes dominó scoring (adds the
  // winner's partner's pips). In a tranque the winning team always collects
  // the losing team's pips — there is no fifth pile to argue about.
  const points = teamPips[(1 - winnerTeam) as Team];
  return { type: 'tranque', winnerTeam, points, pipsBySeat: pips, teamPips, tie };
}
