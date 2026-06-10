import { clsx } from 'clsx';
import type { HandResult } from '@dominoes/engine';

const SEAT_NAME = ['Tú', 'Este', 'Socio', 'Oeste'];
const TEAM_COLOR = ['text-green-300', 'text-red-300'];

interface ScoreScreenProps {
  result: HandResult;
  teamScores: readonly [number, number];
  targetScore: number;
  handNumber: number;
  onNext: () => void;
}

export function ScoreScreen({ result, teamScores, targetScore, handNumber, onNext }: ScoreScreenProps) {
  const weWon =
    result.type === 'domino'
      ? result.winnerTeam === 0
      : result.winnerTeam === 0;

  const isTie = result.type === 'tranque' && result.tie;

  const headline =
    isTie ? '¡Tranque empatado!'
    : result.type === 'domino'
      ? result.winnerSeat === 0
        ? '¡Dominó! — Ganaste'
        : `¡Dominó! — Ganó ${SEAT_NAME[result.winnerSeat] ?? 'Bot'}`
      : result.winnerTeam === 0
        ? '¡Tranque! — Ganamos'
        : '¡Tranque! — Ellos ganan';

  return (
    <div className="absolute inset-0 z-20 flex items-end justify-center pb-4 bg-black/60 backdrop-blur-md">
      <div className="w-full max-w-sm mx-4 bg-felt-dark border border-white/15 rounded-3xl overflow-hidden shadow-2xl">
        {/* Header band */}
        <div
          className={clsx(
            'px-6 py-4 text-center',
            isTie ? 'bg-yellow-600/30'
              : weWon ? 'bg-green-600/30' : 'bg-red-600/20',
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

        {/* Pip breakdown */}
        <div className="grid grid-cols-4 divide-x divide-white/10 border-b border-white/10">
          {([0, 1, 2, 3] as const).map((seat) => (
            <div
              key={seat}
              className={clsx(
                'flex flex-col items-center py-3 gap-0.5',
                seat % 2 === 0 ? 'bg-green-900/20' : 'bg-red-900/15',
              )}
            >
              <span className="text-white/40 text-[9px] font-bold uppercase tracking-wide">{SEAT_NAME[seat]}</span>
              <span className="text-white text-xl font-black tabular-nums">{result.pipsBySeat[seat]}</span>
              <span className="text-white/30 text-[9px]">pips</span>
            </div>
          ))}
        </div>

        {/* Running scores */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-white/10">
          <div className="text-center">
            <div className={clsx('text-2xl font-black tabular-nums', TEAM_COLOR[0])}>{teamScores[0]}</div>
            <div className={clsx('text-[10px] font-bold uppercase tracking-wide', TEAM_COLOR[0] + '/60')}>Nosotros</div>
          </div>
          <div className="text-center">
            <span className="text-white/30 text-xs font-mono">Mano {handNumber}</span>
            <div className="w-28 mt-1 relative">
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, teamScores[0] / targetScore * 100)}%` }}
                />
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mt-1">
                <div
                  className="h-full bg-gradient-to-r from-red-600 to-rose-400 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, teamScores[1] / targetScore * 100)}%` }}
                />
              </div>
            </div>
          </div>
          <div className="text-center">
            <div className={clsx('text-2xl font-black tabular-nums', TEAM_COLOR[1])}>{teamScores[1]}</div>
            <div className={clsx('text-[10px] font-bold uppercase tracking-wide', TEAM_COLOR[1] + '/60')}>Ellos</div>
          </div>
        </div>

        {/* CTA */}
        <div className="px-4 py-3">
          <button
            className="w-full bg-felt-light hover:bg-felt text-white font-black text-base rounded-2xl py-3.5 transition-colors active:scale-95"
            onClick={onNext}
          >
            Siguiente mano →
          </button>
        </div>
      </div>
    </div>
  );
}
