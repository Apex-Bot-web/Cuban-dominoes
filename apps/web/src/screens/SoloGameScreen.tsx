import type { Seat } from '@dominoes/engine';
import { Board } from '../components/Board';
import { MatchOverScreen } from '../components/MatchOverScreen';
import { OpponentSeat } from '../components/OpponentSeat';
import { PlayerHand } from '../components/PlayerHand';
import { ScoreBar } from '../components/ScoreBar';
import { ScoreScreen } from '../components/ScoreScreen';
import { useGame } from '../game/useGame';

const LEFT_SEAT: Seat = 3;
const TOP_SEAT: Seat = 2;
const RIGHT_SEAT: Seat = 1;

interface SoloGameScreenProps {
  onLeave: () => void;
}

export function SoloGameScreen({ onLeave }: SoloGameScreenProps) {
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
      <ScoreBar
        teamScores={teamScores}
        targetScore={targetScore}
        handNumber={handNumber}
        sleepingCount={sleepingCount}
        botThinking={botThinking}
        onLeave={onLeave}
      />

      <div className="flex-1 flex flex-col min-h-0 px-2 pt-2 pb-1 gap-1.5">
        <OpponentSeat
          seat={TOP_SEAT}
          tileCount={tileCounts[TOP_SEAT]}
          isActive={turn === TOP_SEAT}
          passHistory={passHistory}
          position="top"
        />

        <div className="flex-1 flex gap-1.5 min-h-0">
          <OpponentSeat
            seat={LEFT_SEAT}
            tileCount={tileCounts[LEFT_SEAT]}
            isActive={turn === LEFT_SEAT}
            passHistory={passHistory}
            position="side"
          />

          <div className="flex-1 table-surface rounded-2xl overflow-hidden flex flex-col">
            <Board
              board={view.board}
              openEnds={view.openEnds}
              choosingSide={choosingSide}
              onPickSide={playSide}
            />
          </div>

          <OpponentSeat
            seat={RIGHT_SEAT}
            tileCount={tileCounts[RIGHT_SEAT]}
            isActive={turn === RIGHT_SEAT}
            passHistory={passHistory}
            position="side"
          />
        </div>
      </div>

      <div className="shrink-0 bg-felt-dark/70 border-t border-white/10">
        <div
          className={
            isMyTurn
              ? 'flex items-center justify-center gap-1.5 py-1 bg-white/5'
              : 'flex items-center justify-center gap-1.5 py-1'
          }
        >
          {isMyTurn && (
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shadow-[0_0_6px_rgba(74,222,128,0.8)]" />
          )}
          <span className={isMyTurn ? 'text-[11px] font-black uppercase tracking-widest text-white' : 'text-[11px] font-black uppercase tracking-widest text-white/40'}>
            Tú
          </span>
          <span className="text-white/30 text-[10px] font-mono">
            {view.myHand.length} fichas
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

      {phase === 'hand-over' && view.result && (
        <ScoreScreen
          result={view.result}
          teamScores={teamScores}
          targetScore={targetScore}
          handNumber={handNumber}
          onNext={nextHand}
        />
      )}
      {phase === 'match-over' && match.winnerTeam !== undefined && (
        <MatchOverScreen
          winnerTeam={match.winnerTeam}
          teamScores={teamScores}
          handNumber={handNumber}
          onNewMatch={newMatch}
          onLeave={onLeave}
        />
      )}
    </div>
  );
}
