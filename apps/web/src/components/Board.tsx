import { useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';
import type { Tile, BoardSide } from '@dominoes/engine';
import { DominoTile, TILE_SIZES } from './DominoTile';

// ─── Snake-board helpers ───────────────────────────────────────────────────────

interface SnakeRow {
  tiles: Tile[];
  flipped: boolean;
  align: 'left' | 'right';
}

function buildSnakeRows(board: readonly Tile[], tilesPerRow: number): SnakeRow[] {
  if (tilesPerRow < 1) return [];
  const rows: SnakeRow[] = [];
  for (let i = 0; i < board.length; i += tilesPerRow) {
    const rowIdx = rows.length;
    const isOdd = rowIdx % 2 === 1;
    const slice = Array.from(board.slice(i, i + tilesPerRow));
    rows.push({
      // Odd rows go right-to-left: reverse order AND flip each tile so pips chain correctly
      tiles: isOdd ? [...slice].reverse() : slice,
      flipped: isOdd,
      align: isOdd ? 'right' : 'left',
    });
  }
  return rows;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface BoardProps {
  board: readonly Tile[];
  openEnds?: readonly [number, number];
  choosingSide: boolean;
  onPickSide: (side: BoardSide) => void;
}

const TILE_SLOT = TILE_SIZES.md.half * 2 + TILE_SIZES.md.gap + 4; // tile width + gap

export function Board({ board, openEnds, choosingSide, onPickSide }: BoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tilesPerRow, setTilesPerRow] = useState(4);

  // Measure container to determine snake row width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      setTilesPerRow(Math.max(3, Math.floor(w / TILE_SLOT)));
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  if (board.length === 0) {
    return (
      <div ref={containerRef} className="flex-1 flex items-center justify-center">
        <p className="text-white/20 text-sm font-semibold tracking-widest uppercase">
          Esperando la salida…
        </p>
      </div>
    );
  }

  const rows = buildSnakeRows(board, tilesPerRow);
  const tileH = TILE_SIZES.md.half; // landscape tile height

  return (
    <div
      ref={containerRef}
      className="flex-1 flex flex-col justify-center overflow-y-auto no-scrollbar px-3 py-2 relative"
    >
      {/* Side-pick overlay — floating buttons on open ends */}
      {choosingSide && openEnds && (
        <div className="absolute inset-0 z-20 flex items-center justify-between px-2 pointer-events-none">
          <button
            className="pointer-events-auto bg-yellow-400 text-yellow-900 font-black rounded-xl px-4 py-2.5 shadow-xl text-base animate-bounce"
            onClick={() => onPickSide('left')}
          >
            ← {openEnds[0]}
          </button>
          <button
            className="pointer-events-auto bg-yellow-400 text-yellow-900 font-black rounded-xl px-4 py-2.5 shadow-xl text-base animate-bounce"
            onClick={() => onPickSide('right')}
          >
            {openEnds[1]} →
          </button>
        </div>
      )}

      {/* Snake rows */}
      <div className="flex flex-col gap-1">
        {rows.map((row, ri) => (
          <div
            key={ri}
            className={clsx(
              'flex items-center gap-1',
              row.align === 'right' ? 'justify-end' : 'justify-start',
              choosingSide && 'opacity-70',
            )}
            style={{ minHeight: tileH + 2 }}
          >
            {row.tiles.map((tile, ti) => {
              // Highlight the exposed ends when choosing a side
              const globalIdx = ri % 2 === 0 ? ri * tilesPerRow + ti : ri * tilesPerRow + (row.tiles.length - 1 - ti);
              const isFirstTile = globalIdx === 0;
              const isLastTile = globalIdx === board.length - 1;
              const isExposed = choosingSide && (isFirstTile || isLastTile);

              return (
                <DominoTile
                  key={ti}
                  tile={tile}
                  orientation="h"
                  flipped={row.flipped}
                  size="md"
                  state={isExposed ? 'selected' : 'normal'}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Open-ends legend */}
      {!choosingSide && openEnds && (
        <div className="flex justify-between text-white/30 text-xs font-mono mt-1 px-0.5">
          <span>← {openEnds[0]}</span>
          <span>{openEnds[1]} →</span>
        </div>
      )}
    </div>
  );
}
