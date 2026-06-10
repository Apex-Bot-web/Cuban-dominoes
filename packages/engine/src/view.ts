import type { HandResult, MatchState, PassRecord, Seat, Tile } from './types.js';

/**
 * What one seat is allowed to know. THIS is the payload shape the server ships
 * to clients — never the raw MatchState. Other players' hands appear only as
 * tile COUNTS. Hand contents are revealed only inside `result.pipsBySeat`
 * after the hand is over (which mirrors the real-world tile flip at the end).
 */
export interface PlayerView {
  seat: Seat;
  myHand: readonly Tile[];
  board: readonly Tile[];
  openEnds?: readonly [number, number];
  tileCounts: readonly [number, number, number, number];
  sleepingCount: number;
  turn: Seat;
  salida: Seat;
  passHistory: readonly PassRecord[];
  teamScores: readonly [number, number];
  handNumber: number;
  targetScore: number;
  result?: HandResult;
  matchWinnerTeam?: 0 | 1;
}

export function playerView(match: MatchState, seat: Seat): PlayerView {
  const hand = match.hand;
  const first = hand.board[0];
  const last = hand.board[hand.board.length - 1];
  return {
    seat,
    myHand: hand.hands[seat]!.slice(),
    board: hand.board.slice(),
    ...(first && last ? { openEnds: [first[0], last[1]] as const } : {}),
    tileCounts: [
      hand.hands[0]!.length,
      hand.hands[1]!.length,
      hand.hands[2]!.length,
      hand.hands[3]!.length,
    ],
    sleepingCount: hand.sleeping.length,
    turn: hand.turn,
    salida: hand.salida,
    passHistory: hand.passHistory.slice(),
    teamScores: [...match.teamScores],
    handNumber: match.handNumber,
    targetScore: match.config.targetScore,
    ...(hand.result !== undefined ? { result: hand.result } : {}),
    ...(match.winnerTeam !== undefined ? { matchWinnerTeam: match.winnerTeam } : {}),
  };
}
