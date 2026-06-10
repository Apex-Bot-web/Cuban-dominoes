import type { Tile } from '@dominoes/engine';

// Normalized [x, y] positions within a unit square for each pip count
const PIP_POS: Record<number, [number, number][]> = {
  0: [],
  1: [[0.5, 0.5]],
  2: [[0.75, 0.25], [0.25, 0.75]],
  3: [[0.75, 0.25], [0.5, 0.5], [0.25, 0.75]],
  4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]],
  5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
  6: [[0.25, 0.25], [0.25, 0.5], [0.25, 0.75], [0.75, 0.25], [0.75, 0.5], [0.75, 0.75]],
  7: [[0.25, 0.25], [0.25, 0.5], [0.25, 0.75], [0.5, 0.5], [0.75, 0.25], [0.75, 0.5], [0.75, 0.75]],
  8: [[0.25, 0.25], [0.25, 0.5], [0.25, 0.75], [0.5, 0.25], [0.5, 0.75], [0.75, 0.25], [0.75, 0.5], [0.75, 0.75]],
  9: [[0.25, 0.25], [0.25, 0.5], [0.25, 0.75], [0.5, 0.25], [0.5, 0.5], [0.5, 0.75], [0.75, 0.25], [0.75, 0.5], [0.75, 0.75]],
};

// Half-area pip rendering
function Pips({ value, x, y, w, h }: { value: number; x: number; y: number; w: number; h: number }) {
  const positions = PIP_POS[value] ?? [];
  const r = Math.min(w, h) * 0.11;
  return (
    <>
      {positions.map(([px, py], i) => (
        <circle key={i} cx={x + px * w} cy={y + py * h} r={r} fill="#1e293b" />
      ))}
    </>
  );
}

interface DominoTileProps {
  tile: Tile;
  /** 'v' = portrait (hand), 'h' = landscape (board) */
  orientation?: 'v' | 'h';
  selected?: boolean;
  highlighted?: boolean;
  dim?: boolean;
  onClick?: () => void;
  className?: string;
}

// Tile dimensions: each half is HALF×HALF, separated by a GAP-wide divider
const HALF = 34;
const GAP = 4;

export function DominoTile({
  tile,
  orientation = 'v',
  selected = false,
  highlighted = false,
  dim = false,
  onClick,
  className = '',
}: DominoTileProps) {
  const isH = orientation === 'h';
  const W = isH ? HALF * 2 + GAP : HALF;
  const H = isH ? HALF : HALF * 2 + GAP;

  // Half positions
  const h1 = isH ? { x: 0, y: 0, w: HALF, h: HALF } : { x: 0, y: 0, w: HALF, h: HALF };
  const h2 = isH
    ? { x: HALF + GAP, y: 0, w: HALF, h: HALF }
    : { x: 0, y: HALF + GAP, w: HALF, h: HALF };

  const border = selected
    ? '#fbbf24'
    : highlighted
      ? '#86efac'
      : '#a89070';

  const strokeWidth = selected || highlighted ? 2.5 : 1;
  const opacity = dim ? 0.45 : 1;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      onClick={onClick}
      className={`cursor-pointer transition-transform duration-100 ${selected ? 'scale-110' : ''} ${className}`}
      style={{ opacity, flexShrink: 0, display: 'block' }}
      aria-label={`${tile[0]}-${tile[1]}`}
    >
      <rect
        x={strokeWidth / 2}
        y={strokeWidth / 2}
        width={W - strokeWidth}
        height={H - strokeWidth}
        rx={4}
        fill="#f5f0dc"
        stroke={border}
        strokeWidth={strokeWidth}
      />
      {/* Selected glow */}
      {selected && (
        <rect
          x={strokeWidth / 2}
          y={strokeWidth / 2}
          width={W - strokeWidth}
          height={H - strokeWidth}
          rx={4}
          fill="#fef08a"
          opacity={0.25}
        />
      )}
      {/* Divider */}
      {isH ? (
        <line x1={HALF + 1} y1={5} x2={HALF + 1} y2={H - 5} stroke="#a89070" strokeWidth={1.5} />
      ) : (
        <line x1={5} y1={HALF + 1} x2={W - 5} y2={HALF + 1} stroke="#a89070" strokeWidth={1.5} />
      )}
      <Pips value={tile[0]} {...h1} />
      <Pips value={tile[1]} {...h2} />
    </svg>
  );
}

/** A facedown tile showing a hatched back pattern */
export function FaceDownTile({
  orientation = 'h',
  small = false,
}: {
  orientation?: 'v' | 'h';
  small?: boolean;
}) {
  const scale = small ? 0.6 : 1;
  const isH = orientation === 'h';
  const W = isH ? (HALF * 2 + GAP) * scale : HALF * scale;
  const H = isH ? HALF * scale : (HALF * 2 + GAP) * scale;
  const vbW = isH ? HALF * 2 + GAP : HALF;
  const vbH = isH ? HALF : HALF * 2 + GAP;

  return (
    <svg
      viewBox={`0 0 ${vbW} ${vbH}`}
      width={W}
      height={H}
      style={{ flexShrink: 0, display: 'block' }}
    >
      <rect x={0.5} y={0.5} width={vbW - 1} height={vbH - 1} rx={4} fill="#166534" stroke="#0a2e18" strokeWidth={1} />
      <rect x={2} y={2} width={vbW - 4} height={vbH - 4} rx={3} fill="none" stroke="#22c55e" strokeWidth={0.5} opacity={0.4} />
    </svg>
  );
}
