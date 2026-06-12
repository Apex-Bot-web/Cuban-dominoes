import { useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';
import type { Tile, BoardSide } from '@dominoes/engine';
import { isDouble } from '@dominoes/engine';
import { DominoTile, TILE_SIZES } from './DominoTile';

// ─── Snake-board layout helpers ───────────────────────────────────────────────

interface SnakeRow {
  tiles: Tile[];
  /** odd rows go right-to-left and have flipped pip order */
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
      // Odd rows: reverse order AND flip tile halves so chain reads correctly right-to-left
      tiles: isOdd ? [...slice].reverse() : slice,
      flipped: isOdd,
      align: isOdd ? 'right' : 'left',
    });
  }
  return rows;
}

// Each board slot is one landscape tile wide (doubles are portrait but narrow)
const TILE_SLOT = TILE_SIZES.md.half * 2 + TILE_SIZES.md.gap + 4;

// ─── Component ────────────────────────────────────────────────────────────────

interface BoardProps {
  board: readonly Tile[];
  openEnds?: readonly [number, number];
  choosingSide: boolean;
  onPickSide: (side: BoardSide) => void;
}

export function Board({ board, openEnds, choosingSide, onPickSide }: BoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tilesPerRow, setTilesPerRow] = useState(4);

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

  // Track newest tile for pop/ripple animation — must detect which END was played
  const prevBoardRef = useRef<readonly Tile[]>(board);
  const [newestIdx, setNewestIdx] = useState<number | null>(null);
  useEffect(() => {
    const prev = prevBoardRef.current;
    prevBoardRef.current = board;

    if (board.length <= prev.length) {
      if (board.length !== prev.length) setNewestIdx(null);
      return;
    }

    // Left-end play: board[0] changes (new tile prepended, shifting all others)
    const firstOld = prev[0];
    const firstNew = board[0];
    const addedToLeft =
      prev.length > 0 &&
      firstOld !== undefined &&
      firstNew !== undefined &&
      (firstNew[0] !== firstOld[0] || firstNew[1] !== firstOld[1]);

    setNewestIdx(addedToLeft ? 0 : board.length - 1);
    const t = setTimeout(() => setNewestIdx(null), 300);
    return () => clearTimeout(t);
  }, [board]);

  if (board.length === 0) {
    return (
      <div ref={containerRef} className="flex-1 flex items-center justify-center">
        <p className="text-white/20 text-sm font-semibold tracking-widest uppercase select-none">
          Esperando la salida…
        </p>
      </div>
    );
  }

  const rows = buildSnakeRows(board, tilesPerRow);

  return (
    <div
      ref={containerRef}
      className="flex-1 flex flex-col justify-center overflow-y-auto no-scrollbar px-3 py-3 relative"
    >
      {/* Side-pick overlay: floating buttons at open ends */}
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
      <div className="flex flex-col gap-1.5">
        {rows.map((row, ri) => (
          <div
            key={ri}
            className={clsx(
              'flex items-center gap-1',
              row.align === 'right' ? 'justify-end' : 'justify-start',
              choosingSide && 'opacity-60',
            )}
          >
            {row.tiles.map((tile, ti) => {
              // Recover original board index to detect exposed ends
              const globalIdx =
                row.flipped
                  ? ri * tilesPerRow + (row.tiles.length - 1 - ti)
                  : ri * tilesPerRow + ti;
              const isFirstTile = globalIdx === 0;
              const isLastTile = globalIdx === board.length - 1;
              const isExposed = choosingSide && (isFirstTile || isLastTile);
              const dbl = isDouble(tile);

              const isNewest = globalIdx === newestIdx;
              return (
                <div key={ti} className="relative">
                  <div className={isNewest ? (dbl ? 'animate-double-spin' : 'animate-tile-pop') : undefined}>
                    <DominoTile
                      tile={tile}
                      // Doubles stand perpendicular to the chain (portrait in a horizontal chain)
                      orientation={dbl ? 'v' : 'h'}
                      // Doubles don't need flipping — both halves are identical
                      flipped={dbl ? false : row.flipped}
                      size="md"
                      state={isExposed ? 'selected' : 'normal'}
                    />
                  </div>
                  {isNewest && (
                    <div className="absolute inset-0 rounded pointer-events-none border border-white/50 animate-tile-ripple" />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Open-ends hint */}
      {!choosingSide && openEnds && (
        <div className="flex justify-between text-white/25 text-xs font-mono mt-1.5 px-0.5 select-none">
          <span>← {openEnds[0]}</span>
          <span>{openEnds[1]} →</span>
        </div>
      )}
    </div>
  );
}
