import { useState } from 'react';
import { clsx } from 'clsx';
import { io } from 'socket.io-client';
import type { BotLevel, RoomView } from '../types/socket';
import type { Socket } from 'socket.io-client';

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
  onEditAccount: () => void;
}

const BOT_LEVELS: { level: BotLevel; emoji: string; label: string }[] = [
  { level: 'facil', emoji: '😌', label: 'Easy' },
  { level: 'medio', emoji: '🤔', label: 'Medium' },
  { level: 'duro',  emoji: '🧠', label: 'Hard'  },
];

export function HomeScreen({ onSolo, onMultiplayer, onMatchmaking, onStats, onEditAccount }: HomeScreenProps) {
  const [displayName] = useState(getSavedName);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState<'create' | 'join' | 'queue' | null>(null);
  const [botLevel, setBotLevel] = useState<BotLevel>('medio');

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
    <div className="h-full flex flex-col items-center justify-center gap-6 px-6 felt-texture">
      {/* Title */}
      <div className="text-center">
        <div className="text-6xl mb-3 leading-none select-none">🁣</div>
        <h1 className="text-4xl font-black text-white tracking-tight">Cuban Domino</h1>
        <p className="text-white/40 text-sm mt-1">Double-9 · 4 players · up to 100 points</p>
      </div>

      {/* Account pill */}
      <button
        onClick={onEditAccount}
        className="flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/15 rounded-2xl px-4 py-2.5 transition-colors"
      >
        <span className="text-lg">👤</span>
        <span className="text-white font-bold text-sm">{displayName || 'Set your name'}</span>
        <span className="text-white/30 text-xs">✎</span>
      </button>

      {/* Error */}
      {error && (
        <p className="text-red-400 text-sm font-semibold text-center -mt-2 max-w-xs">{error}</p>
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
