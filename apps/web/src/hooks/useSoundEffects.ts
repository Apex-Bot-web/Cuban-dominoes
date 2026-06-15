import { getMasterGain, getRunningContext, unlockAudio } from '../audio/context';

type SoundName = 'tileSelect' | 'tilePlace' | 'pass' | 'deal' | 'win' | 'lose';

function scheduleEnvelope(
  ctx: AudioContext,
  osc: OscillatorNode,
  gain: GainNode,
  peak: number,
  attackEnd: number,
  decayEnd: number,
) {
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(peak, ctx.currentTime + attackEnd);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + decayEnd);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + decayEnd);
}

export function useSoundEffects() {
  function play(name: SoundName) {
    // Unlock on every play call — if triggered by a direct touch this satisfies iOS;
    // if triggered by a state-change effect it's a safe no-op once already running.
    unlockAudio();
    const c = getRunningContext();
    if (!c) return;
    // All oscillators connect to the master gain so the volume slider applies.
    const dest = getMasterGain();

    try {
      switch (name) {
        case 'tileSelect': {
          const osc = c.createOscillator();
          const g = c.createGain();
          osc.connect(g); g.connect(dest);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1100, c.currentTime);
          osc.frequency.exponentialRampToValueAtTime(900, c.currentTime + 0.03);
          scheduleEnvelope(c, osc, g, 0.18, 0.004, 0.07);
          break;
        }
        case 'tilePlace': {
          const osc1 = c.createOscillator();
          const osc2 = c.createOscillator();
          const g1 = c.createGain(); const g2 = c.createGain();
          osc1.connect(g1); osc2.connect(g2);
          g1.connect(dest); g2.connect(dest);
          osc1.type = 'square'; osc1.frequency.setValueAtTime(400, c.currentTime);
          osc1.frequency.exponentialRampToValueAtTime(200, c.currentTime + 0.06);
          scheduleEnvelope(c, osc1, g1, 0.28, 0.004, 0.09);
          osc2.type = 'sawtooth'; osc2.frequency.setValueAtTime(1800, c.currentTime);
          osc2.frequency.exponentialRampToValueAtTime(600, c.currentTime + 0.04);
          scheduleEnvelope(c, osc2, g2, 0.07, 0.002, 0.05);
          break;
        }
        case 'pass': {
          const osc = c.createOscillator();
          const g = c.createGain();
          osc.connect(g); g.connect(dest);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(400, c.currentTime);
          osc.frequency.exponentialRampToValueAtTime(180, c.currentTime + 0.18);
          scheduleEnvelope(c, osc, g, 0.15, 0.01, 0.22);
          break;
        }
        case 'deal': {
          for (let i = 0; i < 3; i++) {
            const osc = c.createOscillator();
            const g = c.createGain();
            osc.connect(g); g.connect(dest);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(900 + i * 80, c.currentTime + i * 0.055);
            g.gain.setValueAtTime(0, c.currentTime + i * 0.055);
            g.gain.linearRampToValueAtTime(0.12, c.currentTime + i * 0.055 + 0.005);
            g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + i * 0.055 + 0.065);
            osc.start(c.currentTime + i * 0.055);
            osc.stop(c.currentTime + i * 0.055 + 0.07);
          }
          break;
        }
        case 'win': {
          const freqs = [523, 659, 784];
          freqs.forEach((freq, i) => {
            const osc = c.createOscillator();
            const g = c.createGain();
            osc.connect(g); g.connect(dest);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, c.currentTime + i * 0.13);
            g.gain.setValueAtTime(0, c.currentTime + i * 0.13);
            g.gain.linearRampToValueAtTime(0.22, c.currentTime + i * 0.13 + 0.02);
            g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + i * 0.13 + 0.28);
            osc.start(c.currentTime + i * 0.13);
            osc.stop(c.currentTime + i * 0.13 + 0.3);
          });
          break;
        }
        case 'lose': {
          const freqs = [440, 330];
          freqs.forEach((freq, i) => {
            const osc = c.createOscillator();
            const g = c.createGain();
            osc.connect(g); g.connect(dest);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, c.currentTime + i * 0.18);
            g.gain.setValueAtTime(0, c.currentTime + i * 0.18);
            g.gain.linearRampToValueAtTime(0.18, c.currentTime + i * 0.18 + 0.02);
            g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + i * 0.18 + 0.35);
            osc.start(c.currentTime + i * 0.18);
            osc.stop(c.currentTime + i * 0.18 + 0.38);
          });
          break;
        }
      }
    } catch {
      // Fail silently
    }
  }

  return { play };
}
