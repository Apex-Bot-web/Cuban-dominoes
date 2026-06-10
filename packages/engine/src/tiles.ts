import type { Tile } from './types.js';

/** Full double-N set: all pairs (a,b) with 0 <= a <= b <= maxPip. Double-9 => 55 tiles. */
export function fullSet(maxPip: number): Tile[] {
  const tiles: Tile[] = [];
  for (let a = 0; a <= maxPip; a++) {
    for (let b = a; b <= maxPip; b++) {
      tiles.push([a, b]);
    }
  }
  return tiles;
}

export function pipSum(tile: Tile): number {
  return tile[0] + tile[1];
}

export function isDouble(tile: Tile): boolean {
  return tile[0] === tile[1];
}

/** Order-insensitive equality: [3,7] === [7,3]. */
export function sameTile(a: Tile, b: Tile): boolean {
  return (a[0] === b[0] && a[1] === b[1]) || (a[0] === b[1] && a[1] === b[0]);
}

export function tileInHand(hand: readonly Tile[], tile: Tile): number {
  return hand.findIndex((t) => sameTile(t, tile));
}

export function handPips(hand: readonly Tile[]): number {
  return hand.reduce((sum, t) => sum + pipSum(t), 0);
}

export function tileToString(tile: Tile): string {
  return `[${tile[0]}|${tile[1]}]`;
}
