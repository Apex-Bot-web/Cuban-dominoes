import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { legalMoves, sameTile } from '@dominoes/engine';
import type { BoardSide, HandState, Tile } from '@dominoes/engine';
import type { Socket } from 'socket.io-client';
import type { ChoosingAboutSalida, PlayerView, Seat } from '../types/socket';

export type GamePhase = 'playing' | 'hand-over' | 'match-over';

function tileKey(t: Tile): string {
  return `${Math.min(t[0], t[1])}-${Math.max(t[0], t[1])}`;
}

function makeFakeHand(view: PlayerView): HandState {
  const hands: Tile[][] = [[], [], [], []];
  hands[view.seat] = [...view.myHand];
  return {
    hands,
    board: [...view.board],
    sleeping: [],
    turn: view.turn,
    consecutivePasses: 0,
    passHistory: [...view.passHistory],
    salida: view.salida,
  };
}

export interface UseMultiplayerGameReturn {
  view: PlayerView;
  phase: GamePhase;
  selectedTile: Tile | null;
  choosingSide: boolean;
  playableTiles: Set<string>;
  choosingSalida: ChoosingAboutSalida | null;
  salidaCountdown: number | null;
  showPegao: boolean;
  pass: () => void;
  selectTile: (tile: Tile) => void;
  playSide: (side: BoardSide) => void;
  cancelSelection: () => void;
  pickSalida: (seat: Seat) => void;
  nextHand: () => void;
}

export function useMultiplayerGame(
  socket: Socket,
  initialView: PlayerView,
): UseMultiplayerGameReturn {
  const [view, setView] = useState<PlayerView>(initialView);
  const [selectedTile, setSelectedTile] = useState<Tile | null>(null);
  const [choosingSide, setChoosingSide] = useState(false);
  const [choosingSalida, setChoosingSalida] = useState<ChoosingAboutSalida | null>(null);
  const [salidaCountdown, setSalidaCountdown] = useState<number | null>(null);
  const [showPegao, setShowPegao] = useState(false);
  const prevCountsRef = useRef(initialView.tileCounts);

  // PEGAO: flash when any player plays their last tile
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

  const phase = useMemo<GamePhase>(() => {
    if (view.matchWinnerTeam !== undefined) return 'match-over';
    if (view.result !== undefined) return 'hand-over';
    return 'playing';
  }, [view]);

  useEffect(() => {
    function onGameState(next: PlayerView) {
      setView(next);
      setSelectedTile(null);
      setChoosingSide(false);
      setChoosingSalida(null);
      setSalidaCountdown(null);
    }
    function onChoosingSalida(payload: ChoosingAboutSalida) {
      setChoosingSalida(payload);
      setSalidaCountdown(payload.showPicker === false ? 5 : null);
    }
    socket.on('game:state', onGameState);
    socket.on('game:choosing-salida', onChoosingSalida);
    return () => {
      socket.off('game:state', onGameState);
      socket.off('game:choosing-salida', onChoosingSalida);
    };
  }, [socket]);

  // Tick countdown while tiles are visible but picker is hidden
  useEffect(() => {
    if (salidaCountdown === null || salidaCountdown <= 0) return;
    const t = setTimeout(() => setSalidaCountdown((c) => (c !== null && c > 0 ? c - 1 : null)), 1_000);
    return () => clearTimeout(t);
  }, [salidaCountdown]);

  const mySeat = view.seat;

  const playableTiles = useMemo<Set<string>>(() => {
    if (phase !== 'playing' || view.turn !== mySeat || choosingSalida !== null) return new Set();
    const moves = legalMoves(makeFakeHand(view), mySeat);
    return new Set(moves.map((m) => tileKey(m.tile)));
  }, [view, phase, mySeat, choosingSalida]);

  const selectTile = useCallback(
    (tile: Tile) => {
      if (phase !== 'playing' || view.turn !== mySeat || choosingSalida !== null) return;
      const moves = legalMoves(makeFakeHand(view), mySeat).filter((m) =>
        sameTile(m.tile, tile),
      );
      if (moves.length === 0) return;

      if (moves.length === 1) {
        const m = moves[0]!;
        socket.emit('game:action', { type: 'play', seat: mySeat, tile: m.tile, side: m.side });
      } else {
        setSelectedTile(tile);
        setChoosingSide(true);
      }
    },
    [socket, view, phase, mySeat, choosingSalida],
  );

  const playSide = useCallback(
    (side: BoardSide) => {
      if (!selectedTile) return;
      socket.emit('game:action', { type: 'play', seat: mySeat, tile: selectedTile, side });
      setSelectedTile(null);
      setChoosingSide(false);
    },
    [socket, mySeat, selectedTile],
  );

  const cancelSelection = useCallback(() => {
    setSelectedTile(null);
    setChoosingSide(false);
  }, []);

  const pass = useCallback(() => {
    if (phase !== 'playing' || view.turn !== mySeat || choosingSalida !== null) return;
    socket.emit('game:action', { type: 'pass', seat: mySeat });
  }, [socket, phase, view.turn, mySeat, choosingSalida]);

  const pickSalida = useCallback(
    (seat: Seat) => {
      socket.emit('game:choose-salida', { seat });
      setChoosingSalida(null);
    },
    [socket],
  );

  const nextHand = useCallback(() => {
    socket.emit('game:next-hand', {});
  }, [socket]);

  return {
    view,
    phase,
    selectedTile,
    choosingSide,
    playableTiles,
    choosingSalida,
    salidaCountdown,
    showPegao,
    pass,
    selectTile,
    playSide,
    cancelSelection,
    pickSalida,
    nextHand,
  };
}
