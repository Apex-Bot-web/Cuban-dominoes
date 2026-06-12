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
  const [showVolume, setShowVolume] = useState(false);

  const speakerIcon = volume === undefined ? null
    : volume === 0 ? '🔇'
    : volume < 0.4 ? '🔉'
    : '🔊';

  return (
    <div className="flex flex-col bg-felt-dark/80 backdrop-blur border-b border-white/10 shrink-0 pt-safe">
      {/* Main bar row */}
      <div className="flex items-center gap-2 px-2 py-2">
        {/* Leave button — 44×44 touch target */}
        {onLeave && (
          <button
            onClick={onLeave}
            className="w-11 h-11 flex items-center justify-center text-white/40 active:text-white rounded-xl active:bg-white/10 transition-colors shrink-0"
          >
            <span className="text-lg font-bold">←</span>
          </button>
        )}

        {/* My team score */}
        <div className="flex flex-col items-center min-w-[44px]">
          <span className="text-[9px] font-bold uppercase tracking-widest text-green-400/80">Us</span>
          <span className="text-2xl font-black text-white tabular-nums leading-none">{myScore}</span>
        </div>

        {/* Progress bars */}
        <div className="flex-1 flex flex-col gap-1">
          <div className="relative h-2.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-500 to-emerald-400 rounded-full"
              style={{ width: `${pct0}%`, transition: 'width 0.65s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
            />
          </div>
          <div className="relative h-2.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-600 to-rose-400 rounded-full"
              style={{ width: `${pct1}%`, transition: 'width 0.65s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
            />
          </div>
          <div className="flex justify-between text-white/20 text-[9px] font-mono -mt-0.5">
            <span>0</span>
            <span>{targetScore}</span>
          </div>
        </div>

        {/* Opponent team score */}
        <div className="flex flex-col items-center min-w-[44px]">
          <span className="text-[9px] font-bold uppercase tracking-widest text-red-400/80">Them</span>
          <span className="text-2xl font-black text-white tabular-nums leading-none">{theirScore}</span>
        </div>

        {/* Meta: hand / sleeping / thinking */}
        <div className="flex flex-col items-end gap-0.5 min-w-[38px] shrink-0">
          <span className="text-white/40 text-[10px] font-mono">Hand {handNumber}</span>
          <span className="text-white/30 text-[10px] font-mono">{sleepingCount} sleep.</span>
          {botThinking && (
            <span className="text-yellow-400 text-[10px] font-black tracking-widest animate-pulse">●●●</span>
          )}
        </div>

        {/* Volume toggle — 44×44 touch target */}
        {speakerIcon !== null && onVolumeChange && (
          <button
            onClick={() => setShowVolume((s) => !s)}
            className="w-11 h-11 flex items-center justify-center rounded-xl active:bg-white/10 transition-colors shrink-0"
          >
            <span className="text-xl">{speakerIcon}</span>
          </button>
        )}
      </div>

      {/* Volume slider row — inline, full width, no z-index issues on mobile */}
      {showVolume && onVolumeChange && volume !== undefined && (
        <div className="flex items-center gap-3 px-4 pb-2 border-t border-white/10 pt-2">
          <span className="text-white/40 text-[10px] font-bold uppercase tracking-widest shrink-0">Music</span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(volume * 100)}
            onChange={(e) => onVolumeChange(Number(e.target.value) / 100)}
            className="flex-1 h-6 accent-green-400 cursor-pointer"
          />
          <span className="text-white/50 text-[11px] font-mono tabular-nums w-8 text-right shrink-0">
            {Math.round(volume * 100)}%
          </span>
          <button
            onClick={() => setShowVolume(false)}
            className="w-7 h-7 flex items-center justify-center text-white/30 active:text-white rounded-lg active:bg-white/10 transition-colors shrink-0 text-sm"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
