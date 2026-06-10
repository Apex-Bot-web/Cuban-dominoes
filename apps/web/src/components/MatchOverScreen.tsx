import { clsx } from 'clsx';

interface MatchOverScreenProps {
  winnerTeam: 0 | 1;
  teamScores: readonly [number, number];
  handNumber: number;
  onNewMatch: () => void;
}

export function MatchOverScreen({ winnerTeam, teamScores, handNumber, onNewMatch }: MatchOverScreenProps) {
  const weWon = winnerTeam === 0;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/75 backdrop-blur-md">
      <div className="w-full max-w-sm mx-4 bg-felt-dark border border-white/15 rounded-3xl overflow-hidden shadow-2xl text-center">
        {/* Trophy / emoji header */}
        <div
          className={clsx(
            'px-6 pt-8 pb-6',
            weWon ? 'bg-gradient-to-b from-yellow-600/20 to-transparent' : 'bg-gradient-to-b from-red-900/30 to-transparent',
          )}
        >
          <div className="text-6xl mb-3 leading-none">{weWon ? '🏆' : '😤'}</div>
          <div className={clsx('text-3xl font-black', weWon ? 'text-yellow-300' : 'text-red-400')}>
            {weWon ? '¡Ganamos!' : '¡Perdimos!'}
          </div>
          <div className="text-white/40 text-sm mt-1">
            {handNumber} {handNumber === 1 ? 'mano jugada' : 'manos jugadas'}
          </div>
        </div>

        {/* Scores */}
        <div className="flex items-stretch divide-x divide-white/10 border-y border-white/10">
          <div className={clsx('flex-1 py-5 flex flex-col items-center gap-0.5', !weWon && 'opacity-40')}>
            <span className="text-[10px] font-bold uppercase tracking-widest text-green-400/70">Nosotros</span>
            <span className={clsx('text-5xl font-black tabular-nums', weWon ? 'text-green-300' : 'text-white/50')}>
              {teamScores[0]}
            </span>
          </div>
          <div className={clsx('flex-1 py-5 flex flex-col items-center gap-0.5', weWon && 'opacity-40')}>
            <span className="text-[10px] font-bold uppercase tracking-widest text-red-400/70">Ellos</span>
            <span className={clsx('text-5xl font-black tabular-nums', !weWon ? 'text-red-300' : 'text-white/50')}>
              {teamScores[1]}
            </span>
          </div>
        </div>

        {/* CTA */}
        <div className="px-4 py-4">
          <button
            className="w-full bg-felt-light hover:bg-felt text-white font-black text-lg rounded-2xl py-4 transition-colors active:scale-95"
            onClick={onNewMatch}
          >
            Jugar de nuevo
          </button>
        </div>
      </div>
    </div>
  );
}
