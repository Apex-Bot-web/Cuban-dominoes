// Singleton AudioContext shared by all sounds.
// iOS/Android require AudioContext to be created and resumed inside a user
// gesture handler. We unlock it on the first touch anywhere in the game.

const VOLUME_KEY = 'dominoes_music_volume';
const DEFAULT_VOLUME = 0.5;

let _ctx: AudioContext | null = null;
let _master: GainNode | null = null;

function ensureContext(): AudioContext {
  if (!_ctx) {
    _ctx = new AudioContext();
    _master = _ctx.createGain();
    _master.gain.value = getSavedVolume();
    _master.connect(_ctx.destination);
  }
  return _ctx;
}

export function getMasterGain(): GainNode {
  ensureContext();
  return _master!;
}

export function getSavedVolume(): number {
  const v = parseFloat(localStorage.getItem(VOLUME_KEY) ?? '');
  return isNaN(v) ? DEFAULT_VOLUME : Math.max(0, Math.min(1, v));
}

/** Called by the volume slider and sound play — syncs master gain + persists. */
export function setMasterVolume(v: number): void {
  const clamped = Math.max(0, Math.min(1, v));
  localStorage.setItem(VOLUME_KEY, String(clamped));
  if (_master && _ctx) {
    _master.gain.setValueAtTime(clamped, _ctx.currentTime);
  }
}

/**
 * Must be called from inside a touch/click handler to satisfy iOS's
 * requirement that AudioContext is resumed from a user gesture.
 * Safe to call repeatedly — becomes a no-op once running.
 */
export function unlockAudio(): void {
  try {
    const ctx = ensureContext();
    if (ctx.state !== 'running') void ctx.resume();
  } catch {
    // AudioContext not available in this environment
  }
}

/** Returns the context if already unlocked, otherwise tries to unlock. */
export function getRunningContext(): AudioContext | null {
  try {
    const ctx = ensureContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}
