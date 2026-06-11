import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import type { Seat } from '@dominoes/engine';
import type { Socket } from 'socket.io-client';
import { Board } from '../components/Board';
import { MatchOverScreen } from '../components/MatchOverScreen';
import { OpponentSeat } from '../components/OpponentSeat';
import { PlayerHand } from '../components/PlayerHand';
import { ScoreBar } from '../components/ScoreBar';
import { ScoreScreen } from '../components/ScoreScreen';
import { useMultiplayerGame } from '../hooks/useMultiplayerGame';
import type { PlayerView, RoomView } from '../types/socket';

interface MultiplayerGameScreenProps {
  socket: Socket;
  initialView: PlayerView;
  room: RoomView;
  onLeave: () => void;
}

export function MultiplayerGameScreen({
  socket,
  initialView,
  room,
  onLeave,
}: MultiplayerGameScreenProps) {
  const {
    view,
    phase,
    selectedTile,
    choosingSide,
    playableTiles,
    selectTile,
    playSide,
    cancelSelection,
    nextHand,
  } = useMultiplayerGame(socket, initialView);

  // Seat remapping: my seat is always at the bottom
  const mySeat = view.seat;
  const TOP_SEAT = ((mySeat + 2) % 4) as Seat;
  const RIGHT_SEAT = ((mySeat + 1) % 4) as Seat;
  const LEFT_SEAT = ((mySeat + 3) % 4) as Seat;

  const { tileCounts, turn, passHistory, teamScores, targetScore, handNumber, sleepingCount } = view;
  const isMyTurn = turn === mySeat && phase === 'playing';

  const [serverError, setServerError] = useState('');
  useEffect(() => {
    function onError(e: { message: string }) { setServerError(e.message); }
    socket.on('error', onError);
    return () => { socket.off('error', onError); };
  }, [socket]);

  function handlePlayAgain() {
    socket.emit('room:start', {});
  }

  // Display name for the current seat from room data
  function seatName(seat: Seat): string {
    const slot = room.seats[seat];
    if (!slot) return `Asiento ${seat}`;
    return slot.type === 'bot' ? slot.displayName : slot.displayName;
  }

  return (
    <div
      className="h-full flex flex-col felt-texture overflow-hidden relative select-none"
      onClick={choosingSide ? cancelSelection : undefined}
    >
      <ScoreBar
        teamScores={teamScores}
        targetScore={targetScore}
        handNumber={handNumber}
        sleepingCount={sleepingCount}
        botThinking={false}
        onLeave={onLeave}
      />

      {serverError && (
        <div className="shrink-0 bg-red-900/80 text-red-200 text-xs font-bold px-4 py-1 text-center">
          {serverError}
        </div>
      )}

      <div className="flex-1 flex flex-col min-h-0 px-2 pt-2 pb-1 gap-1.5">
        <OpponentSeat
          seat={TOP_SEAT}
          tileCount={tileCounts[TOP_SEAT]}
          isActive={turn === TOP_SEAT}
          passHistory={passHistory}
          position="top"
          displayName={seatName(TOP_SEAT)}
        />

        <div className="flex-1 flex gap-1.5 min-h-0">
          <OpponentSeat
            seat={LEFT_SEAT}
            tileCount={tileCounts[LEFT_SEAT]}
            isActive={turn === LEFT_SEAT}
            passHistory={passHistory}
            position="side"
            displayName={seatName(LEFT_SEAT)}
          />

          <div className="flex-1 table-surface rounded-2xl overflow-hidden flex flex-col">
            <Board
              board={view.board}
              openEnds={view.openEnds}
              choosingSide={choosingSide}
              onPickSide={playSide}
            />
          </div>

          <OpponentSeat
            seat={RIGHT_SEAT}
            tileCount={tileCounts[RIGHT_SEAT]}
            isActive={turn === RIGHT_SEAT}
            passHistory={passHistory}
            position="side"
            displayName={seatName(RIGHT_SEAT)}
          />
        </div>
      </div>

      <div className="shrink-0 bg-felt-dark/70 border-t border-white/10">
        <div
          className={clsx(
            'flex items-center justify-center gap-1.5 py-1',
            isMyTurn && 'bg-white/5',
          )}
        >
          {isMyTurn && (
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shadow-[0_0_6px_rgba(74,222,128,0.8)]" />
          )}
          <span
            className={
              isMyTurn
                ? 'text-[11px] font-black uppercase tracking-widest text-white'
                : 'text-[11px] font-black uppercase tracking-widest text-white/40'
            }
          >
            {seatName(mySeat)}
          </span>
          <span className="text-white/30 text-[10px] font-mono">
            {view.myHand.length} fichas
          </span>
        </div>

        <PlayerHand
          tiles={view.myHand}
          playableTiles={playableTiles}
          selectedTile={selectedTile}
          isMyTurn={isMyTurn}
          choosingSide={choosingSide}
          onSelect={selectTile}
          onCancelSelection={cancelSelection}
        />
      </div>

      {phase === 'hand-over' && view.result && (
        <ScoreScreen
          result={view.result}
          teamScores={teamScores}
          targetScore={targetScore}
          handNumber={handNumber}
          onNext={nextHand}
        />
      )}
      {phase === 'match-over' && view.matchWinnerTeam !== undefined && (
        <MatchOverScreen
          winnerTeam={view.matchWinnerTeam}
          teamScores={teamScores}
          handNumber={handNumber}
          onNewMatch={handlePlayAgain}
          onLeave={onLeave}
        />
      )}
    </div>
  );
}
