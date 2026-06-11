import { useEffect, useRef, useState } from 'react';

export function useBackgroundMusic(src = '/audio/music.mp3') {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = 0.12;
    audioRef.current = audio;

    const tryPlay = () => audio.play().catch(() => {});

    // Try immediately; if the browser blocks it, start on first tap/click
    audio.play().catch(() => {
      window.addEventListener('pointerdown', tryPlay, { once: true });
    });

    return () => {
      window.removeEventListener('pointerdown', tryPlay);
      audio.pause();
      audio.src = '';
    };
  }, [src]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
  }, [muted]);

  return { muted, toggleMute: () => setMuted((m) => !m) };
}
