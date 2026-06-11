import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import type { Seat } from '@dominoes/engine';
import type { Socket } from 'socket.io-client';
import { Board } from '../components/Board';
import { ChatBubbles } from '../components/ChatBubbles';
import { MatchOverScreen } from '../components/MatchOverScreen';
import { OpponentSeat } from '../components/OpponentSeat';
import { PegaoFlash } from '../components/PegaoFlash';
import { PlayerHand } from '../components/PlayerHand';
import { ScoreBar } from '../components/ScoreBar';
import { ScoreScreen } from '../components/ScoreScreen';
import { useBackgroundMusic } from '../hooks/useBackgroundMusic';
import { useChatMessages } from '../hooks/useChatMessages';
import { useMultiplayerGame } from '../hooks/useMultiplayerGame';
import type { PlayerView, RoomView } from '../types/socket';

const EMOJIS = ['😂', '🔥', '👏', '🙌', '😤', '🎉', '💪', '😎', '🫡', '😢', '😮', '🤣', '🤌', '👀', '🤦', '🎊'];

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
    choosingSalida,
    showPegao,
    pass,
    selectTile,
    playSide,
    cancelSelection,
    pickSalida,
    nextHand,
  } = useMultiplayerGame(socket, initialView);

  const { volume, setVolume } = useBackgroundMusic();
  const { messages: chatMessages, sendEmoji } = useChatMessages(socket);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Seat remapping: my seat is always at the bottom
  const mySeat = view.seat;
  const TOP_SEAT = ((mySeat + 2) % 4) as Seat;
  const RIGHT_SEAT = ((mySeat + 1) % 4) as Seat;
  const LEFT_SEAT = ((mySeat + 3) % 4) as Seat;

  const { tileCounts, turn, passHistory, teamScores, targetScore, handNumber, sleepingCount } = view;
  const isMyTurn = turn === mySeat && phase === 'playing' && choosingSalida === null;

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
        mySeat={mySeat}
        onLeave={onLeave}
        volume={volume}
        onVolumeChange={setVolume}
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
            'flex items-center px-3 py-1 gap-2',
            isMyTurn && 'bg-white/5',
          )}
        >
          {/* Left: turn indicator + name + count */}
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            {isMyTurn && (
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shadow-[0_0_6px_rgba(74,222,128,0.8)] shrink-0" />
            )}
            <span
              className={clsx(
                'text-[11px] font-black uppercase tracking-widest truncate',
                isMyTurn ? 'text-white' : 'text-white/40',
              )}
            >
              {seatName(mySeat)}
            </span>
            <span className="text-white/30 text-[10px] font-mono shrink-0">
              {view.myHand.length} fichas
            </span>
          </div>

          {/* Right: Pasar + emoji chat button */}
          <div className="flex items-center gap-2 shrink-0">
            {isMyTurn && playableTiles.size === 0 && (
              <button
                onClick={pass}
                className="bg-orange-500 hover:bg-orange-400 text-white text-[11px] font-black uppercase tracking-widest rounded-lg px-3 py-1 transition-colors active:scale-95"
              >
                Pasar →
              </button>
            )}

            {/* Emoji picker */}
            <div className="relative">
              <button
                onClick={() => setShowEmojiPicker((s) => !s)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-base transition-colors active:scale-90"
                title="Enviar emoji"
              >
                💬
              </button>
              {showEmojiPicker && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowEmojiPicker(false)} />
                  <div className="absolute bottom-full right-0 mb-2 z-50 bg-felt-dark border border-white/15 rounded-2xl p-3 shadow-2xl">
                    <div className="grid grid-cols-4 gap-2">
                      {EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => { sendEmoji(emoji); setShowEmojiPicker(false); }}
                          className="w-10 h-10 flex items-center justify-center text-2xl rounded-xl hover:bg-white/10 active:scale-90 transition-all"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
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
          mySeat={mySeat}
          onNext={nextHand}
        />
      )}
      {phase === 'match-over' && view.matchWinnerTeam !== undefined && (
        <MatchOverScreen
          winnerTeam={view.matchWinnerTeam}
          teamScores={teamScores}
          handNumber={handNumber}
          mySeat={mySeat}
          onNewMatch={handlePlayAgain}
          onLeave={onLeave}
        />
      )}

      <PegaoFlash show={showPegao} />
      <ChatBubbles messages={chatMessages} mySeat={mySeat} />

      {/* ¿Quién sale? — salida picker (showPicker: false while players look at new tiles) */}
      {choosingSalida && choosingSalida.showPicker !== false && (
        <div className="absolute inset-0 z-30 flex items-end bg-black/50 backdrop-blur-sm">
          <div className="w-full bg-felt-dark border-t border-white/15 rounded-t-3xl px-5 pt-5 pb-safe pb-6">
            <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-1">
              {choosingSalida.seats.includes(mySeat) ? '¡Tu equipo ganó!' : 'El equipo ganador elige...'}
            </p>
            <p className="text-white font-black text-xl mb-4">¿Quién sale?</p>

            {choosingSalida.seats.includes(mySeat) ? (
              <div className="flex flex-col gap-3">
                {choosingSalida.seats.map((seat) => (
                  <button
                    key={seat}
                    onClick={() => pickSalida(seat)}
                    className="flex items-center gap-3 bg-white/10 hover:bg-green-500/20 border border-white/15 hover:border-green-500/40 rounded-2xl px-4 py-4 text-left transition-all active:scale-95"
                  >
                    <span className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center text-green-300 font-black text-sm">
                      {seat}
                    </span>
                    <div>
                      <p className="text-white font-black">{seatName(seat)}</p>
                      {seat === mySeat && (
                        <p className="text-green-400/70 text-xs">Tú</p>
                      )}
                    </div>
                    <span className="ml-auto text-white/30 text-lg">→</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-3 py-4">
                <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                <p className="text-white/50 text-sm">
                  Esperando que el equipo ganador elija quién sale…
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
