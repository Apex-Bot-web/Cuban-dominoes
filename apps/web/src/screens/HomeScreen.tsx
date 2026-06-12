import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { io } from 'socket.io-client';
import type { BotLevel, RoomView } from '../types/socket';
import type { Socket } from 'socket.io-client';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { useLoginStreak } from '../hooks/useLoginStreak';

// Dev: connect to the server dev port. Prod: same origin (server also serves the web build).
const SERVER_URL = import.meta.env['VITE_SERVER_URL'] ?? (import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin);

function getOrCreatePlayerId(): string {
  let id = localStorage.getItem('dominoes-player-id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('dominoes-player-id', id);
  }
  return id;
}

function getSavedName(): string {
  return localStorage.getItem('dominoes-display-name') ?? '';
}

interface HomeScreenProps {
  onSolo: (level: BotLevel) => void;
  onMultiplayer: (socket: Socket, room: RoomView) => void;
  onMatchmaking: (socket: Socket, displayName: string) => void;
  onStats: () => void;
  onLeaderboard: () => void;
  onEditAccount: () => void;
  onFriends: () => void;
}

const BOT_LEVELS: { level: BotLevel; emoji: string; label: string }[] = [
  { level: 'facil', emoji: '😌', label: 'Easy' },
  { level: 'medio', emoji: '🤔', label: 'Medium' },
  { level: 'duro',  emoji: '🧠', label: 'Hard'  },
];

export function HomeScreen({ onSolo, onMultiplayer, onMatchmaking, onStats, onLeaderboard, onEditAccount, onFriends }: HomeScreenProps) {
  const [displayName] = useState(getSavedName);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState<'create' | 'join' | 'queue' | null>(null);
  const [botLevel, setBotLevel] = useState<BotLevel>('medio');
  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  const streak = useLoginStreak();
  const { showBanner, install, dismiss } = useInstallPrompt();

  // Presence heartbeat while on home screen
  useEffect(() => {
    const pid = localStorage.getItem('dominoes-player-id');
    if (!pid) return;
    const beat = () =>
      fetch(`${SERVER_URL}/api/heartbeat/${encodeURIComponent(pid)}`, { method: 'POST' }).catch(() => {});
    void beat();
    const iv = setInterval(beat, 60_000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    fetch(`${SERVER_URL}/api/online`)
      .then((r) => r.json() as Promise<{ count: number }>)
      .then((d) => setOnlineCount(d.count))
      .catch(() => {});
    const iv = setInterval(() => {
      fetch(`${SERVER_URL}/api/online`)
        .then((r) => r.json() as Promise<{ count: number }>)
        .then((d) => setOnlineCount(d.count))
        .catch(() => {});
    }, 30_000);
    return () => clearInterval(iv);
  }, []);

  function connect(onConnected: (socket: Socket) => void) {
    const playerId = getOrCreatePlayerId();
    const socket = io(SERVER_URL, {
      auth: { playerId },
      transports: ['websocket'],
    });

    socket.once('connect', () => onConnected(socket));
    socket.once('connect_error', (err) => {
      setError(`Could not connect to server: ${err.message}`);
      setLoading(null);
      socket.disconnect();
    });
  }

  function handleCreate() {
    const name = displayName.trim();
    if (!name) { setError('Please set a display name first'); return; }
    setError('');
    setLoading('create');

    connect((socket) => {
      socket.emit('room:create', { displayName: name });
      socket.once('room:updated', (room: RoomView) => {
        setLoading(null);
        onMultiplayer(socket, room);
      });
      socket.once('error', (e: { message: string }) => {
        setError(e.message);
        setLoading(null);
        socket.disconnect();
      });
    });
  }

  function handleFindMatch() {
    const name = displayName.trim();
    if (!name) { setError('Please set a display name first'); return; }
    setError('');
    setLoading('queue');

    connect((socket) => {
      setLoading(null);
      onMatchmaking(socket, name);
    });
  }

  function handleJoin() {
    const name = displayName.trim();
    const code = joinCode.trim().toUpperCase();
    if (!name) { setError('Please set a display name first'); return; }
    if (!code) { setError('Enter a room code'); return; }
    setError('');
    setLoading('join');

    connect((socket) => {
      socket.emit('room:join', { code, displayName: name });
      socket.once('room:updated', (room: RoomView) => {
        setLoading(null);
        onMultiplayer(socket, room);
      });
      socket.once('error', (e: { message: string }) => {
        setError(e.message);
        setLoading(null);
        socket.disconnect();
      });
    });
  }

  return (
    <div className="h-full flex flex-col items-center justify-center gap-5 px-6 felt-texture">
      {/* Title */}
      <div className="text-center">
        <div className="text-5xl mb-2 leading-none select-none">🁣</div>
        <h1 className="text-3xl font-black text-white tracking-tight">Cuban Domino</h1>
        {onlineCount !== null && onlineCount > 0 && (
          <p className="text-green-400/80 text-xs font-bold mt-1 flex items-center justify-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
            {onlineCount.toLocaleString()} online now
          </p>
        )}
      </div>

      {/* Account row + streak + leaderboard */}
      <div className="flex items-center gap-2 w-full max-w-xs">
        <button
          onClick={onEditAccount}
          className="flex items-center gap-2 bg-white/10 active:bg-white/20 border border-white/15 rounded-2xl px-3 py-2.5 transition-colors flex-1 min-w-0"
        >
          <span className="text-base">👤</span>
          <span className="text-white font-bold text-sm truncate">{displayName || 'Set your name'}</span>
          <span className="text-white/30 text-xs ml-auto shrink-0">✎</span>
        </button>

        {streak > 1 && (
          <div className="flex flex-col items-center bg-orange-500/20 border border-orange-500/30 rounded-2xl px-3 py-2 shrink-0">
            <span className="text-lg leading-none">🔥</span>
            <span className="text-orange-300 font-black text-xs tabular-nums">{streak}</span>
          </div>
        )}

        <button
          onClick={onFriends}
          className="w-12 h-12 flex items-center justify-center bg-white/10 active:bg-white/20 border border-white/15 rounded-2xl transition-colors shrink-0 text-xl"
          title="Friends"
        >
          👥
        </button>

        <button
          onClick={onLeaderboard}
          className="w-12 h-12 flex items-center justify-center bg-white/10 active:bg-white/20 border border-white/15 rounded-2xl transition-colors shrink-0 text-xl"
        >
          🏆
        </button>
      </div>

      {/* Error */}
      {error && (
        <p className="text-red-400 text-sm font-semibold text-center -mt-1 max-w-xs">{error}</p>
      )}

      {/* PWA install banner */}
      {showBanner && (
        <div className="w-full max-w-xs flex items-center gap-3 bg-indigo-600/30 border border-indigo-500/40 rounded-2xl px-4 py-3">
          <span className="text-2xl shrink-0">📲</span>
          <div className="flex-1 min-w-0">
            <p className="text-white font-black text-sm leading-tight">Add to Home Screen</p>
            <p className="text-white/50 text-xs">Play without the browser bar</p>
          </div>
          <button
            onClick={install}
            className="shrink-0 bg-indigo-500 active:bg-indigo-400 text-white font-black text-xs rounded-xl px-3 py-2 transition-colors"
          >
            Install
          </button>
          <button
            onClick={dismiss}
            className="shrink-0 text-white/30 active:text-white/60 text-lg leading-none w-6 h-6 flex items-center justify-center"
          >
            ×
          </button>
        </div>
      )}

      {/* Buttons */}
      <div className="w-full max-w-xs flex flex-col gap-3">
        {/* Difficulty pills */}
        <div className="flex gap-2">
          {BOT_LEVELS.map(({ level, emoji, label }) => (
            <button
              key={level}
              onClick={() => setBotLevel(level)}
              className={clsx(
                'flex-1 flex flex-col items-center gap-0.5 rounded-xl py-2.5 transition-all text-sm font-black',
                botLevel === level
                  ? 'bg-felt-light text-white ring-2 ring-white/25'
                  : 'bg-white/10 text-white/50 hover:bg-white/15',
              )}
            >
              <span className="text-base leading-none">{emoji}</span>
              <span className="leading-none">{label}</span>
            </button>
          ))}
        </div>
        {/* Solo */}
        <button
          onClick={() => onSolo(botLevel)}
          className="w-full bg-felt-light hover:bg-felt text-white font-black text-lg rounded-2xl py-4 transition-colors active:scale-95"
        >
          🤖 Solo vs Bots
        </button>

        {/* Matchmaking */}
        <button
          onClick={handleFindMatch}
          disabled={loading !== null}
          className={clsx(
            'w-full font-black text-lg rounded-2xl py-4 transition-colors active:scale-95',
            loading === 'queue'
              ? 'bg-purple-700 text-white/60 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-500 text-white',
          )}
        >
          {loading === 'queue' ? 'Connecting…' : '🌐 Play Now'}
        </button>

        {/* Stats */}
        <button
          onClick={onStats}
          className="w-full bg-white/10 hover:bg-white/15 text-white/60 hover:text-white font-bold text-base rounded-2xl py-3 transition-colors active:scale-95"
        >
          📊 My Stats
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-white/15" />
          <span className="text-white/30 text-xs font-bold uppercase tracking-widest">or private room</span>
          <div className="flex-1 h-px bg-white/15" />
        </div>

        {/* Create */}
        <button
          onClick={handleCreate}
          disabled={loading !== null}
          className={clsx(
            'w-full font-black text-lg rounded-2xl py-4 transition-colors active:scale-95',
            loading === 'create'
              ? 'bg-green-700 text-white/60 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-500 text-white',
          )}
        >
          {loading === 'create' ? 'Creating…' : '+ Create Room'}
        </button>

        {/* Join */}
        <div className="flex gap-2">
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            placeholder="CODE"
            maxLength={6}
            className="flex-1 bg-white/10 border border-white/20 text-white placeholder-white/25 rounded-xl px-3 py-3 text-base font-black text-center tracking-widest outline-none focus:border-white/50 transition-colors uppercase"
          />
          <button
            onClick={handleJoin}
            disabled={loading !== null}
            className={clsx(
              'font-black text-base rounded-xl px-5 py-3 transition-colors active:scale-95',
              loading === 'join'
                ? 'bg-blue-700 text-white/60 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-500 text-white',
            )}
          >
            {loading === 'join' ? '…' : 'Join'}
          </button>
        </div>
      </div>
    </div>
  );
}
