import { useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import type { PlayerView, QueueUpdate, RoomView } from '../types/socket';

interface MatchmakingScreenProps {
  socket: Socket;
  displayName: string;
  onMatched: (view: PlayerView, room: RoomView) => void;
  onCancel: () => void;
}

export function MatchmakingScreen({
  socket,
  displayName,
  onMatched,
  onCancel,
}: MatchmakingScreenProps) {
  const [queueInfo, setQueueInfo] = useState<QueueUpdate | null>(null);
  const [error, setError] = useState('');
  const onMatchedRef = useRef(onMatched);
  onMatchedRef.current = onMatched;

  useEffect(() => {
    socket.emit('queue:join', { displayName });

    function handleUpdate(info: QueueUpdate) { setQueueInfo(info); }
    function handleMatched(payload: { view: PlayerView; room: RoomView }) {
      onMatchedRef.current(payload.view, payload.room);
    }
    function handleError(e: { message: string }) { setError(e.message); }

    socket.on('queue:update', handleUpdate);
    socket.on('queue:matched', handleMatched);
    socket.on('error', handleError);

    return () => {
      socket.off('queue:update', handleUpdate);
      socket.off('queue:matched', handleMatched);
      socket.off('error', handleError);
    };
  }, [socket, displayName]);

  function handleCancel() {
    socket.emit('queue:leave', {});
    socket.disconnect();
    onCancel();
  }

  const filledSeats = Math.min(queueInfo?.size ?? 1, 4);

  return (
    <div className="h-full flex flex-col items-center justify-center gap-8 px-6 felt-texture">
      <div className="text-center">
        <div className="text-6xl mb-3 select-none animate-bounce">🎲</div>
        <h1 className="text-2xl font-black text-white">Finding a match…</h1>
        <p className="text-white/40 text-sm mt-1">
          Bots will fill in if not enough players join in 45s
        </p>
      </div>

      {/* Seat indicators */}
      <div className="flex gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center transition-all duration-500 ${
              i < filledSeats
                ? 'bg-green-500/20 border-green-500/60 shadow-[0_0_12px_rgba(74,222,128,0.3)]'
                : 'bg-white/5 border-white/10'
            }`}
          >
            <span className="text-2xl">{i < filledSeats ? '🙋' : '⏳'}</span>
          </div>
        ))}
      </div>

      <p className="text-white/60 text-base font-bold tabular-nums">
        {filledSeats} / 4 players found
      </p>

      {error && (
        <p className="text-red-400 text-sm font-semibold text-center max-w-xs">{error}</p>
      )}

      <button
        onClick={handleCancel}
        className="text-white/40 hover:text-white/70 text-sm font-bold transition-colors px-6 py-2 rounded-xl hover:bg-white/5"
      >
        Cancel search
      </button>
    </div>
  );
}
