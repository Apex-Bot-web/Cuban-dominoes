import type { Seat } from '@dominoes/engine';
import { useGame } from './game/useGame';
import { ScoreBar } from './components/ScoreBar';
import { OpponentSeat } from './components/OpponentSeat';
import { Board } from './components/Board';
import { PlayerHand } from './components/PlayerHand';
import { ScoreScreen } from './components/ScoreScreen';
import { MatchOverScreen } from './components/MatchOverScreen';

// Turn order counterclockwise: 0 (you, bottom) → 1 (left) → 2 (top / partner) → 3 (right)
const OPPONENT_SEATS: Seat[] = [3, 2, 1];

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
  const isMyTurn = turn === 0 && phase === 'playing';

  return (
    <div
      className="h-full flex flex-col felt-texture overflow-hidden relative select-none"
      onClick={choosingSide ? cancelSelection : undefined}
    >
      {/* ── Score bar ───────────────────────────────────────────────────── */}
      <ScoreBar
        teamScores={teamScores}
        targetScore={targetScore}
        handNumber={handNumber}
        sleepingCount={sleepingCount}
        botThinking={botThinking}
      />

      {/* ── Opponent seats ───────────────────────────────────────────────── */}
      <div className="flex justify-around items-start px-2 pt-2 pb-1 shrink-0">
        {OPPONENT_SEATS.map((seat) => (
          <OpponentSeat
            key={seat}
            seat={seat}
            tileCount={tileCounts[seat]}
            isActive={turn === seat}
            passHistory={passHistory}
          />
        ))}
      </div>

      {/* ── Board (flex-1 — takes remaining space) ───────────────────────── */}
      <Board
        board={view.board}
        openEnds={view.openEnds}
        choosingSide={choosingSide}
        onPickSide={playSide}
      />

      {/* ── Your hand ────────────────────────────────────────────────────── */}
      <div className="shrink-0 bg-felt-dark/60 border-t border-white/10">
        <div className="text-center py-1">
          <span className="text-white/30 text-[10px] font-mono">
            Tú — {view.myHand.length} fichas{turn === 0 && phase === 'playing' ? ' • Tu Turno' : ''}
          </span>
        </div>
        <PlayerHand
          tiles={view.myHand}
          playableTiles={playableTiles}
          selectedTile={selectedTile}
          isMyTurn={isMyTurn}
          choosingSide={choosingSide}
          onSelect={selectTile}
          onCancelSelection={cancelSelection}
        />
      </div>

      {/* ── Hand-over overlay ─────────────────────────────────────────────── */}
      {phase === 'hand-over' && view.result && (
        <ScoreScreen
          result={view.result}
          teamScores={teamScores}
          targetScore={targetScore}
          handNumber={handNumber}
          onNext={nextHand}
        />
      )}

      {/* ── Match-over overlay ────────────────────────────────────────────── */}
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
