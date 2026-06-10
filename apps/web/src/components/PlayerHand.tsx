import type { Tile } from '@dominoes/engine';
import { sameTile } from '@dominoes/engine';
import { DominoTile } from './DominoTile';

interface PlayerHandProps {
  tiles: readonly Tile[];
  playableTiles: Set<string>;
  selectedTile: Tile | null;
  isMyTurn: boolean;
  choosingSide: boolean;
  onSelect: (tile: Tile) => void;
  onCancelSelection: () => void;
}

function tileKey(t: Tile): string {
  return `${Math.min(t[0], t[1])}-${Math.max(t[0], t[1])}`;
}

export function PlayerHand({
  tiles,
  playableTiles,
  selectedTile,
  isMyTurn,
  choosingSide,
  onSelect,
  onCancelSelection,
}: PlayerHandProps) {
  return (
    <div className="flex flex-col items-center gap-1 pb-safe">
      {/* Status label */}
      <div className="text-xs font-semibold tracking-wide uppercase">
        {choosingSide ? (
          <span className="text-yellow-300 animate-pulse">Elige un lado ↑</span>
        ) : isMyTurn ? (
          playableTiles.size > 0 ? (
            <span className="text-green-300">Tu turno — toca una ficha</span>
          ) : (
            <span className="text-orange-300">Sin jugada — pasando…</span>
          )
        ) : (
          <span className="text-green-700">Esperando…</span>
        )}
      </div>

      {/* Tile row */}
      <div
        className="flex items-end gap-1 overflow-x-auto w-full px-2"
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {tiles.map((tile, i) => {
          const key = tileKey(tile);
          const isSelected = selectedTile !== null && sameTile(tile, selectedTile);
          const isPlayable = isMyTurn && playableTiles.has(key);
          const isDim = isMyTurn && !isPlayable && !isSelected;

          return (
            <div
              key={i}
              className={`transition-transform duration-150 ${
                isSelected ? '-translate-y-3' : isPlayable ? '-translate-y-1 hover:-translate-y-2' : ''
              }`}
            >
              <DominoTile
                tile={tile}
                orientation="v"
                selected={isSelected}
                highlighted={isPlayable && !isSelected}
                dim={isDim}
                onClick={() => {
                  if (isSelected) {
                    onCancelSelection();
                  } else if (isPlayable) {
                    onSelect(tile);
                  }
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
