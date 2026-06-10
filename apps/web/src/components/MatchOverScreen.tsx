interface MatchOverScreenProps {
  winnerTeam: 0 | 1;
  teamScores: readonly [number, number];
  handNumber: number;
  onNewMatch: () => void;
}

export function MatchOverScreen({ winnerTeam, teamScores, handNumber, onNewMatch }: MatchOverScreenProps) {
  const weWon = winnerTeam === 0;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-felt-dark border border-white/10 rounded-2xl p-8 mx-4 w-full max-w-sm shadow-2xl text-center">
        <div className="text-6xl mb-4">{weWon ? '🏆' : '😤'}</div>

        <div className={`text-3xl font-black mb-1 ${weWon ? 'text-yellow-300' : 'text-red-400'}`}>
          {weWon ? '¡Ganamos!' : '¡Perdimos!'}
        </div>
        <div className="text-green-400/60 text-sm mb-6">
          {handNumber} {handNumber === 1 ? 'mano' : 'manos'} jugadas
        </div>

        <div className="flex justify-center gap-10 mb-8">
          <div className={`text-center ${weWon ? 'opacity-100' : 'opacity-50'}`}>
            <div className="text-xs text-green-300/70 font-bold uppercase tracking-wide">Nosotros</div>
            <div className={`text-5xl font-black tabular-nums ${weWon ? 'text-green-300' : 'text-white/50'}`}>
              {teamScores[0]}
            </div>
          </div>
          <div className="text-green-700 self-center text-2xl font-black">—</div>
          <div className={`text-center ${!weWon ? 'opacity-100' : 'opacity-50'}`}>
            <div className="text-xs text-red-300/70 font-bold uppercase tracking-wide">Ellos</div>
            <div className={`text-5xl font-black tabular-nums ${!weWon ? 'text-red-300' : 'text-white/50'}`}>
              {teamScores[1]}
            </div>
          </div>
        </div>

        <button
          className="w-full bg-green-600 hover:bg-green-500 active:bg-green-700 text-white font-black text-xl rounded-xl py-4 transition-colors"
          onClick={onNewMatch}
        >
          Jugar de nuevo
        </button>
      </div>
    </div>
  );
}
