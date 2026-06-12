import { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import type { BotLevel, Seat } from '@dominoes/engine';
import { partnerOf } from '@dominoes/engine';
import { Board } from '../components/Board';
import { MatchOverScreen } from '../components/MatchOverScreen';
import { OpponentSeat } from '../components/OpponentSeat';
import { PegaoFlash } from '../components/PegaoFlash';
import { PlayerHand } from '../components/PlayerHand';
import { ScoreBar } from '../components/ScoreBar';
import { ScoreScreen } from '../components/ScoreScreen';
import { useGame } from '../game/useGame';
import { useBackgroundMusic } from '../hooks/useBackgroundMusic';

const LEFT_SEAT: Seat = 3;
const TOP_SEAT: Seat = 2;
const RIGHT_SEAT: Seat = 1;

interface SoloGameScreenProps {
  botLevel: BotLevel;
  onLeave: () => void;
}

export function SoloGameScreen({ botLevel, onLeave }: SoloGameScreenProps) {
  const {
    view,
    match,
    phase,
    selectedTile,
    choosingSide,
    botThinking,
    playableTiles,
    showPegao,
    moveLog,
    selectTile,
    playSide,
    cancelSelection,
    nextHand,
    pickSalida,
    newMatch,
  } = useGame(botLevel);

  // Countdown for the 5-second "look at tiles" window before the salida picker
  const isLookingAtTiles = phase === 'hand-over' && !view.result;
  const [salidaCountdown, setSalidaCountdown] = useState<number | null>(null);
  useEffect(() => { setSalidaCountdown(isLookingAtTiles ? 5 : null); }, [isLookingAtTiles]);
  useEffect(() => {
    if (salidaCountdown === null || salidaCountdown <= 0) return;
    const t = setTimeout(() => setSalidaCountdown((c) => (c !== null && c > 0 ? c - 1 : null)), 1_000);
    return () => clearTimeout(t);
  }, [salidaCountdown]);

  const { volume, setVolume } = useBackgroundMusic();

  const HUMAN_SEAT: Seat = 0;
  const PARTNER_SEAT: Seat = partnerOf(HUMAN_SEAT);

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
        volume={volume}
        onVolumeChange={setVolume}
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

      {/* Countdown strip — shows during the 5-second tile-viewing window */}
      {isLookingAtTiles && salidaCountdown !== null && (
        <div className="shrink-0 flex items-center justify-center gap-2 py-2 bg-yellow-500/10 border-t border-yellow-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse shrink-0" />
          <span className="text-yellow-300/90 text-xs font-black tracking-wide">
            Choosing who starts in {salidaCountdown}…
          </span>
        </div>
      )}

      <div className="shrink-0 bg-felt-dark/70 border-t border-white/10">
        <div
          className={clsx(
            'flex items-center justify-center gap-1.5 min-h-[36px] py-1',
            isMyTurn && 'bg-white/5',
          )}
        >
          {isMyTurn && (
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shadow-[0_0_6px_rgba(74,222,128,0.8)]" />
          )}
          <span className={isMyTurn ? 'text-[11px] font-black uppercase tracking-widest text-white' : 'text-[11px] font-black uppercase tracking-widest text-white/40'}>
            You
          </span>
          <span className="text-white/30 text-[10px] font-mono">
            {view.myHand.length} tiles
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
          handNumber={handNumber}
        />
      </div>

      {phase === 'hand-over' && view.result && (
        <ScoreScreen
          result={view.result}
          teamScores={teamScores}
          targetScore={targetScore}
          handNumber={handNumber}
          mySeat={HUMAN_SEAT}
          onNext={nextHand}
          moveLog={moveLog}
        />
      )}
      {phase === 'match-over' && match.winnerTeam !== undefined && (
        <MatchOverScreen
          winnerTeam={match.winnerTeam}
          teamScores={teamScores}
          handNumber={handNumber}
          mySeat={HUMAN_SEAT}
          onNewMatch={newMatch}
          onLeave={onLeave}
        />
      )}

      <PegaoFlash show={showPegao} />

      {/* ¿Quién sale? — solo mode salida picker (human team won) */}
      {phase === 'choosing-salida' && (
        <div className="absolute inset-0 z-30 flex items-end bg-black/50 backdrop-blur-sm">
          <div className="w-full bg-felt-dark border-t border-white/15 rounded-t-3xl px-5 pt-5 pb-8">
            <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-1">
              Your team won the hand!
            </p>
            <p className="text-white font-black text-xl mb-4">Who starts?</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => pickSalida(HUMAN_SEAT)}
                className="flex items-center gap-3 bg-white/10 hover:bg-green-500/20 border border-white/15 hover:border-green-500/40 rounded-2xl px-4 py-4 text-left transition-all active:scale-95"
              >
                <span className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center text-green-300 font-black text-sm">
                  You
                </span>
                <p className="text-white font-black">I'll start</p>
                <span className="ml-auto text-white/30 text-lg">→</span>
              </button>
              <button
                onClick={() => pickSalida(PARTNER_SEAT)}
                className="flex items-center gap-3 bg-white/10 hover:bg-green-500/20 border border-white/15 hover:border-green-500/40 rounded-2xl px-4 py-4 text-left transition-all active:scale-95"
              >
                <span className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white/60 font-black text-sm">
                  P
                </span>
                <p className="text-white font-black">My partner starts</p>
                <span className="ml-auto text-white/30 text-lg">→</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
