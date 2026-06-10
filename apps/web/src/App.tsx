import type { Seat } from '@dominoes/engine';
import { useGame } from './game/useGame';
import { ScoreBar } from './components/ScoreBar';
import { OpponentSeat } from './components/OpponentSeat';
import { Board } from './components/Board';
import { PlayerHand } from './components/PlayerHand';
import { ScoreScreen } from './components/ScoreScreen';
import { MatchOverScreen } from './components/MatchOverScreen';

// Seats layout (counterclockwise): 0=you(bottom), 1=left, 2=top(partner), 3=right
const OPPONENTS: Seat[] = [3, 2, 1];

export default function App() {
  const {
    view,
    match,
    phase,
    selectedTile,
    choosingSide,
    botThinking,
    playableTiles,
    selectTile,
    playSide,
    cancelSelection,
    nextHand,
    newMatch,
  } = useGame('duro');

  const { tileCounts, turn, passHistory, teamScores, targetScore, handNumber, sleepingCount } = view;

  return (
    <div
      className="h-full flex flex-col bg-felt overflow-hidden relative select-none"
      style={{ touchAction: 'none' }}
      onClick={choosingSide ? cancelSelection : undefined}
    >
      {/* Score bar */}
      <ScoreBar
        teamScores={teamScores}
        targetScore={targetScore}
        handNumber={handNumber}
        sleepingCount={sleepingCount}
        botThinking={botThinking}
      />

      {/* Opponents row */}
      <div className="flex justify-around items-start px-1 pt-1 shrink-0">
        {OPPONENTS.map((seat) => (
          <OpponentSeat
            key={seat}
            seat={seat}
            tileCount={tileCounts[seat]}
            isActive={turn === seat}
            passHistory={passHistory}
          />
        ))}
      </div>

      {/* Board — takes remaining vertical space */}
      <Board
        board={view.board}
        openEnds={view.openEnds}
        choosingSide={choosingSide}
        onPickSide={playSide}
      />

      {/* Human's hand */}
      <div className="shrink-0 bg-felt-dark/50 border-t border-white/10 pb-1">
        {/* Your tile count */}
        <div className="text-center text-green-400/50 text-[10px] font-mono pt-0.5">
          Tú — {view.myHand.length} fic. {turn === 0 ? '• Tu turno' : ''}
        </div>
        <PlayerHand
          tiles={view.myHand}
          playableTiles={playableTiles}
          selectedTile={selectedTile}
          isMyTurn={turn === 0 && phase === 'playing'}
          choosingSide={choosingSide}
          onSelect={selectTile}
          onCancelSelection={cancelSelection}
        />
      </div>

      {/* Hand-over overlay */}
      {phase === 'hand-over' && view.result && (
        <ScoreScreen
          result={view.result}
          teamScores={teamScores}
          targetScore={targetScore}
          handNumber={handNumber}
          onNext={nextHand}
        />
      )}

      {/* Match-over overlay */}
      {phase === 'match-over' && match.winnerTeam !== undefined && (
        <MatchOverScreen
          winnerTeam={match.winnerTeam}
          teamScores={teamScores}
          handNumber={handNumber}
          onNewMatch={newMatch}
        />
      )}
    </div>
  );
}
