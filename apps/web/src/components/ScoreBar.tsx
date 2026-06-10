interface ScoreBarProps {
  teamScores: readonly [number, number];
  targetScore: number;
  handNumber: number;
  sleepingCount: number;
  botThinking: boolean;
}

export function ScoreBar({ teamScores, targetScore, handNumber, sleepingCount, botThinking }: ScoreBarProps) {
  const [t0, t1] = teamScores;
  const pct0 = Math.min(100, (t0 / targetScore) * 100);
  const pct1 = Math.min(100, (t1 / targetScore) * 100);

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-felt-dark/80 backdrop-blur border-b border-white/10 shrink-0 pt-safe">
      {/* Team 0 — us */}
      <div className="flex flex-col items-center min-w-[52px]">
        <span className="text-[10px] font-bold uppercase tracking-widest text-green-400/80">Nosotros</span>
        <span className="text-2xl font-black text-white tabular-nums leading-none">{t0}</span>
      </div>

      {/* Progress bars */}
      <div className="flex-1 flex flex-col gap-1">
        {/* Nosotros */}
        <div className="relative h-2.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-700"
            style={{ width: `${pct0}%` }}
          />
        </div>
        {/* Ellos */}
        <div className="relative h-2.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-600 to-rose-400 rounded-full transition-all duration-700"
            style={{ width: `${pct1}%` }}
          />
        </div>
        <div className="flex justify-between text-white/20 text-[9px] font-mono -mt-0.5">
          <span>0</span>
          <span>{targetScore}</span>
        </div>
      </div>

      {/* Team 1 — them */}
      <div className="flex flex-col items-center min-w-[52px]">
        <span className="text-[10px] font-bold uppercase tracking-widest text-red-400/80">Ellos</span>
        <span className="text-2xl font-black text-white tabular-nums leading-none">{t1}</span>
      </div>

      {/* Meta */}
      <div className="flex flex-col items-end gap-0.5 min-w-[42px] shrink-0">
        <span className="text-white/40 text-[10px] font-mono">Mano {handNumber}</span>
        <span className="text-white/30 text-[10px] font-mono">{sleepingCount} duerm.</span>
        {botThinking && (
          <span className="text-yellow-400 text-[10px] font-black tracking-widest animate-pulse">●●●</span>
        )}
      </div>
    </div>
  );
}
