interface PegaoFlashProps {
  show: boolean;
}

export function PegaoFlash({ show }: PegaoFlashProps) {
  if (!show) return null;
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
      <span
        className="animate-pegao font-black uppercase select-none"
        style={{
          fontSize: 'clamp(3.5rem, 18vw, 7rem)',
          color: '#ef4444',
          textShadow: '0 0 40px rgba(239,68,68,0.9), 0 0 80px rgba(239,68,68,0.5)',
          letterSpacing: '0.1em',
        }}
      >
        PEGAO
      </span>
    </div>
  );
}
