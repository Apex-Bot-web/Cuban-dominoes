import { useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';
import type { Seat, PassRecord } from '@dominoes/engine';
import { FaceDownTile } from './DominoTile';

const SEAT_LABEL: Record<number, string> = {
  1: 'Right',
  2: 'Partner',
  3: 'Left',
};

interface OpponentSeatProps {
  seat: Seat;
  tileCount: number;
  isActive: boolean;
  passHistory: readonly PassRecord[];
  /** 'top' = partner above the table, 'side' = left/right flanking the table */
  position: 'top' | 'side';
  /** Override the default seat label with a player's display name */
  displayName?: string;
  /** false = player disconnected (show red indicator) */
  connected?: boolean;
}

export function OpponentSeat({ seat, tileCount, isActive, passHistory, position, displayName, connected = true }: OpponentSeatProps) {
  const name = displayName ?? SEAT_LABEL[seat] ?? `Seat ${seat}`;
  const justPassed = passHistory.length > 0 && passHistory[passHistory.length - 1]?.seat === seat;

  // Shake once when this seat passes
  const [shaking, setShaking] = useState(false);
  const prevPassedRef = useRef(false);
  useEffect(() => {
    if (justPassed && !prevPassedRef.current) {
      setShaking(true);
      const t = setTimeout(() => setShaking(false), 420);
      prevPassedRef.current = true;
      return () => clearTimeout(t);
    }
    if (!justPassed) prevPassedRef.current = false;
  }, [justPassed]);

  const isPegao = tileCount === 1;

  // ── Top (partner) ─────────────────────────────────────────────────────────
  if (position === 'top') {
    return (
      <div
        className={clsx(
          'flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 w-full',
          isActive
            ? 'bg-white/15 ring-2 ring-white/40 shadow-lg shadow-white/5'
            : 'bg-black/20',
          shaking && 'animate-shake',
        )}
      >
        {/* Active indicator + name */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isActive
            ? <span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.8)] animate-pulse" />
            : !connected
            ? <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            : <span className="w-2 h-2 rounded-full bg-white/15" />
          }
          <span className={clsx('text-xs font-black uppercase tracking-wider',
            isActive ? 'text-white' : !connected ? 'text-red-400/80' : 'text-white/50')}>
            {name}
          </span>
          {!connected && (
            <span className="text-[9px] font-black bg-red-500/20 text-red-400 border border-red-500/30 rounded px-1 py-0.5 leading-none uppercase">
              Off
            </span>
          )}
          {justPassed && connected && (
            <span className="text-[9px] font-black bg-orange-500 text-white rounded px-1 py-0.5 leading-none uppercase">
              Pass
            </span>
          )}
        </div>

        {/* Face-down tiles */}
        <div className="flex gap-0.5 flex-wrap flex-1 justify-center">
          {Array.from({ length: Math.min(tileCount, 10) }).map((_, i) => (
            <FaceDownTile key={i} size="xs" orientation="h" />
          ))}
          {tileCount > 10 && (
            <span className="text-white/40 text-[9px] font-mono self-center">+{tileCount - 10}</span>
          )}
        </div>

        {/* Count */}
        <span className={clsx(
          'text-xs font-black tabular-nums shrink-0',
          isPegao ? 'text-orange-300 animate-pulse' : isActive ? 'text-white' : 'text-white/40',
        )}>
          {tileCount}
        </span>
      </div>
    );
  }

  // ── Side (Left / Right) ───────────────────────────────────────────────────
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-between py-2 px-1 rounded-xl w-10 transition-all duration-200',
        isActive
          ? 'bg-white/15 ring-2 ring-white/40 shadow-lg shadow-white/5'
          : 'bg-black/20',
        shaking && 'animate-shake',
      )}
    >
      {/* Top: active / disconnected dot */}
      <div className="h-3 flex items-center justify-center">
        {isActive
          ? <span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.8)] animate-pulse" />
          : !connected
          ? <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          : null
        }
      </div>

      {/* Name rotated */}
      <span
        className={clsx('text-[10px] font-black uppercase tracking-widest my-1',
          isActive ? 'text-white' : !connected ? 'text-red-400/80' : 'text-white/40')}
        style={{ writingMode: 'vertical-lr', textOrientation: 'mixed' }}
      >
        {name}
      </span>

      {/* Disconnected / Pass badge */}
      {!connected && (
        <span className="text-[7px] font-black text-red-400 leading-none uppercase mb-1">OFF</span>
      )}
      {justPassed && connected && (
        <span className="text-[8px] font-black bg-orange-500 text-white rounded px-0.5 py-0.5 leading-none uppercase mb-1">
          PASS
        </span>
      )}

      {/* Tile count */}
      <span className={clsx(
        'text-2xl font-black tabular-nums leading-none',
        isPegao ? 'text-orange-300 animate-pulse' : isActive ? 'text-white' : 'text-white/50',
      )}>
        {tileCount}
      </span>
      <span className={clsx('text-[9px] font-mono', isActive ? 'text-white/60' : 'text-white/25')}>tiles</span>
    </div>
  );
}
