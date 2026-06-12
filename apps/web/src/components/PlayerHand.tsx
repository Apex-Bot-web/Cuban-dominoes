import { useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';
import type { Tile } from '@dominoes/engine';
import { sameTile } from '@dominoes/engine';
import { DominoTile, type TileState } from './DominoTile';

function tileKey(t: Tile) {
  return `${Math.min(t[0], t[1])}-${Math.max(t[0], t[1])}`;
}

interface PlayerHandProps {
  tiles: readonly Tile[];
  playableTiles: Set<string>;
  selectedTile: Tile | null;
  isMyTurn: boolean;
  choosingSide: boolean;
  onSelect: (tile: Tile) => void;
  onCancelSelection: () => void;
  /** When this changes, tiles slide in with a stagger animation */
  handNumber?: number;
}

export function PlayerHand({
  tiles,
  playableTiles,
  selectedTile,
  isMyTurn,
  choosingSide,
  onSelect,
  onCancelSelection,
  handNumber,
}: PlayerHandProps) {
  const hasPlayable = playableTiles.size > 0;

  // Deal stagger: animate tiles in when a new hand is dealt
  const [isDealing, setIsDealing] = useState(false);
  const prevHandNumberRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (handNumber === undefined) return;
    const prev = prevHandNumberRef.current;
    prevHandNumberRef.current = handNumber;
    if (prev !== handNumber) {
      setIsDealing(true);
      const t = setTimeout(() => setIsDealing(false), tiles.length * 50 + 380);
      return () => clearTimeout(t);
    }
  }, [handNumber, tiles.length]);

  return (
    <div
      className={clsx(
        'flex flex-col items-center gap-1.5 transition-all duration-300 pb-safe',
        isMyTurn && hasPlayable && 'ring-1 ring-white/20 bg-white/5 rounded-t-2xl pt-2',
      )}
    >
      {/* Status label */}
      <div className="text-xs font-bold tracking-widest uppercase">
        {choosingSide ? (
          <span className="text-yellow-300">Choose a side ↑</span>
        ) : isMyTurn ? (
          hasPlayable ? (
            <span className="text-green-300">Your Turn — tap a tile</span>
          ) : (
            <span className="text-orange-300 animate-pulse">No moves — Passing…</span>
          )
        ) : (
          <span className="text-white/30">Waiting…</span>
        )}
      </div>

      {/* Tiles */}
      <div
        className="flex items-end gap-1.5 overflow-x-auto no-scrollbar w-full px-3"
        style={{ paddingBottom: 4 }}
      >
        {tiles.map((tile, i) => {
          const key = tileKey(tile);
          const isSelected = selectedTile !== null && sameTile(tile, selectedTile);
          const isPlayable = isMyTurn && playableTiles.has(key);

          let tileState: TileState = 'normal';
          if (isSelected) tileState = 'selected';
          else if (isPlayable) tileState = 'playable';
          else if (isMyTurn && !isPlayable) tileState = 'dim';

          return (
            <div
              key={i}
              className={clsx('transition-transform duration-150', isDealing && 'animate-tile-deal')}
              style={{
                transform: isSelected ? 'translateY(-10px)' : isPlayable ? 'translateY(-6px)' : undefined,
                animationDelay: isDealing ? `${i * 50}ms` : undefined,
              }}
            >
              <DominoTile
                tile={tile}
                orientation="v"
                size="md"
                state={tileState}
                onClick={() => {
                  if (isSelected) onCancelSelection();
                  else if (isPlayable) onSelect(tile);
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
