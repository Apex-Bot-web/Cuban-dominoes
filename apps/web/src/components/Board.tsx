import { useEffect, useRef } from 'react';
import type { Tile, BoardSide } from '@dominoes/engine';
import { DominoTile } from './DominoTile';

interface BoardProps {
  board: readonly Tile[];
  openEnds?: readonly [number, number];
  choosingSide: boolean;
  onPickSide: (side: BoardSide) => void;
}

export function Board({ board, openEnds, choosingSide, onPickSide }: BoardProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the right (newest tiles) whenever the board changes
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [board.length]);

  if (board.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-felt-light text-opacity-60 text-sm font-medium tracking-widest uppercase opacity-50">
          Esperando la salida…
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center overflow-hidden relative px-2 gap-1">
      {/* Side pick buttons — float above the board ends when choosing */}
      {choosingSide && openEnds && (
        <div className="absolute inset-0 flex items-center justify-between px-1 z-10 pointer-events-none">
          <button
            className="pointer-events-auto bg-yellow-400 text-yellow-900 font-bold rounded-lg px-3 py-2 shadow-lg text-sm animate-pulse"
            onClick={() => onPickSide('left')}
          >
            ← {openEnds[0]}
          </button>
          <button
            className="pointer-events-auto bg-yellow-400 text-yellow-900 font-bold rounded-lg px-3 py-2 shadow-lg text-sm animate-pulse"
            onClick={() => onPickSide('right')}
          >
            {openEnds[1]} →
          </button>
        </div>
      )}

      {/* Scrollable tile chain */}
      <div
        ref={scrollRef}
        className="flex items-center gap-0.5 overflow-x-auto w-full py-1"
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {board.map((tile, i) => (
          <DominoTile
            key={i}
            tile={tile}
            orientation="h"
            dim={choosingSide && i > 0 && i < board.length - 1}
          />
        ))}
      </div>

      {/* Open ends indicator */}
      {openEnds && !choosingSide && (
        <div className="flex justify-between w-full px-1 text-xs text-green-300 opacity-60 font-mono">
          <span>← {openEnds[0]}</span>
          <span>{openEnds[1]} →</span>
        </div>
      )}
    </div>
  );
}
