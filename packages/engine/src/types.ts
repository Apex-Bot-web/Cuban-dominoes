/**
 * Core types for Cuban double-9 dominoes.
 *
 * Conventions:
 * - Seats 0,1,2,3 sit around the table in turn order.
 *   Teams are by parity: seats 0 & 2 = team 0, seats 1 & 3 = team 1.
 * - A Tile is an unordered pair of pip values. On the board it is stored
 *   ORIENTED: board[i][1] touches board[i+1][0].
 */

export type Tile = readonly [number, number];
export type Seat = 0 | 1 | 2 | 3;
export type Team = 0 | 1;
export type BoardSide = 'left' | 'right';

export const SEATS: readonly Seat[] = [0, 1, 2, 3];

export function teamOf(seat: Seat): Team {
  return (seat % 2) as Team;
}

export function partnerOf(seat: Seat): Seat {
  return ((seat + 2) % 4) as Seat;
}

/** House rules. Every knob a Cuban table argues about lives here. */
export interface GameConfig {
  /** Highest pip value. 9 = double-9 (55 tiles). 6 would be double-6 (28 tiles). */
  maxPip: number;
  /** Tiles dealt per player. Cuban double-9: 10 each, 15 sleep. */
  handSize: number;
  /** Match ends when a team reaches this. Classic: 100. Also common: 150, 200. */
  targetScore: number;
  /** Who leads the very first hand of the match. */
  firstLead: 'double-max' | 'random';
  /**
   * Resolution of a tied tranque (both teams hold equal pips).
   * 'no-score': nobody scores, same salida leads the next hand.
   * 'closer-loses': the team of the player who closed the game loses the tie.
   */
  tieTranque: 'no-score' | 'closer-loses';
  /**
   * What the winning team collects.
   * 'opponents': sum of the two opposing hands (standard Cuban).
   * 'all': opponents + the winner's partner's leftover pips.
   */
  scorePips: 'opponents' | 'all';
  /**
   * If true, after each hand the winning team chooses which partner leads (la salida).
   * If false, the player who dominoed (or held fewer pips in a tranque) leads automatically.
   */
  chooseSalida: boolean;
}

export const DEFAULT_CONFIG: GameConfig = {
  maxPip: 9,
  handSize: 10,
  targetScore: 100,
  firstLead: 'double-max',
  tieTranque: 'no-score',
  scorePips: 'opponents',
  chooseSalida: false,
};

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export interface PlayAction {
  type: 'play';
  seat: Seat;
  tile: Tile;
  /** Which open end to attach to. Ignored (may be omitted) on the opening move. */
  side?: BoardSide;
}

export interface PassAction {
  type: 'pass';
  seat: Seat;
}

export type Action = PlayAction | PassAction;

// ---------------------------------------------------------------------------
// Hand (one deal) state
// ---------------------------------------------------------------------------

export interface PassRecord {
  seat: Seat;
  /** The open ends the player could not match — fuel for bot inference & replays. */
  ends: readonly [number, number];
}

export type HandResult =
  | {
      type: 'domino';
      winnerSeat: Seat;
      winnerTeam: Team;
      points: number;
      pipsBySeat: readonly [number, number, number, number];
    }
  | {
      type: 'tranque';
      /** undefined on an unscored tie */
      winnerTeam?: Team;
      points: number;
      pipsBySeat: readonly [number, number, number, number];
      teamPips: readonly [number, number];
      tie: boolean;
    };

export interface HandState {
  /** Private hands by seat. The server must NEVER ship another seat's hand to a client. */
  hands: Tile[][];
  /** Oriented chain: board[i][1] === board[i+1][0]. */
  board: Tile[];
  /** Tiles left undealt ("duermen" / they sleep). Never enter play in Cuban rules. */
  sleeping: Tile[];
  turn: Seat;
  consecutivePasses: number;
  passHistory: PassRecord[];
  /** Seat that opened the hand (la salida). */
  salida: Seat;
  result?: HandResult;
}

// ---------------------------------------------------------------------------
// Match state
// ---------------------------------------------------------------------------

export interface MatchState {
  config: GameConfig;
  teamScores: [number, number];
  handNumber: number; // 1-based
  hand: HandState;
  /** Seat that will lead the NEXT hand (set when a hand resolves). */
  nextSalida: Seat;
  winnerTeam?: Team;
  /** PRNG state for reproducible shuffles. */
  rngState: number;
}
