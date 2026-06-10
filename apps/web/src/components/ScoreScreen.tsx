import type { HandResult } from '@dominoes/engine';

const SEAT_NAMES = ['Tú', 'Este', 'Socio', 'Oeste'];

interface ScoreScreenProps {
  result: HandResult;
  teamScores: readonly [number, number];
  targetScore: number;
  handNumber: number;
  onNext: () => void;
}

export function ScoreScreen({ result, teamScores, targetScore, handNumber, onNext }: ScoreScreenProps) {
  const humanTeamWon =
    result.type === 'domino'
      ? result.winnerTeam === 0
      : result.winnerTeam === 0;

  const headline =
    result.type === 'domino'
      ? result.winnerSeat === 0
        ? '¡Dominó! Tú ganaste'
        : `¡Dominó! Ganó ${SEAT_NAMES[result.winnerSeat] ?? 'Bot'}`
      : result.tie
        ? '¡Tranque empatado!'
        : result.winnerTeam === 0
          ? '¡Tranque! Ganamos'
          : '¡Tranque! Ellos ganan';

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-felt-dark border border-white/10 rounded-2xl p-6 mx-4 w-full max-w-sm shadow-2xl">
        {/* Headline */}
        <div className={`text-center text-2xl font-black mb-1 ${humanTeamWon ? 'text-green-300' : 'text-red-300'}`}>
          {headline}
        </div>

        {/* Points */}
        <div className="text-center mb-4">
          <span className="text-4xl font-black text-white tabular-nums">{result.points}</span>
          <span className="text-green-400/70 text-sm ml-1">pts</span>
          {result.type === 'tranque' && (
            <div className="text-green-400/50 text-xs mt-0.5">
              {result.tie ? 'Tie — no score' : 'Tranque'}
            </div>
          )}
        </div>

        {/* Per-seat pips table */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {([0, 1, 2, 3] as const).map((seat) => (
            <div
              key={seat}
              className={`rounded-lg p-2 text-center ${
                seat % 2 === 0 ? 'bg-green-900/50' : 'bg-red-900/30'
              }`}
            >
              <div className="text-xs text-white/50 font-bold uppercase tracking-wide">{SEAT_NAMES[seat]}</div>
              <div className="text-xl font-black text-white tabular-nums">{result.pipsBySeat[seat]}</div>
              <div className="text-xs text-white/30">pips</div>
            </div>
          ))}
        </div>

        {/* Running scores */}
        <div className="flex justify-between items-center mb-5 px-2">
          <div className="text-center">
            <div className="text-xs text-green-300/70 font-bold">NOSOTROS</div>
            <div className="text-2xl font-black text-green-300 tabular-nums">{teamScores[0]}</div>
            <div className="text-xs text-green-300/40">/ {targetScore}</div>
          </div>
          <div className="text-green-700 font-mono text-sm">Mano {handNumber}</div>
          <div className="text-center">
            <div className="text-xs text-red-300/70 font-bold">ELLOS</div>
            <div className="text-2xl font-black text-red-300 tabular-nums">{teamScores[1]}</div>
            <div className="text-xs text-red-300/40">/ {targetScore}</div>
          </div>
        </div>

        <button
          className="w-full bg-green-600 hover:bg-green-500 active:bg-green-700 text-white font-black text-lg rounded-xl py-3 transition-colors"
          onClick={onNext}
        >
          Siguiente mano →
        </button>
      </div>
    </div>
  );
}
