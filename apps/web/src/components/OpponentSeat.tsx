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
}

export function OpponentSeat({ seat, tileCount, isActive, passHistory }: OpponentSeatProps) {
  const name = SEAT_LABEL[seat] ?? `Seat ${seat}`;
  const justPassed = passHistory.length > 0 && passHistory[passHistory.length - 1]?.seat === seat;

  return (
    <div
      className={clsx(
        'flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl transition-all duration-200',
        isActive
          ? 'bg-white/15 ring-2 ring-white/40 shadow-lg shadow-white/10'
          : 'bg-white/5',
      )}
    >
      {/* Name + turn indicator */}
      <div className="flex items-center gap-1.5">
        {isActive && (
          <span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.8)] animate-pulse" />
        )}
        <span
          className={clsx(
            'text-xs font-bold tracking-wide uppercase',
            isActive ? 'text-white' : 'text-white/50',
          )}
        >
          {name}
        </span>
        {justPassed && (
          <span className="text-[10px] font-black bg-orange-500 text-white rounded px-1 py-0.5 leading-none uppercase tracking-wide">
            Paso
          </span>
        )}
      </div>

      {/* Face-down tile stack */}
      <div className="flex flex-wrap justify-center gap-0.5 max-w-[88px]">
        {Array.from({ length: Math.min(tileCount, 10) }).map((_, i) => (
          <FaceDownTile key={i} size="xs" orientation="h" />
        ))}
        {tileCount > 10 && (
          <span className="text-white/40 text-xs font-mono self-center">+{tileCount - 10}</span>
        )}
      </div>

      <span
        className={clsx(
          'text-[10px] font-mono tabular-nums',
          isActive ? 'text-white/70' : 'text-white/30',
        )}
      >
        {tileCount} fic.
      </span>
    </div>
  );
}
