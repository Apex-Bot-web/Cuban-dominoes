import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  createMatch,
  applyAction,
  startNextHand,
  playerView,
  botAction,
  legalMoves,
  canPlay,
  sameTile,
  type MatchState,
  type PlayerView,
  type Tile,
  type BoardSide,
  type BotLevel,
  type Seat,
} from '@dominoes/engine';

export type GamePhase = 'playing' | 'hand-over' | 'choosing-salida' | 'match-over';

const HUMAN: Seat = 0;

export interface UseGameReturn {
  view: PlayerView;
  match: MatchState;
  phase: GamePhase;
  selectedTile: Tile | null;
  choosingSide: boolean;
  botThinking: boolean;
  playableTiles: Set<string>;
  showPegao: boolean;
  selectTile: (tile: Tile) => void;
  playSide: (side: BoardSide) => void;
  cancelSelection: () => void;
  nextHand: () => void;
  pickSalida: (seat: Seat) => void;
  newMatch: () => void;
}

function tileKey(t: Tile): string {
  return `${Math.min(t[0], t[1])}-${Math.max(t[0], t[1])}`;
}

export function useGame(botLevel: BotLevel = 'duro'): UseGameReturn {
  const [match, setMatch] = useState<MatchState>(() => createMatch({ chooseSalida: true }));
  const [phase, setPhase] = useState<GamePhase>('playing');
  const [selectedTile, setSelectedTile] = useState<Tile | null>(null);
  const [choosingSide, setChoosingSide] = useState(false);
  const [botThinking, setBotThinking] = useState(false);

  const view = useMemo(() => playerView(match, HUMAN), [match]);

  // PEGAO: flash when any player plays their last tile
  const prevCountsRef = useRef(view.tileCounts);
  const [showPegao, setShowPegao] = useState(false);
  useEffect(() => {
    const prev = prevCountsRef.current;
    const curr = view.tileCounts;
    const hit = ([0, 1, 2, 3] as const).some((s) => (prev[s] ?? 0) > 0 && (curr[s] ?? 0) === 0);
    prevCountsRef.current = curr;
    if (!hit) return;
    setShowPegao(true);
    const t = setTimeout(() => setShowPegao(false), 1600);
    return () => clearTimeout(t);
  }, [view.tileCounts]);

  const playableTiles = useMemo<Set<string>>(() => {
    if (phase !== 'playing' || match.hand.turn !== HUMAN || match.hand.result) {
      return new Set();
    }
    const moves = legalMoves(match.hand, HUMAN);
    return new Set(moves.map((m) => tileKey(m.tile)));
  }, [match, phase]);

  function applyAndAdvance(m: MatchState, action: Parameters<typeof applyAction>[1]) {
    const result = applyAction(m, action);
    if (!result.ok) return;
    setMatch(result.match);
    if (result.match.hand.result) {
      setPhase(result.match.winnerTeam !== undefined ? 'match-over' : 'hand-over');
    }
  }

  // Bot turns + auto-pass
  useEffect(() => {
    if (phase !== 'playing' || match.hand.result) return;

    if (match.hand.turn === HUMAN) {
      if (canPlay(match.hand, HUMAN)) return;
      // Human can't play — auto-pass with a short delay
      const t = setTimeout(() => {
        applyAndAdvance(match, { type: 'pass', seat: HUMAN });
      }, 450);
      return () => clearTimeout(t);
    }

    // Bot's turn
    setBotThinking(true);
    const seat = match.hand.turn;
    const seed = (match.rngState ^ ((seat + 1) * 0x9e3779b9) ^ (match.hand.board.length * 0x517cc1b7)) >>> 0;
    const t = setTimeout(() => {
      setBotThinking(false);
      const action = botAction(match.hand, seat, botLevel, seed);
      applyAndAdvance(match, action);
    }, 650);

    return () => {
      clearTimeout(t);
      setBotThinking(false);
    };
    // applyAndAdvance is stable (defined in render, but we read match from closure correctly)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match, phase, botLevel]);

  const selectTile = useCallback(
    (tile: Tile) => {
      if (phase !== 'playing' || match.hand.turn !== HUMAN) return;
      const moves = legalMoves(match.hand, HUMAN).filter((m) => sameTile(m.tile, tile));
      if (moves.length === 0) return;

      if (moves.length === 1) {
        const m = moves[0]!;
        applyAndAdvance(match, { type: 'play', seat: HUMAN, tile: m.tile, side: m.side });
      } else {
        // Fits both sides — ask player
        setSelectedTile(tile);
        setChoosingSide(true);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [match, phase],
  );

  const playSide = useCallback(
    (side: BoardSide) => {
      if (!selectedTile) return;
      applyAndAdvance(match, { type: 'play', seat: HUMAN, tile: selectedTile, side });
      setSelectedTile(null);
      setChoosingSide(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [match, selectedTile],
  );

  const cancelSelection = useCallback(() => {
    setSelectedTile(null);
    setChoosingSide(false);
  }, []);

  const nextHand = useCallback(() => {
    if (!match.hand.result) return;
    const handResult = match.hand.result;
    const winnerTeam = handResult.winnerTeam;
    const isTiedTranque = handResult.type === 'tranque' && handResult.tie;

    // If human team won and chooseSalida is on, let the human pick first
    if (match.config.chooseSalida && winnerTeam === 0 && !isTiedTranque) {
      setPhase('choosing-salida');
      return;
    }

    // Bot team won, or no choice needed — advance with default salida
    const result = startNextHand(match);
    if (!result.ok) return;
    setMatch(result.match);
    setPhase('playing');
    setSelectedTile(null);
    setChoosingSide(false);
  }, [match]);

  const pickSalida = useCallback((seat: Seat) => {
    const result = startNextHand(match, seat);
    if (!result.ok) return;
    setMatch(result.match);
    setPhase('playing');
    setSelectedTile(null);
    setChoosingSide(false);
  }, [match]);

  const newMatch = useCallback(() => {
    setMatch(createMatch({ chooseSalida: true }));
    setPhase('playing');
    setSelectedTile(null);
    setChoosingSide(false);
    setBotThinking(false);
  }, []);

  return {
    view,
    match,
    phase,
    selectedTile,
    choosingSide,
    botThinking,
    playableTiles,
    showPegao,
    selectTile,
    playSide,
    cancelSelection,
    nextHand,
    pickSalida,
    newMatch,
  };
}
