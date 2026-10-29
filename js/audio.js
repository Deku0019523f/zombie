// Effets sonores synthétisés avec WebAudio (aucun fichier audio à charger).
import { getMuted, setMuted } from './storage.js';

let ctx = null;
let master = null;
let noiseBuf = null;
let muted = getMuted();

function ensure() {
  if (!ctx) {
    const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.25;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur, { type = 'square', vol = 0.2, slide = 0, delay = 0 } = {}) {
  if (muted) return;
  const c = ensure();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g);
  g.connect(master);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function noise(dur, { vol = 0.3, freq = 1500, delay = 0 } = {}) {
  if (muted) return;
  const c = ensure();
  if (!c) return;
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t0 = c.currentTime + delay;
  const s = c.createBufferSource();
  const f = c.createBiquadFilter();
  const g = c.createGain();
  s.buffer = noiseBuf;
  f.type = 'lowpass';
  f.frequency.value = freq;
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  s.connect(f);
  f.connect(g);
  g.connect(master);
  s.start(t0, 0, dur);
}

export const sfx = {
  unlock() { ensure(); },
  boom() { noise(0.55, { vol: 0.55, freq: 700 }); tone(70, 0.45, { type: 'sawtooth', vol: 0.3, slide: -45 }); },
  throw() { tone(280, 0.18, { type: 'triangle', vol: 0.12, slide: 220 }); },
  spit() { tone(420, 0.16, { type: 'triangle', vol: 0.12, slide: -260 }); },
  charge() { tone(110, 0.35, { type: 'sawtooth', vol: 0.18, slide: 90 }); },
  shield() { tone(700, 0.08, { type: 'triangle', vol: 0.1 }); },
  power() {
    tone(500, 0.07, { type: 'square', vol: 0.15 });
    tone(750, 0.07, { type: 'square', vol: 0.15, delay: 0.07 });
    tone(1100, 0.12, { type: 'square', vol: 0.15, delay: 0.14 });
  },
  nuke() { noise(0.9, { vol: 0.6, freq: 500 }); tone(55, 0.8, { type: 'sawtooth', vol: 0.35, slide: -30 }); },
  perk() {
    tone(440, 0.08, { type: 'triangle', vol: 0.18 });
    tone(660, 0.08, { type: 'triangle', vol: 0.18, delay: 0.08 });
    tone(880, 0.16, { type: 'triangle', vol: 0.18, delay: 0.16 });
  },
  pistol() { noise(0.08, { vol: 0.25, freq: 2500 }); tone(220, 0.08, { vol: 0.12, slide: -150 }); },
  shotgun() { noise(0.25, { vol: 0.45, freq: 1200 }); tone(110, 0.2, { type: 'sawtooth', vol: 0.2, slide: -70 }); },
  smg() { noise(0.05, { vol: 0.2, freq: 3000 }); tone(300, 0.05, { vol: 0.08, slide: -200 }); },
  hit() { tone(150, 0.05, { vol: 0.08 }); },
  kill() { tone(180, 0.15, { type: 'sawtooth', vol: 0.12, slide: -120 }); },
  hurt() { tone(120, 0.25, { type: 'sawtooth', vol: 0.25, slide: -80 }); noise(0.12, { vol: 0.2, freq: 800 }); },
  reload() { tone(500, 0.05, { vol: 0.1 }); tone(700, 0.05, { vol: 0.1, delay: 0.12 }); },
  switch() { tone(400, 0.05, { vol: 0.08 }); },
  empty() { tone(90, 0.05, { vol: 0.1 }); },
  pickup() { tone(600, 0.08, { type: 'triangle', vol: 0.2 }); tone(900, 0.1, { type: 'triangle', vol: 0.2, delay: 0.08 }); },
  wave() {
    tone(330, 0.15, { type: 'triangle', vol: 0.2 });
    tone(440, 0.15, { type: 'triangle', vol: 0.2, delay: 0.15 });
    tone(660, 0.25, { type: 'triangle', vol: 0.2, delay: 0.3 });
  },
  over() {
    tone(300, 0.4, { type: 'sawtooth', vol: 0.25, slide: -250 });
    tone(180, 0.6, { type: 'sawtooth', vol: 0.25, slide: -140, delay: 0.35 });
  },
};

export const isMuted = () => muted;
export function toggleMute() {
  muted = !muted;
  setMuted(muted);
  return muted;
}
