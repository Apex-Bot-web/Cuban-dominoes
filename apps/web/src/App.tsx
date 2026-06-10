import type { Seat } from '@dominoes/engine';
import { useGame } from './game/useGame';
import { ScoreBar } from './components/ScoreBar';
import { OpponentSeat } from './components/OpponentSeat';
import { Board } from './components/Board';
import { PlayerHand } from './components/PlayerHand';
import { ScoreScreen } from './components/ScoreScreen';
import { MatchOverScreen } from './components/MatchOverScreen';

// Seating: 0=bottom (you), 1=right (Este), 2=top (Socio/partner), 3=left (Oeste)
const LEFT_SEAT: Seat  = 3;
const TOP_SEAT: Seat   = 2;
const RIGHT_SEAT: Seat = 1;

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
      {/* ── Score bar ── */}
      <ScoreBar
        teamScores={teamScores}
        targetScore={targetScore}
        handNumber={handNumber}
        sleepingCount={sleepingCount}
        botThinking={botThinking}
      />

      {/* ── Main play area (everything between header and hand) ── */}
      <div className="flex-1 flex flex-col min-h-0 px-2 pt-2 pb-1 gap-1.5">

        {/* Top: Socio (partner) */}
        <OpponentSeat
          seat={TOP_SEAT}
          tileCount={tileCounts[TOP_SEAT]}
          isActive={turn === TOP_SEAT}
          passHistory={passHistory}
          position="top"
        />

        {/* Middle: Oeste | TABLE SURFACE | Este */}
        <div className="flex-1 flex gap-1.5 min-h-0">

          {/* Left: Oeste */}
          <OpponentSeat
            seat={LEFT_SEAT}
            tileCount={tileCounts[LEFT_SEAT]}
            isActive={turn === LEFT_SEAT}
            passHistory={passHistory}
            position="side"
          />

          {/* Table surface — the playing field */}
          <div className="flex-1 table-surface rounded-2xl overflow-hidden flex flex-col">
            <Board
              board={view.board}
              openEnds={view.openEnds}
              choosingSide={choosingSide}
              onPickSide={playSide}
            />
          </div>

          {/* Right: Este */}
          <OpponentSeat
            seat={RIGHT_SEAT}
            tileCount={tileCounts[RIGHT_SEAT]}
            isActive={turn === RIGHT_SEAT}
            passHistory={passHistory}
            position="side"
          />
        </div>
      </div>

      {/* ── Your seat (bottom) ── */}
      <div className="shrink-0 bg-felt-dark/70 border-t border-white/10">
        {/* Your seat label — mirrors opponent labels */}
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

      {/* ── Overlays ── */}
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
        />
      )}
    </div>
  );
}
