import { clsx } from 'clsx';
import type { Seat, PassRecord } from '@dominoes/engine';
import { FaceDownTile } from './DominoTile';

const SEAT_LABEL: Record<number, string> = {
  1: 'Este',
  2: 'Socio',
  3: 'Oeste',
};

interface OpponentSeatProps {
  seat: Seat;
  tileCount: number;
  isActive: boolean;
  passHistory: readonly PassRecord[];
  /** 'top' = partner above the table, 'side' = left/right flanking the table */
  position: 'top' | 'side';
}

export function OpponentSeat({ seat, tileCount, isActive, passHistory, position }: OpponentSeatProps) {
  const name = SEAT_LABEL[seat] ?? `Seat ${seat}`;
  const justPassed = passHistory.length > 0 && passHistory[passHistory.length - 1]?.seat === seat;

  // ── Top (partner, Socio) ─────────────────────────────────────────────────
  if (position === 'top') {
    return (
      <div
        className={clsx(
          'flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all duration-200 w-full',
          isActive
            ? 'bg-white/15 ring-2 ring-white/40 shadow-lg shadow-white/5'
            : 'bg-black/20',
        )}
      >
        {/* Active indicator + name */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isActive
            ? <span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.8)] animate-pulse" />
            : <span className="w-2 h-2 rounded-full bg-white/15" />
          }
          <span className={clsx('text-xs font-black uppercase tracking-wider', isActive ? 'text-white' : 'text-white/50')}>
            {name}
          </span>
          {justPassed && (
            <span className="text-[9px] font-black bg-orange-500 text-white rounded px-1 py-0.5 leading-none uppercase">
              Paso
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
        <span className={clsx('text-xs font-black tabular-nums shrink-0', isActive ? 'text-white' : 'text-white/40')}>
          {tileCount}
        </span>
      </div>
    );
  }

  // ── Side (Oeste / Este) ───────────────────────────────────────────────────
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-between py-2 px-1 rounded-xl w-12 transition-all duration-200',
        isActive
          ? 'bg-white/15 ring-2 ring-white/40 shadow-lg shadow-white/5'
          : 'bg-black/20',
      )}
    >
      {/* Top: active dot */}
      <div className="h-3 flex items-center justify-center">
        {isActive && (
          <span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.8)] animate-pulse" />
        )}
      </div>

      {/* Name rotated */}
      <span
        className={clsx('text-[10px] font-black uppercase tracking-widest my-1', isActive ? 'text-white' : 'text-white/40')}
        style={{ writingMode: 'vertical-lr', textOrientation: 'mixed' }}
      >
        {name}
      </span>

      {/* Paso badge */}
      {justPassed && (
        <span className="text-[8px] font-black bg-orange-500 text-white rounded px-0.5 py-0.5 leading-none uppercase mb-1">
          PASO
        </span>
      )}

      {/* Tile count — large and readable */}
      <span className={clsx('text-2xl font-black tabular-nums leading-none', isActive ? 'text-white' : 'text-white/50')}>
        {tileCount}
      </span>
      <span className={clsx('text-[9px] font-mono', isActive ? 'text-white/60' : 'text-white/25')}>fic.</span>
    </div>
  );
}
