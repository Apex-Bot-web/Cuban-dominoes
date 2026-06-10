interface ScoreBarProps {
  teamScores: readonly [number, number];
  targetScore: number;
  handNumber: number;
  sleepingCount: number;
  botThinking: boolean;
}

export function ScoreBar({ teamScores, targetScore, handNumber, sleepingCount, botThinking }: ScoreBarProps) {
  const t0 = teamScores[0];
  const t1 = teamScores[1];
  const pct0 = Math.min(100, (t0 / targetScore) * 100);
  const pct1 = Math.min(100, (t1 / targetScore) * 100);

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-felt-dark border-b border-white/10 shrink-0">
      {/* Team labels */}
      <div className="flex flex-col items-center min-w-[52px]">
        <span className="text-green-300 text-xs font-bold leading-none">Nosotros</span>
        <span className="text-white text-lg font-black leading-none tabular-nums">{t0}</span>
      </div>

      {/* Progress bars */}
      <div className="flex-1 flex flex-col gap-0.5">
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-400 rounded-full transition-all duration-500"
            style={{ width: `${pct0}%` }}
          />
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-red-400 rounded-full transition-all duration-500"
            style={{ width: `${pct1}%` }}
          />
        </div>
        <div className="flex justify-between text-white/30 text-[9px] font-mono">
          <span>0</span>
          <span>{targetScore / 2}</span>
          <span>{targetScore}</span>
        </div>
      </div>

      <div className="flex flex-col items-center min-w-[52px]">
        <span className="text-red-300 text-xs font-bold leading-none">Ellos</span>
        <span className="text-white text-lg font-black leading-none tabular-nums">{t1}</span>
      </div>

      {/* Meta info */}
      <div className="flex flex-col items-end gap-0.5 min-w-[44px]">
        <span className="text-green-400/60 text-[10px] font-mono">Mano {handNumber}</span>
        <span className="text-green-400/60 text-[10px] font-mono">{sleepingCount} duerm.</span>
        {botThinking && (
          <span className="text-yellow-400/80 text-[10px] animate-pulse font-bold">●●●</span>
        )}
      </div>
    </div>
  );
}
