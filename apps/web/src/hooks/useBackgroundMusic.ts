import { useEffect, useRef, useState } from 'react';
import { getSavedVolume, setMasterVolume, unlockAudio } from '../audio/context';

export function useBackgroundMusic(src = '/audio/music.mp3') {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [volume, setVolumeState] = useState<number>(getSavedVolume);

  useEffect(() => {
    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = getSavedVolume();
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

  // Unlock iOS AudioContext on any touch so sound effects work even before
  // the first tile tap.
  useEffect(() => {
    document.addEventListener('touchstart', unlockAudio, { passive: true });
    return () => document.removeEventListener('touchstart', unlockAudio);
  }, []);

  function setVolume(v: number) {
    const clamped = Math.max(0, Math.min(1, v));
    setVolumeState(clamped);
    // Sync both the <audio> element (background music) and the Web Audio
    // master gain (sound effects) through a single call.
    setMasterVolume(clamped);
    if (audioRef.current) audioRef.current.volume = clamped;
  }

  return { volume, setVolume };
}
