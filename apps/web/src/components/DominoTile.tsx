import { clsx } from 'clsx';
import type { Tile } from '@dominoes/engine';

// ─── Pip colors per pip value ────────────────────────────────────────────────
const PIP_COLOR: Record<number, string> = {
  0: 'transparent',
  1: '#1e293b',   // near-black
  2: '#2563eb',   // blue
  3: '#dc2626',   // red
  4: '#ea580c',   // orange
  5: '#7c3aed',   // purple
  6: '#15803d',   // green
  7: '#0e7490',   // teal
  8: '#be185d',   // pink
  9: '#92400e',   // amber-brown
};

// ─── Pip positions (normalized x,y in [0,1]²) ────────────────────────────────
const PIP_POS: Record<number, [number, number][]> = {
  0: [],
  1: [[.5, .5]],
  2: [[.75,.25],[.25,.75]],
  3: [[.75,.25],[.5,.5],[.25,.75]],
  4: [[.25,.25],[.75,.25],[.25,.75],[.75,.75]],
  5: [[.25,.25],[.75,.25],[.5,.5],[.25,.75],[.75,.75]],
  6: [[.25,.25],[.25,.5],[.25,.75],[.75,.25],[.75,.5],[.75,.75]],
  7: [[.25,.25],[.25,.5],[.25,.75],[.5,.5],[.75,.25],[.75,.5],[.75,.75]],
  8: [[.25,.25],[.25,.5],[.25,.75],[.5,.25],[.5,.75],[.75,.25],[.75,.5],[.75,.75]],
  9: [[.25,.25],[.25,.5],[.25,.75],[.5,.25],[.5,.5],[.5,.75],[.75,.25],[.75,.5],[.75,.75]],
};

// ─── Tile size presets ────────────────────────────────────────────────────────
export const TILE_SIZES = {
  // used for opponent face-down stacks
  xs:  { half: 20, gap: 3 },
  // board chain tiles on mobile
  sm:  { half: 28, gap: 3 },
  // board chain tiles on desktop / player hand
  md:  { half: 40, gap: 4 },
  // player hand tiles (portrait, larger for tapping)
  lg:  { half: 48, gap: 5 },
} as const;
export type TileSize = keyof typeof TILE_SIZES;

// ─── Pip renderer ─────────────────────────────────────────────────────────────
function Pips({ value, x, y, w, h }: { value: number; x: number; y: number; w: number; h: number }) {
  const positions = PIP_POS[value] ?? [];
  const color = PIP_COLOR[value] ?? '#1e293b';
  const r = Math.min(w, h) * 0.115;
  return (
    <>
      {positions.map(([px, py], i) => (
        <circle key={i} cx={x + px * w} cy={y + py * h} r={r} fill={color} />
      ))}
    </>
  );
}

// ─── Face-down tile (opponents) ───────────────────────────────────────────────
export function FaceDownTile({
  size = 'xs',
  orientation = 'h',
}: {
  size?: TileSize;
  orientation?: 'v' | 'h';
}) {
  const { half, gap } = TILE_SIZES[size];
  const isH = orientation === 'h';
  const W = isH ? half * 2 + gap : half;
  const H = isH ? half : half * 2 + gap;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      style={{ display: 'block', flexShrink: 0 }}
    >
      {/* Ivory tile body */}
      <rect x={0.5} y={0.5} width={W-1} height={H-1} rx={3} fill="#faf6ed" stroke="#c8b99a" strokeWidth={1} />
      {/* Divider */}
      {isH
        ? <line x1={half+0.5} y1={3} x2={half+0.5} y2={H-3} stroke="#c8b99a" strokeWidth={1} />
        : <line x1={3} y1={half+0.5} x2={W-3} y2={half+0.5} stroke="#c8b99a" strokeWidth={1} />
      }
      {/* Center dots for back pattern */}
      <circle cx={isH ? half/2 : W/2} cy={isH ? H/2 : half/2} r={Math.min(W,H)*0.1} fill="#e0d5bf" />
      <circle cx={isH ? half+gap+half/2 : W/2} cy={isH ? H/2 : half+gap+half/2} r={Math.min(W,H)*0.1} fill="#e0d5bf" />
    </svg>
  );
}

// ─── Main domino tile ─────────────────────────────────────────────────────────
export type TileState = 'normal' | 'playable' | 'selected' | 'dim';

interface DominoTileProps {
  tile: Tile;
  /** 'v' = portrait (hand), 'h' = landscape (board) */
  orientation?: 'v' | 'h';
  /** Swap pip values — used in odd snake-board rows */
  flipped?: boolean;
  size?: TileSize;
  state?: TileState;
  onClick?: () => void;
  className?: string;
}

export function DominoTile({
  tile,
  orientation = 'v',
  flipped = false,
  size = 'md',
  state = 'normal',
  onClick,
  className,
}: DominoTileProps) {
  const { half, gap } = TILE_SIZES[size];
  const isH = orientation === 'h';
  const W = isH ? half * 2 + gap : half;
  const H = isH ? half : half * 2 + gap;

  const v1 = flipped ? tile[1] : tile[0];
  const v2 = flipped ? tile[0] : tile[1];

  const half1 = { x: 0, y: 0, w: half, h: half };
  const half2 = isH ? { x: half + gap, y: 0, w: half, h: half } : { x: 0, y: half + gap, w: half, h: half };

  const tileBg = state === 'selected' ? '#fffbeb' : '#faf6ed';
  const borderColor = state === 'selected' ? '#f59e0b'
    : state === 'playable' ? '#4ade80'
    : '#c8b99a';
  const borderWidth = (state === 'selected' || state === 'playable') ? 2 : 1;

  return (
    <div
      aria-label={`${tile[0]}-${tile[1]}`}
      className={clsx(
        'rounded transition-all duration-150 select-none',
        state === 'playable' && 'cursor-pointer shadow-playable ring-2 ring-green-400',
        state === 'selected' && 'cursor-pointer shadow-selected ring-2 ring-yellow-400 -translate-y-3 animate-pulse-ring',
        state === 'dim'      && 'opacity-40 cursor-default',
        state === 'normal'   && 'shadow-tile',
        onClick && state !== 'dim' && 'cursor-pointer hover:brightness-105 active:scale-95',
        className,
      )}
      style={{ display: 'inline-block', lineHeight: 0, flexShrink: 0 }}
      onClick={state !== 'dim' ? onClick : undefined}
    >
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ display: 'block' }}>
        {/* Main body */}
        <rect
          x={borderWidth / 2} y={borderWidth / 2}
          width={W - borderWidth} height={H - borderWidth}
          rx={4} fill={tileBg} stroke={borderColor} strokeWidth={borderWidth}
        />
        {/* Divider */}
        {isH
          ? <line x1={half + 0.5} y1={4} x2={half + 0.5} y2={H - 4} stroke="#c8b99a" strokeWidth={1.5} />
          : <line x1={4} y1={half + 0.5} x2={W - 4} y2={half + 0.5} stroke="#c8b99a" strokeWidth={1.5} />
        }
        {/* Pips */}
        <Pips value={v1} {...half1} />
        <Pips value={v2} {...half2} />
      </svg>
    </div>
  );
}
