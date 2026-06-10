import type { Seat, PassRecord } from '@dominoes/engine';
import { FaceDownTile } from './DominoTile';

const SEAT_NAMES: Record<number, string> = {
  1: 'Este',   // left of you  (counterclockwise)
  2: 'Socio',  // partner across
  3: 'Oeste',  // right of you
};

interface OpponentSeatProps {
  seat: Seat;
  tileCount: number;
  isActive: boolean;
  passHistory: readonly PassRecord[];
}

export function OpponentSeat({ seat, tileCount, isActive, passHistory }: OpponentSeatProps) {
  const name = SEAT_NAMES[seat] ?? `Seat ${seat}`;
  const recentPass = passHistory
    .slice()
    .reverse()
    .find((p) => p.seat === seat);

  return (
    <div
      className={`flex flex-col items-center gap-0.5 px-2 rounded-lg py-1 transition-all ${
        isActive ? 'bg-white/10 ring-1 ring-white/30' : ''
      }`}
    >
      {/* Name & active indicator */}
      <div className="flex items-center gap-1">
        {isActive && <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />}
        <span className={`text-xs font-bold tracking-wide ${isActive ? 'text-white' : 'text-green-400/70'}`}>
          {name}
        </span>
        {recentPass && (
          <span className="text-xs bg-orange-500/70 text-white rounded px-1 font-bold leading-tight">
            PASA
          </span>
        )}
      </div>

      {/* Stacked face-down tiles */}
      <div className="flex items-center gap-0.5 flex-wrap justify-center max-w-[90px]">
        {Array.from({ length: Math.min(tileCount, 10) }).map((_, i) => (
          <FaceDownTile key={i} orientation="h" small />
        ))}
        {tileCount > 10 && (
          <span className="text-green-300 text-xs font-mono">+{tileCount - 10}</span>
        )}
      </div>

      <span className="text-green-400/60 text-xs font-mono">{tileCount} fic.</span>
    </div>
  );
}
