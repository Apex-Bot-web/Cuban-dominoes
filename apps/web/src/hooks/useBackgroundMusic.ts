import { useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'dominoes_music_volume';
const DEFAULT_VOLUME = 0.12;

function loadVolume(): number {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === null) return DEFAULT_VOLUME;
  const v = parseFloat(stored);
  return isNaN(v) ? DEFAULT_VOLUME : Math.max(0, Math.min(1, v));
}

export function useBackgroundMusic(src = '/audio/music.mp3') {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [volume, setVolumeState] = useState<number>(loadVolume);

  useEffect(() => {
    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = loadVolume();
    audioRef.current = audio;

    const tryPlay = () => audio.play().catch(() => {});
    audio.play().catch(() => {
      window.addEventListener('pointerdown', tryPlay, { once: true });
    });

    return () => {
      window.removeEventListener('pointerdown', tryPlay);
      audio.pause();
      audio.src = '';
    };
  }, [src]);

  function setVolume(v: number) {
    const clamped = Math.max(0, Math.min(1, v));
    setVolumeState(clamped);
    localStorage.setItem(STORAGE_KEY, String(clamped));
    if (audioRef.current) audioRef.current.volume = clamped;
  }

  return { volume, setVolume };
}
