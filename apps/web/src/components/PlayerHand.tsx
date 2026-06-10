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
  const hasPlayable = playableTiles.size > 0;

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
          <span className="text-yellow-300">Elige un lado ↑</span>
        ) : isMyTurn ? (
          hasPlayable ? (
            <span className="text-green-300">Tu Turno — toca una ficha</span>
          ) : (
            <span className="text-orange-300 animate-pulse">Sin jugada — Pasando…</span>
          )
        ) : (
          <span className="text-white/30">Esperando…</span>
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
              className="transition-transform duration-150"
              style={{ transform: isPlayable && !isSelected ? 'translateY(-4px)' : undefined }}
            >
              <DominoTile
                tile={tile}
                orientation="v"
                size="lg"
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
