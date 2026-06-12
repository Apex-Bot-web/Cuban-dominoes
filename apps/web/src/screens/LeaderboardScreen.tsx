import { useEffect, useState } from 'react';

const SERVER_URL =
  (import.meta.env['VITE_SERVER_URL'] as string | undefined) ??
  (import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin);

interface Entry {
  displayName: string;
  matchesPlayed: number;
  wins: number;
  winRate: number;
}

const MEDALS = ['🥇', '🥈', '🥉'];

interface LeaderboardScreenProps {
  onBack: () => void;
}

export function LeaderboardScreen({ onBack }: LeaderboardScreenProps) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${SERVER_URL}/api/leaderboard`)
      .then((r) => r.json() as Promise<Entry[]>)
      .then((data) => { setEntries(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const myPlayerId = localStorage.getItem('dominoes-player-id');

  return (
    <div className="h-full flex flex-col felt-texture">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-felt-dark/80 border-b border-white/10 pt-safe shrink-0">
        <button
          onClick={onBack}
          className="w-11 h-11 flex items-center justify-center text-white/40 active:text-white rounded-xl active:bg-white/10 transition-colors"
        >
          ←
        </button>
        <h1 className="text-white font-black text-lg flex-1 text-center">Leaderboard</h1>
        <div className="w-11" />
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <span className="text-white/40 text-sm animate-pulse">Loading…</span>
          </div>
        )}

        {!loading && entries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <span className="text-5xl">🏆</span>
            <p className="text-white/50 text-sm max-w-xs">
              No one on the board yet.<br />
              Play 3+ online matches to appear here.
            </p>
          </div>
        )}

        {entries.length > 0 && (
          <div className="flex flex-col gap-2 max-w-sm mx-auto">
            <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest text-center mb-2">
              Top players · 3+ matches required
            </p>
            {entries.map((e, i) => {
              const medal = MEDALS[i] ?? null;
              const isMe = myPlayerId !== null && false; // can't check without knowing their playerId
              void isMe;
              return (
                <div
                  key={i}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 border ${
                    i === 0
                      ? 'bg-yellow-500/10 border-yellow-500/30'
                      : i < 3
                      ? 'bg-white/5 border-white/15'
                      : 'bg-black/20 border-white/5'
                  }`}
                >
                  {/* Rank */}
                  <span className="text-xl w-8 text-center shrink-0">
                    {medal ?? <span className="text-white/30 font-black text-sm">#{i + 1}</span>}
                  </span>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-black text-sm truncate ${i === 0 ? 'text-yellow-200' : 'text-white'}`}>
                      {e.displayName}
                    </p>
                    <p className="text-white/30 text-[10px] font-mono">
                      {e.matchesPlayed} games
                    </p>
                  </div>

                  {/* Wins */}
                  <div className="text-center shrink-0">
                    <div className={`text-xl font-black tabular-nums ${i === 0 ? 'text-yellow-200' : 'text-white'}`}>
                      {e.wins}
                    </div>
                    <div className="text-white/30 text-[9px] uppercase tracking-widest">wins</div>
                  </div>

                  {/* Win rate */}
                  <div className="text-center shrink-0 min-w-[46px]">
                    <div className="text-sm font-black tabular-nums text-green-300">{e.winRate}%</div>
                    <div className="text-white/30 text-[9px] uppercase tracking-widest">rate</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
