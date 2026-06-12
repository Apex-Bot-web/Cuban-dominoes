import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import type { PlayerStatsView } from '../types/socket';

// ── Achievements ──────────────────────────────────────────────────────────────

const ACHIEVEMENTS: {
  id: string;
  emoji: string;
  label: string;
  desc: string;
  earned: (s: PlayerStatsView) => boolean;
}[] = [
  { id: 'first',    emoji: '🎉', label: 'First Win',    desc: 'Win your first match',             earned: (s) => s.wins >= 1 },
  { id: 'five',     emoji: '⚡', label: 'On a Roll',    desc: 'Win 5 matches',                    earned: (s) => s.wins >= 5 },
  { id: 'veteran',  emoji: '🎖', label: 'Veteran',      desc: 'Play 10 matches',                  earned: (s) => s.matchesPlayed >= 10 },
  { id: 'streak3',  emoji: '🔥', label: 'Hot Streak',   desc: 'Win 3 in a row',                   earned: (s) => s.currentStreak >= 3 },
  { id: 'sharp',    emoji: '🧠', label: 'Sharp Mind',   desc: '60%+ win rate (5+ games)',         earned: (s) => s.matchesPlayed >= 5 && s.winRate >= 60 },
  { id: 'fifty',    emoji: '🏆', label: 'Champion',     desc: 'Win 50 matches',                   earned: (s) => s.wins >= 50 },
  { id: 'century',  emoji: '💯', label: 'Centurion',    desc: 'Score 1,000+ total points',        earned: (s) => s.totalPointsScored >= 1000 },
  { id: 'hundred',  emoji: '👑', label: 'Domino King',  desc: 'Play 100 matches',                 earned: (s) => s.matchesPlayed >= 100 },
];

function AchievementGrid({ stats }: { stats: PlayerStatsView }) {
  const earned = ACHIEVEMENTS.filter((a) => a.earned(stats));
  const locked = ACHIEVEMENTS.filter((a) => !a.earned(stats));
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
      <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-3">
        Achievements — {earned.length}/{ACHIEVEMENTS.length}
      </p>
      <div className="grid grid-cols-4 gap-2">
        {ACHIEVEMENTS.map((a) => {
          const done = a.earned(stats);
          return (
            <div
              key={a.id}
              className={clsx(
                'flex flex-col items-center gap-1 rounded-xl p-2 text-center transition-all',
                done ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-white/5 border border-white/5 opacity-40',
              )}
            >
              <span className="text-2xl leading-none">{a.emoji}</span>
              <span className={clsx('text-[9px] font-bold leading-tight', done ? 'text-white' : 'text-white/50')}>
                {a.label}
              </span>
            </div>
          );
        })}
      </div>
      {locked.length > 0 && (
        <p className="text-white/25 text-[10px] mt-3 text-center">
          Next: {locked[0]!.desc}
        </p>
      )}
    </div>
  );
}

const SERVER_URL =
  (import.meta.env['VITE_SERVER_URL'] as string | undefined) ??
  (import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin);

interface StatsScreenProps {
  onBack: () => void;
}

export function StatsScreen({ onBack }: StatsScreenProps) {
  const [stats, setStats] = useState<PlayerStatsView | null>(null);
  const [loading, setLoading] = useState(true);
  const [noData, setNoData] = useState(false);

  useEffect(() => {
    const playerId = localStorage.getItem('dominoes-player-id');
    if (!playerId) { setLoading(false); setNoData(true); return; }

    fetch(`${SERVER_URL}/api/stats/${encodeURIComponent(playerId)}`)
      .then((r) => (r.ok ? (r.json() as Promise<PlayerStatsView>) : Promise.reject()))
      .then((data) => { setStats(data); setLoading(false); })
      .catch(() => { setLoading(false); setNoData(true); });
  }, []);

  const streak = stats?.currentStreak ?? 0;
  const streakLabel =
    streak === 0 ? '—' : streak > 0 ? `${streak}W 🔥` : `${Math.abs(streak)}L`;

  return (
    <div className="h-full flex flex-col felt-texture">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-felt-dark/80 border-b border-white/10 pt-safe shrink-0">
        <button
          onClick={onBack}
          className="text-white/40 hover:text-white text-sm font-bold transition-colors"
        >
          ← Back
        </button>
        <h1 className="text-white font-black text-lg flex-1 text-center">My Stats</h1>
        <div className="w-14" />
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-6">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <span className="text-white/40 text-sm animate-pulse">Loading…</span>
          </div>
        )}

        {noData && !loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <span className="text-5xl">🎲</span>
            <p className="text-white/50 text-sm max-w-xs">
              No matches recorded yet.<br />
              Play an online match to start tracking your stats.
            </p>
          </div>
        )}

        {stats && !loading && (
          <div className="flex flex-col gap-4 max-w-sm mx-auto">
            {/* Player name */}
            <div className="text-center pb-2">
              <div className="text-5xl mb-3">🏆</div>
              <h2 className="text-white font-black text-2xl">{stats.displayName}</h2>
            </div>

            {/* Win / played / loss */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-green-900/30 border border-green-500/20 rounded-2xl p-4 text-center">
                <div className="text-3xl font-black text-green-300 tabular-nums">{stats.wins}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-green-400/60 mt-1">Won</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                <div className="text-3xl font-black text-white tabular-nums">{stats.matchesPlayed}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/40 mt-1">Played</div>
              </div>
              <div className="bg-red-900/20 border border-red-500/15 rounded-2xl p-4 text-center">
                <div className="text-3xl font-black text-red-300 tabular-nums">{stats.losses}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-red-400/50 mt-1">Lost</div>
              </div>
            </div>

            {/* Win rate bar */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/50 text-xs font-bold uppercase tracking-widest">
                  Win Rate
                </span>
                <span className="text-white font-black text-xl tabular-nums">{stats.winRate}%</span>
              </div>
              <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full"
                  style={{
                    width: `${stats.winRate}%`,
                    transition: 'width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }}
                />
              </div>
            </div>

            {/* Detail stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <div
                  className={clsx(
                    'text-2xl font-black tabular-nums',
                    streak > 0 ? 'text-orange-300' : streak < 0 ? 'text-red-300' : 'text-white/40',
                  )}
                >
                  {streakLabel}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/40 mt-1">
                  Current Streak
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <div className="text-2xl font-black text-white tabular-nums">
                  {stats.totalHandsPlayed}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/40 mt-1">
                  Hands Played
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 col-span-2">
                <div className="text-2xl font-black text-white tabular-nums">
                  {stats.totalPointsScored}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/40 mt-1">
                  Total Points Scored
                </div>
              </div>
            </div>

            {/* Achievements */}
            <AchievementGrid stats={stats} />
          </div>
        )}
      </div>
    </div>
  );
}
