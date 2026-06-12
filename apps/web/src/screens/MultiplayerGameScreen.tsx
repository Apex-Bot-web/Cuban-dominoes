import { useCallback, useEffect, useRef, useState } from 'react';
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
    salidaCountdown,
    showPegao,
    pass,
    selectTile,
    playSide,
    cancelSelection,
    pickSalida,
    nextHand,
  } = useMultiplayerGame(socket, initialView);

  const { volume, setVolume } = useBackgroundMusic();
  const { floatingMessages, chatHistory, sendEmoji, sendText } = useChatMessages(socket);

  const [showChat, setShowChat] = useState(false);
  const [textInput, setTextInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message when chat is open
  useEffect(() => {
    if (showChat) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, showChat]);

  function handleSendText(e: React.FormEvent) {
    e.preventDefault();
    const t = textInput.trim();
    if (!t) return;
    sendText(t);
    setTextInput('');
  }

  // Track live room state for reconnect indicators
  const [currentRoom, setCurrentRoom] = useState(room);
  useEffect(() => {
    function onRoomUpdated(r: typeof room) { setCurrentRoom(r); }
    socket.on('room:updated', onRoomUpdated);
    return () => { socket.off('room:updated', onRoomUpdated); };
  }, [socket]);

  function seatConnected(seat: Seat): boolean {
    const slot = currentRoom.seats[seat];
    return !slot || slot.type === 'bot' || slot.connected;
  }

  // Copy room code
  const [copied, setCopied] = useState(false);
  const copyCode = useCallback(() => {
    void navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [room.code]);

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

  function seatName(seat: Seat): string {
    const slot = room.seats[seat];
    if (!slot) return `Seat ${seat}`;
    return slot.displayName;
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

      {/* Room code — tap to copy */}
      <div className="shrink-0 flex items-center justify-center py-1 bg-black/20 border-b border-white/5">
        <button onClick={copyCode} className="flex items-center gap-1.5 text-white/30 hover:text-white/60 transition-colors">
          <span className="text-[10px] font-black tracking-widest">{room.code}</span>
          <span className="text-[10px]">{copied ? '✓' : '⎘'}</span>
        </button>
      </div>

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
          connected={seatConnected(TOP_SEAT)}
        />

        <div className="flex-1 flex gap-1.5 min-h-0">
          <OpponentSeat
            seat={LEFT_SEAT}
            tileCount={tileCounts[LEFT_SEAT]}
            isActive={turn === LEFT_SEAT}
            passHistory={passHistory}
            position="side"
            displayName={seatName(LEFT_SEAT)}
            connected={seatConnected(LEFT_SEAT)}
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
            connected={seatConnected(RIGHT_SEAT)}
          />
        </div>
      </div>

      {/* Countdown strip — visible for 5 s after tiles are dealt before picker appears */}
      {choosingSalida && choosingSalida.showPicker === false && salidaCountdown !== null && (
        <div className="shrink-0 flex items-center justify-center gap-2 py-2 bg-yellow-500/10 border-y border-yellow-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse shrink-0" />
          <span className="text-yellow-300/90 text-xs font-black tracking-wide">
            Choosing who starts in {salidaCountdown}…
          </span>
        </div>
      )}

      <div className="shrink-0 bg-felt-dark/70 border-t border-white/10">
        <div
          className={clsx(
            'flex items-center px-3 py-1 gap-2',
            isMyTurn && 'bg-white/5',
          )}
        >
          {/* Left: turn indicator + name + tile count */}
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
              {view.myHand.length} tiles
            </span>
          </div>

          {/* Right: Pasar + chat button */}
          <div className="flex items-center gap-2 shrink-0">
            {isMyTurn && playableTiles.size === 0 && (
              <button
                onClick={pass}
                className="bg-orange-500 hover:bg-orange-400 text-white text-[11px] font-black uppercase tracking-widest rounded-lg px-3 py-1 transition-colors active:scale-95"
              >
                Pass →
              </button>
            )}

            <button
              onClick={() => setShowChat((s) => !s)}
              className={clsx(
                'w-8 h-8 flex items-center justify-center rounded-full text-base transition-colors active:scale-90',
                showChat ? 'bg-felt-light text-white' : 'bg-white/5 hover:bg-white/10',
              )}
              title="Chat"
            >
              💬
            </button>
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
          handNumber={handNumber}
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
      <ChatBubbles messages={floatingMessages} mySeat={mySeat} />

      {/* ¿Quién sale? — salida picker */}
      {choosingSalida && choosingSalida.showPicker !== false && (
        <div className="absolute inset-0 z-30 flex items-end bg-black/50 backdrop-blur-sm">
          <div className="w-full bg-felt-dark border-t border-white/15 rounded-t-3xl px-5 pt-5 pb-safe pb-6">
            <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-1">
              {choosingSalida.seats.includes(mySeat) ? 'Your team won!' : 'The winning team picks...'}
            </p>
            <p className="text-white font-black text-xl mb-4">Who starts?</p>

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
                      {seat === mySeat && <p className="text-green-400/70 text-xs">You</p>}
                    </div>
                    <span className="ml-auto text-white/30 text-lg">→</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-3 py-4">
                <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                <p className="text-white/50 text-sm">
                  Waiting for the winning team to choose who starts…
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chat tray — slides up from bottom, z-10 keeps it below ScoreScreen */}
      {showChat && (
        <>
          {/* Backdrop — tap outside tray to close */}
          <div
            className="absolute inset-0 z-10 bg-black/30"
            onClick={() => setShowChat(false)}
          />
          {/* Tray */}
          <div
            className="absolute inset-x-0 bottom-0 z-10 flex flex-col bg-felt-dark border-t border-white/15 rounded-t-3xl animate-slide-up"
            style={{ maxHeight: '58vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/10 shrink-0">
              <span className="text-white font-black text-base">Chat</span>
              <button
                onClick={() => setShowChat(false)}
                className="text-white/40 hover:text-white text-sm transition-colors w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            {/* Message history */}
            <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-3 flex flex-col gap-2.5 min-h-0">
              {chatHistory.length === 0 ? (
                <p className="text-white/25 text-sm text-center py-6">No messages yet 👀</p>
              ) : (
                chatHistory.map((msg) => {
                  const isMe = msg.seat === mySeat;
                  return (
                    <div key={msg.id} className={clsx('flex flex-col gap-0.5', isMe ? 'items-end' : 'items-start')}>
                      {!isMe && (
                        <span className="text-white/40 text-[10px] font-bold px-1">{msg.displayName}</span>
                      )}
                      <div
                        className={clsx(
                          'px-3 py-2 max-w-[78%] break-words',
                          isMe
                            ? 'bg-felt-light text-white rounded-2xl rounded-br-sm'
                            : 'bg-white/15 text-white rounded-2xl rounded-bl-sm',
                        )}
                      >
                        {msg.emoji ? (
                          <span className="text-2xl leading-none">{msg.emoji}</span>
                        ) : (
                          <span className="text-sm leading-snug">{msg.text}</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick emojis */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 py-2.5 border-t border-white/10 shrink-0">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => sendEmoji(emoji)}
                  className="text-2xl w-9 h-9 shrink-0 flex items-center justify-center rounded-xl hover:bg-white/10 active:scale-90 transition-all"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Text input */}
            <form
              onSubmit={handleSendText}
              className="flex gap-2 px-4 py-3 border-t border-white/10 pb-safe shrink-0"
            >
              <input
                type="text"
                maxLength={120}
                placeholder="Escribe un mensaje…"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                className="flex-1 bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-white/40 transition-colors"
              />
              <button
                type="submit"
                disabled={!textInput.trim()}
                className="bg-felt-light hover:bg-felt text-white font-black rounded-2xl px-4 py-2.5 transition-colors disabled:opacity-30 active:scale-95 shrink-0"
              >
                →
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
