import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import type { Socket } from 'socket.io-client';
import type { BotLevel, PlayerView, RoomSeatView, RoomView, Seat } from '../types/socket';

const SEAT_LABELS = ['You (seat 0)', 'Seat 1', 'Seat 2', 'Seat 3'];
const BOT_LEVELS: { level: BotLevel; label: string; desc: string }[] = [
  { level: 'facil', label: 'Easy',   desc: 'Plays randomly'   },
  { level: 'medio', label: 'Medium', desc: 'Plays heavy tiles' },
  { level: 'duro',  label: 'Hard',   desc: 'Counts & thinks'  },
];

interface LobbyScreenProps {
  socket: Socket;
  initialRoom: RoomView;
  onGameStart: (view: PlayerView, room: RoomView) => void;
  onLeave: () => void;
}

export function LobbyScreen({ socket, initialRoom, onGameStart, onLeave }: LobbyScreenProps) {
  const [room, setRoom] = useState<RoomView>(initialRoom);
  const [botPickSeat, setBotPickSeat] = useState<Seat | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    function onRoomUpdated(r: RoomView) { setRoom(r); }
    function onGameState(view: PlayerView) { onGameStart(view, room); }
    function onError(e: { message: string }) { setError(e.message); }

    socket.on('room:updated', onRoomUpdated);
    socket.on('game:state', onGameState);
    socket.on('error', onError);
    return () => {
      socket.off('room:updated', onRoomUpdated);
      socket.off('game:state', onGameState);
      socket.off('error', onError);
    };
  }, [socket, room, onGameStart]);

  function copyCode() {
    void navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function fillBot(seat: Seat, level: BotLevel) {
    socket.emit('room:set-bot', { seat, level });
    setBotPickSeat(null);
  }

  function removeBot(seat: Seat) {
    socket.emit('room:set-bot', { seat, level: null });
  }

  function startGame() {
    setError('');
    socket.emit('room:start', {});
  }

  const allFilled = room.seats.every((s) => s !== null);
  const canStart = room.isHost && allFilled;
  const emptyCount = room.seats.filter((s) => !s).length;

  return (
    <div className="h-full flex flex-col felt-texture overflow-hidden select-none">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 pt-safe py-3 border-b border-white/10 bg-black/20">
        <button
          onClick={onLeave}
          className="text-white/40 hover:text-white transition-colors text-sm font-bold"
        >
          ← Leave
        </button>
        <span className="flex-1 text-white font-black text-base">Room</span>
        {/* Room code badge */}
        <button
          onClick={copyCode}
          className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl px-3 py-1.5 transition-colors"
        >
          <span className="text-white font-black text-lg tracking-widest">{room.code}</span>
          <span className="text-white/40 text-xs">{copied ? '✓' : '⎘'}</span>
        </button>
      </div>

      {/* Seats */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-1">Players</p>

        {room.seats.map((seat, i) => (
          <SeatCard
            key={i}
            index={i as Seat}
            seat={seat}
            isHost={room.isHost}
            onAddBot={() => setBotPickSeat(i as Seat)}
            onRemoveBot={() => removeBot(i as Seat)}
          />
        ))}

        {error && (
          <p className="text-red-400 text-sm font-semibold mt-1">{error}</p>
        )}

        {!room.isHost && (
          <p className="text-white/30 text-sm text-center mt-4">
            Waiting for the host to start the game…
          </p>
        )}
      </div>

      {/* Start button (host only) */}
      {room.isHost && (
        <div className="shrink-0 px-4 pb-safe py-3 bg-black/20 border-t border-white/10">
          <button
            onClick={startGame}
            disabled={!canStart}
            className={clsx(
              'w-full font-black text-lg rounded-2xl py-4 transition-all',
              canStart
                ? 'bg-green-600 hover:bg-green-500 text-white active:scale-95'
                : 'bg-white/10 text-white/25 cursor-not-allowed',
            )}
          >
            {allFilled
              ? 'Start Game!'
              : `Waiting for ${emptyCount} more player${emptyCount !== 1 ? 's' : ''}`}
          </button>
        </div>
      )}

      {/* Bot level picker modal */}
      {botPickSeat !== null && (
        <div
          className="absolute inset-0 z-30 bg-black/60 flex items-end"
          onClick={() => setBotPickSeat(null)}
        >
          <div
            className="w-full bg-felt-dark border-t border-white/15 rounded-t-3xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-white font-black text-base mb-4">
              Add bot — {SEAT_LABELS[botPickSeat]}
            </p>
            <div className="flex flex-col gap-2">
              {BOT_LEVELS.map(({ level, label, desc }) => (
                <button
                  key={level}
                  onClick={() => fillBot(botPickSeat, level)}
                  className="flex items-center gap-3 bg-white/10 hover:bg-white/20 border border-white/15 rounded-xl px-4 py-3 text-left transition-colors"
                >
                  <span className="text-2xl">{level === 'facil' ? '😌' : level === 'medio' ? '🤔' : '🧠'}</span>
                  <div>
                    <p className="text-white font-black text-sm">{label}</p>
                    <p className="text-white/40 text-xs">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Seat card ─────────────────────────────────────────────────────────────────

interface SeatCardProps {
  index: Seat;
  seat: RoomSeatView | null;
  isHost: boolean;
  onAddBot: () => void;
  onRemoveBot: () => void;
}

function SeatCard({ index, seat, isHost, onAddBot, onRemoveBot }: SeatCardProps) {
  if (!seat) {
    return (
      <div className="flex items-center gap-3 bg-black/20 border border-white/10 border-dashed rounded-xl px-4 py-3">
        <span className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-white/20 text-lg">+</span>
        <span className="text-white/25 text-sm flex-1">Empty</span>
        {isHost && index !== 0 && (
          <button
            onClick={onAddBot}
            className="text-white/40 hover:text-white text-xs font-bold border border-white/20 hover:border-white/40 rounded-lg px-2 py-1 transition-colors"
          >
            + Bot
          </button>
        )}
      </div>
    );
  }

  if (seat.type === 'bot') {
    return (
      <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
        <span className="text-2xl">🤖</span>
        <div className="flex-1">
          <p className="text-white/70 font-bold text-sm">{seat.displayName}</p>
          <p className="text-white/30 text-xs">Bot</p>
        </div>
        {isHost && (
          <button
            onClick={onRemoveBot}
            className="text-white/30 hover:text-red-400 text-xs font-bold transition-colors"
          >
            ✕
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'flex items-center gap-3 border rounded-xl px-4 py-3',
        seat.isMe
          ? 'bg-green-500/10 border-green-500/30'
          : 'bg-white/5 border-white/10',
      )}
    >
      <span
        className={clsx(
          'w-2 h-2 rounded-full shrink-0',
          seat.connected
            ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.8)] animate-pulse'
            : 'bg-red-400',
        )}
      />
      <div className="flex-1">
        <p className={clsx('font-bold text-sm', seat.isMe ? 'text-green-300' : 'text-white')}>
          {seat.displayName} {seat.isMe && <span className="text-green-500/70 text-xs font-normal">(you)</span>}
        </p>
        <p className="text-white/30 text-xs">{seat.connected ? 'Connected' : 'Disconnected'}</p>
      </div>
    </div>
  );
}
