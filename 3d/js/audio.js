// Sons synthétisés (WebAudio) : aucun fichier audio. Le contexte doit être débloqué par un geste de l'utilisateur.
let ctx = null, master = null, muted = false, noiseBuf = null, lastGroan = 0;

export function unlock() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC(); master = ctx.createGain(); master.gain.value = muted ? 0 : 0.55; master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume();
}
export function setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.55; }
export const isMuted = () => muted;

function tone(freq, dur, { type = 'sine', vol = 0.3, slide = 0, delay = 0 } = {}) {
  if (!ctx || muted) return;
  const t = ctx.currentTime + delay, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, freq, { vol = 0.4, type = 'lowpass', delay = 0 } = {}) {
  if (!ctx || muted) return;
  const t = ctx.currentTime + delay, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noiseBuf; f.type = type; f.frequency.value = freq;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.02);
}

export const sfx = {
  shot(w) {
    if (w === 'shotgun') { noise(0.28, 1400, { vol: 0.9 }); tone(90, 0.25, { type: 'sawtooth', vol: 0.4, slide: -50 }); }
    else if (w === 'rifle') { noise(0.22, 2600, { vol: 0.8 }); tone(140, 0.2, { type: 'square', vol: 0.3, slide: -90 }); }
    else if (w === 'smg') { noise(0.09, 3200, { vol: 0.5 }); tone(200, 0.07, { type: 'square', vol: 0.18, slide: -120 }); }
    else { noise(0.13, 2800, { vol: 0.6 }); tone(170, 0.11, { type: 'square', vol: 0.22, slide: -110 }); }
  },
  swing() { noise(0.12, 1800, { vol: 0.25, type: 'bandpass' }); },
  chop(kind) { if (kind === 'rock') { tone(900, 0.06, { type: 'square', vol: 0.2, slide: -500 }); noise(0.1, 4000, { vol: 0.4, type: 'highpass' }); } else { tone(150, 0.09, { type: 'triangle', vol: 0.4, slide: -70 }); noise(0.08, 900, { vol: 0.45 }); } },
  build() { tone(160, 0.08, { type: 'square', vol: 0.25, slide: -60 }); tone(160, 0.08, { type: 'square', vol: 0.25, slide: -60, delay: 0.14 }); noise(0.1, 700, { vol: 0.3, delay: 0.14 }); },
  door(open) { tone(open ? 190 : 150, 0.18, { type: 'sawtooth', vol: 0.18, slide: open ? 80 : -50 }); noise(0.12, 600, { vol: 0.2, delay: open ? 0 : 0.12 }); },
  pieceHit() { noise(0.1, 500, { vol: 0.5 }); tone(110, 0.1, { type: 'triangle', vol: 0.3, slide: -40 }); },
  pieceBreak() { noise(0.45, 700, { vol: 0.8 }); tone(70, 0.4, { type: 'sawtooth', vol: 0.3, slide: -40 }); },
  loot() { tone(520, 0.07, { type: 'triangle', vol: 0.25 }); tone(700, 0.09, { type: 'triangle', vol: 0.25, delay: 0.08 }); noise(0.15, 2500, { vol: 0.15, type: 'highpass' }); },
  eat() { noise(0.09, 1200, { vol: 0.35 }); noise(0.09, 1200, { vol: 0.35, delay: 0.16 }); },
  drink() { tone(300, 0.12, { type: 'sine', vol: 0.2, slide: 120 }); tone(340, 0.12, { type: 'sine', vol: 0.2, slide: 120, delay: 0.16 }); },
  bandage() { noise(0.2, 3500, { vol: 0.25, type: 'highpass' }); tone(420, 0.1, { type: 'sine', vol: 0.15, delay: 0.2 }); },
  dusk() { tone(220, 0.8, { type: 'sine', vol: 0.18, slide: -60 }); tone(165, 1.0, { type: 'sine', vol: 0.15, slide: -40, delay: 0.3 }); },
  dawn() { tone(330, 0.6, { type: 'sine', vol: 0.15, slide: 120 }); tone(440, 0.8, { type: 'sine', vol: 0.15, slide: 100, delay: 0.25 }); },
  tip() { tone(600, 0.05, { type: 'sine', vol: 0.1 }); },
  empty() { tone(900, 0.04, { type: 'square', vol: 0.12 }); },
  reload() { tone(420, 0.05, { type: 'square', vol: 0.15 }); tone(300, 0.06, { type: 'square', vol: 0.15, delay: 0.55 }); tone(520, 0.05, { type: 'square', vol: 0.15, delay: 1.0 }); },
  swap() { tone(350, 0.05, { type: 'square', vol: 0.12 }); },
  hit() { noise(0.06, 900, { vol: 0.3 }); },
  headshot() { noise(0.08, 1800, { vol: 0.35 }); tone(900, 0.06, { type: 'triangle', vol: 0.15 }); },
  kill() { tone(110, 0.28, { type: 'sawtooth', vol: 0.2, slide: -60 }); },
  hurt() { noise(0.16, 500, { vol: 0.55 }); tone(120, 0.18, { type: 'sawtooth', vol: 0.3, slide: -70 }); },
  pickup() { tone(660, 0.08, { type: 'triangle', vol: 0.25 }); tone(990, 0.12, { type: 'triangle', vol: 0.25, delay: 0.08 }); },
  wave() { tone(180, 0.5, { type: 'sawtooth', vol: 0.25, slide: -60 }); tone(120, 0.7, { type: 'sawtooth', vol: 0.25, slide: -40, delay: 0.3 }); },
  clear() { tone(520, 0.12, { type: 'triangle', vol: 0.25 }); tone(780, 0.12, { type: 'triangle', vol: 0.25, delay: 0.12 }); tone(1040, 0.2, { type: 'triangle', vol: 0.25, delay: 0.24 }); },
  death() { tone(200, 1.2, { type: 'sawtooth', vol: 0.35, slide: -170 }); },
  groan() {
    if (!ctx || muted) return; const n = performance.now(); if (n - lastGroan < 900) return; lastGroan = n;
    tone(75 + Math.random() * 40, 0.7, { type: 'sawtooth', vol: 0.09, slide: -25 });
    noise(0.5, 380, { vol: 0.08, type: 'bandpass' });
  },
};
