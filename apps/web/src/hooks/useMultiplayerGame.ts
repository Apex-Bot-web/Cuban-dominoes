import { useCallback, useEffect, useMemo, useState } from 'react';
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
    }
    function onChoosingSalida(payload: ChoosingAboutSalida) {
      setChoosingSalida(payload);
    }
    socket.on('game:state', onGameState);
    socket.on('game:choosing-salida', onChoosingSalida);
    return () => {
      socket.off('game:state', onGameState);
      socket.off('game:choosing-salida', onChoosingSalida);
    };
  }, [socket]);

  const mySeat = view.seat;

  const playableTiles = useMemo<Set<string>>(() => {
    if (phase !== 'playing' || view.turn !== mySeat) return new Set();
    const moves = legalMoves(makeFakeHand(view), mySeat);
    return new Set(moves.map((m) => tileKey(m.tile)));
  }, [view, phase, mySeat]);

  const selectTile = useCallback(
    (tile: Tile) => {
      if (phase !== 'playing' || view.turn !== mySeat) return;
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
    [socket, view, phase, mySeat],
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
    if (phase !== 'playing' || view.turn !== mySeat) return;
    socket.emit('game:action', { type: 'pass', seat: mySeat });
  }, [socket, phase, view.turn, mySeat]);

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
    pass,
    selectTile,
    playSide,
    cancelSelection,
    pickSalida,
    nextHand,
  };
}
