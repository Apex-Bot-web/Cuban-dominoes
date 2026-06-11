import { useState } from 'react';
import type { Seat } from '@dominoes/engine';
import { teamOf } from '@dominoes/engine';

interface ScoreBarProps {
  teamScores: readonly [number, number];
  targetScore: number;
  handNumber: number;
  sleepingCount: number;
  botThinking: boolean;
  mySeat?: Seat;
  onLeave?: () => void;
  volume?: number;
  onVolumeChange?: (v: number) => void;
}

export function ScoreBar({
  teamScores, targetScore, handNumber, sleepingCount, botThinking,
  mySeat = 0, onLeave, volume, onVolumeChange,
}: ScoreBarProps) {
  const myTeam = teamOf(mySeat);
  const myScore = teamScores[myTeam];
  const theirScore = teamScores[1 - myTeam as 0 | 1];
  const pct0 = Math.min(100, (myScore / targetScore) * 100);
  const pct1 = Math.min(100, (theirScore / targetScore) * 100);
  const [showSlider, setShowSlider] = useState(false);

  const speakerIcon = volume === undefined ? null
    : volume === 0 ? '🔇'
    : volume < 0.4 ? '🔉'
    : '🔊';

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-felt-dark/80 backdrop-blur border-b border-white/10 shrink-0 pt-safe relative">
      {onLeave && (
        <button onClick={onLeave} className="text-white/30 hover:text-white text-xs font-bold transition-colors shrink-0">
          ←
        </button>
      )}

      {/* My team */}
      <div className="flex flex-col items-center min-w-[52px]">
        <span className="text-[10px] font-bold uppercase tracking-widest text-green-400/80">Nosotros</span>
        <span className="text-2xl font-black text-white tabular-nums leading-none">{myScore}</span>
      </div>

      {/* Progress bars */}
      <div className="flex-1 flex flex-col gap-1">
        <div className="relative h-2.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-700"
            style={{ width: `${pct0}%` }}
          />
        </div>
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

      {/* Opponent team */}
      <div className="flex flex-col items-center min-w-[52px]">
        <span className="text-[10px] font-bold uppercase tracking-widest text-red-400/80">Ellos</span>
        <span className="text-2xl font-black text-white tabular-nums leading-none">{theirScore}</span>
      </div>

      {/* Meta */}
      <div className="flex flex-col items-end gap-0.5 min-w-[42px] shrink-0">
        <span className="text-white/40 text-[10px] font-mono">Mano {handNumber}</span>
        <span className="text-white/30 text-[10px] font-mono">{sleepingCount} duerm.</span>
        {botThinking && (
          <span className="text-yellow-400 text-[10px] font-black tracking-widest animate-pulse">●●●</span>
        )}
      </div>

      {/* Music volume button + popover */}
      {speakerIcon !== null && onVolumeChange && (
        <div className="relative shrink-0">
          <button
            onClick={() => setShowSlider((s) => !s)}
            className="text-white/30 hover:text-white/70 text-base transition-colors"
            title="Volumen de música"
          >
            {speakerIcon}
          </button>

          {showSlider && (
            <>
              {/* Dismiss backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowSlider(false)}
              />
              <div className="absolute right-0 top-full mt-2 z-50 bg-felt-dark border border-white/15 rounded-2xl px-4 py-3 shadow-2xl flex flex-col items-center gap-2 min-w-[130px]">
                <span className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Música</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round((volume ?? 0.12) * 100)}
                  onChange={(e) => onVolumeChange(Number(e.target.value) / 100)}
                  className="w-24 accent-green-400 cursor-pointer"
                />
                <span className="text-white/50 text-[11px] font-mono tabular-nums">
                  {Math.round((volume ?? 0.12) * 100)}%
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
