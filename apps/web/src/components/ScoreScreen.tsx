import { clsx } from 'clsx';
import type { Seat } from '@dominoes/engine';
import { teamOf } from '@dominoes/engine';
import type { HandResult } from '@dominoes/engine';

// Relative position labels: mySeat is 'Tú', seats going clockwise are Este/Socio/Oeste
const REL_LABEL = ['Tú', 'Este', 'Socio', 'Oeste'];

interface ScoreScreenProps {
  result: HandResult;
  teamScores: readonly [number, number];
  targetScore: number;
  handNumber: number;
  mySeat: Seat;
  onNext: () => void;
  nextPending?: boolean;
}

export function ScoreScreen({ result, teamScores, targetScore, handNumber, mySeat, onNext, nextPending }: ScoreScreenProps) {
  const myTeam = teamOf(mySeat);
  const weWon = result.winnerTeam === myTeam;
  const isTie = result.type === 'tranque' && result.tie;

  const myScore = teamScores[myTeam];
  const theirScore = teamScores[1 - myTeam as 0 | 1];
  const pctMe = Math.min(100, (myScore / targetScore) * 100);
  const pctThem = Math.min(100, (theirScore / targetScore) * 100);

  // Relative seat order: me, right, partner, left
  const relSeats = ([0, 1, 2, 3] as const).map((offset) => ((mySeat + offset) % 4) as Seat);

  const headline =
    isTie
      ? '¡Tranque empatado!'
      : result.type === 'domino'
        ? result.winnerSeat === mySeat
          ? '¡Dominó! — Ganaste'
          : `¡Dominó! — Ganó ${REL_LABEL[relSeats.indexOf(result.winnerSeat)] ?? 'Bot'}`
        : weWon
          ? '¡Tranque! — Ganamos'
          : '¡Tranque! — Ellos ganan';

  return (
    <div className="absolute inset-0 z-20 flex items-end justify-center pb-4 bg-black/60 backdrop-blur-md">
      <div className="w-full max-w-sm mx-4 bg-felt-dark border border-white/15 rounded-3xl overflow-hidden shadow-2xl">

        {/* Header band */}
        <div
          className={clsx(
            'px-6 py-4 text-center',
            isTie ? 'bg-yellow-600/30' : weWon ? 'bg-green-600/30' : 'bg-red-600/20',
          )}
        >
          <div className={clsx('text-xl font-black', isTie ? 'text-yellow-300' : weWon ? 'text-green-300' : 'text-red-300')}>
            {headline}
          </div>
          {!isTie && (
            <div className="flex items-baseline justify-center gap-1 mt-1">
              <span className="text-5xl font-black text-white tabular-nums">{result.points}</span>
              <span className="text-white/50 text-lg font-bold">pts</span>
            </div>
          )}
        </div>

        {/* Pip breakdown — shown in relative seat order */}
        <div className="grid grid-cols-4 divide-x divide-white/10 border-b border-white/10">
          {relSeats.map((seat, offset) => {
            const isMyTeam = teamOf(seat) === myTeam;
            return (
              <div
                key={seat}
                className={clsx(
                  'flex flex-col items-center py-3 gap-0.5',
                  isMyTeam ? 'bg-green-900/20' : 'bg-red-900/15',
                )}
              >
                <span className="text-white/40 text-[9px] font-bold uppercase tracking-wide">
                  {REL_LABEL[offset]}
                </span>
                <span className="text-white text-xl font-black tabular-nums">
                  {result.pipsBySeat[seat]}
                </span>
                <span className="text-white/30 text-[9px]">pips</span>
              </div>
            );
          })}
        </div>

        {/* Running scores — Nosotros = my team, Ellos = opponents */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-white/10">
          <div className="text-center">
            <div className="text-2xl font-black tabular-nums text-green-300">{myScore}</div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-green-400/60">Nosotros</div>
          </div>
          <div className="text-center">
            <span className="text-white/30 text-xs font-mono">Mano {handNumber}</span>
            <div className="w-28 mt-1 relative">
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${pctMe}%` }}
                />
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mt-1">
                <div
                  className="h-full bg-gradient-to-r from-red-600 to-rose-400 rounded-full transition-all duration-500"
                  style={{ width: `${pctThem}%` }}
                />
              </div>
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-black tabular-nums text-red-300">{theirScore}</div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-red-400/60">Ellos</div>
          </div>
        </div>

        {/* CTA */}
        <div className="px-4 py-3">
          <button
            disabled={nextPending}
            onClick={onNext}
            className={clsx(
              'w-full font-black text-base rounded-2xl py-3.5 transition-colors',
              nextPending
                ? 'bg-white/10 text-white/40 cursor-not-allowed'
                : 'bg-felt-light hover:bg-felt text-white active:scale-95',
            )}
          >
            {nextPending ? 'Eligiendo quién sale...' : 'Siguiente mano →'}
          </button>
        </div>
      </div>
    </div>
  );
}
