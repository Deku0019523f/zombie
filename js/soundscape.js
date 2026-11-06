// Paysage sonore de la ville (100 % synthétisé) : ambiances par zone, sons d'événements, grognements spatialisés,
// bruits de pas selon le sol, réverbération / son étouffé en intérieur, musique adaptative et battements de cœur.
// Tout passe par le graphe de audio.js ; sans contexte audio (tests, avant le premier geste) les fonctions ne font rien.
import { state } from './state.js';
import { audioGraph, isMuted, setSpace } from './audio.js';
import { soundQueue } from './soundq.js';
import { zoneAt, surfaceAt, isIndoor } from './citymap.js';
import { dayNight, rainAmount, fogAmount } from './ambient.js';
import { rand } from './util.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const HEAR = 330;                         // portée d'écoute des grognements (px)

let G = null;                             // graphe courant
let beds = null;                          // nappes continues
let evT = 4;
let stepAcc = 0;
let stepSide = 1;
let lastX = 0;
let lastY = 0;
let beatT = 0;
let pulseT = 0;
let threat = 0;
let groanBudget = 0;
let groanClock = 0;
let alarmT = 0;

// ---------- Briques de base ----------

function pannerFor(x) {
  if (!G || !G.ctx.createStereoPanner) return null;
  const p = G.ctx.createStereoPanner();
  p.pan.value = clamp((x - state.player.x) / 220, -1, 1);
  return p;
}
const volAt = (x, y, range, pow = 1.4) => Math.pow(clamp(1 - Math.hypot(x - state.player.x, y - state.player.y) / range, 0, 1), pow);

// Voix : oscillateur → filtre → gain (enveloppe) → pan → master (+ envoi réverbération).
function voice({ type = 'sine', f = 440, to = null, dur = 0.3, vol = 0.1, at = 0, x = null, filter = null, wet = 0.15, attack = 0.01, vib = 0 }) {
  if (!G || isMuted()) return;
  const { ctx, master, send } = G;
  const t0 = ctx.currentTime + at;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t0);
  if (to) o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
  if (vib) {
    const l = ctx.createOscillator();
    const lg = ctx.createGain();
    l.frequency.value = 6 + Math.random() * 3;
    lg.gain.value = f * vib;
    l.connect(lg);
    lg.connect(o.frequency);
    l.start(t0);
    l.stop(t0 + dur + 0.05);
  }
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  let node = o;
  if (filter) {
    const b = ctx.createBiquadFilter();
    b.type = filter.type || 'lowpass';
    b.frequency.value = filter.f;
    b.Q.value = filter.q || 0.7;
    node.connect(b);
    node = b;
  }
  node.connect(g);
  let out = g;
  const pn = x !== null ? pannerFor(x) : null;
  if (pn) { g.connect(pn); out = pn; }
  out.connect(master);
  if (send && wet > 0) { const k = ctx.createGain(); k.gain.value = wet; out.connect(k); k.connect(send); }
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

// Souffle : bruit filtré avec enveloppe.
function puff({ dur = 0.3, vol = 0.1, at = 0, x = null, bp = null, hp = null, lp = null, wet = 0.15, attack = 0.01 }) {
  if (!G || isMuted()) return;
  const { ctx, master, send, noise } = G;
  const t0 = ctx.currentTime + at;
  const s = ctx.createBufferSource();
  s.buffer = noise;
  let node = s;
  const chain = (type, f, q = 0.8) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; node.connect(b); node = b; };
  if (hp) chain('highpass', hp);
  if (bp) chain('bandpass', bp[0], bp[1]);
  if (lp) chain('lowpass', lp);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  node.connect(g);
  let out = g;
  const pn = x !== null ? pannerFor(x) : null;
  if (pn) { g.connect(pn); out = pn; }
  out.connect(master);
  if (send && wet > 0) { const k = ctx.createGain(); k.gain.value = wet; out.connect(k); k.connect(send); }
  s.start(t0, Math.random() * 0.5, dur + 0.05);
}

// ---------- Nappes continues ----------

function loopNoise(filterType, f, q) {
  const { ctx, noise } = G;
  const s = ctx.createBufferSource();
  s.buffer = noise;
  s.loop = true;
  const b = ctx.createBiquadFilter();
  b.type = filterType;
  b.frequency.value = f;
  b.Q.value = q;
  const g = ctx.createGain();
  g.gain.value = 0;
  s.connect(b);
  b.connect(g);
  g.connect(beds.bus);
  s.start();
  return { g, b };
}

function osc(type, f, dest, gain = 1) {
  const { ctx } = G;
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.value = f;
  const g = ctx.createGain();
  g.gain.value = gain;
  o.connect(g);
  g.connect(dest);
  o.start();
  return { o, g };
}

function buildBeds() {
  const { ctx, master } = G;
  const bus = ctx.createGain();
  bus.gain.value = 1;
  bus.connect(master);
  beds = { bus };
  beds.wind = loopNoise('bandpass', 420, 0.6);
  const lfo = osc('sine', 0.13, ctx.createGain(), 1);               // le vent « respire »
  const lfoG = ctx.createGain();
  lfoG.gain.value = 0.03;
  lfo.o.connect(lfoG);
  lfoG.connect(beds.wind.g.gain);
  beds.rain = loopNoise('highpass', 1400, 0.4);
  beds.waves = loopNoise('lowpass', 500, 0.5);
  // ronronnement de zone (industrie, hôpital, néons…) : deux oscillateurs légèrement désaccordés
  beds.humG = ctx.createGain();
  beds.humG.gain.value = 0;
  beds.humLp = ctx.createBiquadFilter();
  beds.humLp.type = 'lowpass';
  beds.humLp.frequency.value = 400;
  beds.humG.connect(beds.humLp);
  beds.humLp.connect(bus);
  beds.hum1 = osc('sawtooth', 50, beds.humG, 1);
  beds.hum2 = osc('sawtooth', 50.7, beds.humG, 1);
  // grillons (nuit) : porteuse aiguë modulée par un LFO carré
  beds.crick = ctx.createGain();
  beds.crick.gain.value = 0;
  beds.crick.connect(bus);
  const cr = ctx.createGain();
  cr.gain.value = 0.5;
  cr.connect(beds.crick);
  osc('sine', 4700, cr, 1);
  const cl = ctx.createOscillator();
  cl.type = 'square';
  cl.frequency.value = 7;
  const clg = ctx.createGain();
  clg.gain.value = 0.5;
  cl.connect(clg);
  clg.connect(cr.gain);
  cl.start();
  // musique : nappe grave (toujours), tension (pulsation), danger (cordes dissonantes)
  beds.mLow = ctx.createGain();
  beds.mLow.gain.value = 0;
  const mlp = ctx.createBiquadFilter();
  mlp.type = 'lowpass';
  mlp.frequency.value = 260;
  beds.mLow.connect(mlp);
  mlp.connect(bus);
  osc('sawtooth', 55, beds.mLow, 0.6);
  osc('sawtooth', 82.4, beds.mLow, 0.4);
  osc('sawtooth', 130.8, beds.mLow, 0.25);
  beds.mTen = ctx.createGain();
  beds.mTen.gain.value = 0;
  const tlp = ctx.createBiquadFilter();
  tlp.type = 'lowpass';
  tlp.frequency.value = 520;
  beds.mTen.connect(tlp);
  tlp.connect(bus);
  osc('sawtooth', 110, beds.mTen, 0.5);
  osc('sawtooth', 164.8, beds.mTen, 0.3);
  const tl = osc('sine', 3.2, ctx.createGain(), 1);
  const tlg = ctx.createGain();
  tlg.gain.value = 0.3;
  tl.o.connect(tlg);
  tlg.connect(beds.mTen.gain);
  beds.mDan = ctx.createGain();
  beds.mDan.gain.value = 0;
  const dhp = ctx.createBiquadFilter();
  dhp.type = 'highpass';
  dhp.frequency.value = 300;
  beds.mDan.connect(dhp);
  dhp.connect(bus);
  osc('sawtooth', 440, beds.mDan, 0.4);
  osc('sawtooth', 466.2, beds.mDan, 0.4);
  osc('sawtooth', 622.3, beds.mDan, 0.2);
}

function setGain(node, v, tc = 0.8) {
  if (node && node.gain) node.gain.setTargetAtTime(v, G.ctx.currentTime, tc);
}

const ZONE_BED = {      // vent, ronronnement (Hz, volume), vagues
  res: { wind: 0.05, hum: [0, 0], waves: 0 },
  banlieue: { wind: 0.045, hum: [0, 0], waves: 0 },
  centre: { wind: 0.03, hum: [60, 0.012], waves: 0 },
  police: { wind: 0.03, hum: [100, 0.01], waves: 0 },
  indus: { wind: 0.045, hum: [48, 0.03], waves: 0 },
  hopital: { wind: 0.015, hum: [120, 0.02], waves: 0 },
  station: { wind: 0.035, hum: [100, 0.016], waves: 0 },
  cimetiere: { wind: 0.07, hum: [0, 0], waves: 0 },
  parc: { wind: 0.05, hum: [0, 0], waves: 0 },
  ecole: { wind: 0.04, hum: [0, 0], waves: 0 },
  port: { wind: 0.06, hum: [46, 0.014], waves: 0.07 },
  autoroute: { wind: 0.08, hum: [0, 0], waves: 0 },
};

// ---------- Événements d'ambiance par zone ----------

const far = () => {                                  // position d'une source lointaine, de part et d'autre
  const a = rand(0, Math.PI * 2);
  const d = rand(140, 330);
  return { x: state.player.x + Math.cos(a) * d, y: state.player.y + Math.sin(a) * d };
};

const bark = (x) => { for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) { voice({ type: 'sawtooth', f: 520, to: 280, dur: 0.14, vol: 0.05, at: i * 0.27, x, filter: { type: 'bandpass', f: 900, q: 2 }, wet: 0.3 }); puff({ dur: 0.1, vol: 0.03, at: i * 0.27, x, bp: [1200, 1.5], wet: 0.3 }); } };
const caw = (x, v = 0.05) => { for (let i = 0; i < 2; i++) voice({ type: 'sawtooth', f: 800, to: 420, dur: 0.22, vol: v, at: i * 0.3, x, filter: { type: 'bandpass', f: 1100, q: 3 }, vib: 0.05, wet: 0.25 }); };
const siren = (x) => { for (let i = 0; i < 5; i++) voice({ type: 'sine', f: 620, to: 920, dur: 0.55, vol: 0.035, at: i * 0.6, x, wet: 0.5, attack: 0.15 }); };
const carAlarm = (x) => { for (let i = 0; i < 8; i++) voice({ type: 'square', f: i % 2 ? 900 : 700, dur: 0.12, vol: 0.025, at: i * 0.15, x, filter: { f: 2500 }, wet: 0.4 }); };
const glass = (x) => { puff({ dur: 0.35, vol: 0.09, x, hp: 3000, wet: 0.4 }); for (let i = 0; i < 4; i++) voice({ type: 'triangle', f: 2400 + Math.random() * 1500, dur: 0.1, vol: 0.03, at: 0.1 + i * 0.07, x, wet: 0.4 }); };
const clang = (x) => { voice({ type: 'triangle', f: 230, to: 200, dur: 0.7, vol: 0.07, x, wet: 0.5 }); puff({ dur: 0.5, vol: 0.05, x, bp: [1800, 3], wet: 0.5 }); };
const steam = (x) => puff({ dur: 1.3, vol: 0.05, x, hp: 2500, attack: 0.2, wet: 0.2 });
const creak = (x) => voice({ type: 'sawtooth', f: 95, to: 65, dur: 0.9, vol: 0.04, x, filter: { type: 'bandpass', f: 400, q: 6 }, vib: 0.1, wet: 0.4, attack: 0.15 });
const beep = (x) => { for (let i = 0; i < 3; i++) voice({ f: 880, dur: 0.12, vol: 0.035, at: i * 0.9, x, wet: 0.5 }); };
const flatline = (x) => voice({ f: 1000, dur: 1.6, vol: 0.025, x, wet: 0.6, attack: 0.05 });
const moan = (x) => voice({ type: 'sawtooth', f: 110, to: 70, dur: 1.4, vol: 0.05, x, filter: { type: 'bandpass', f: 520, q: 3 }, vib: 0.04, wet: 0.5, attack: 0.3 });
const radio = (x) => { puff({ dur: 0.6, vol: 0.04, x, bp: [2400, 1.2], wet: 0.2 }); voice({ f: 1000, dur: 0.08, vol: 0.03, at: 0.65, x }); voice({ f: 1300, dur: 0.08, vol: 0.03, at: 0.78, x }); };
const neon = (x) => { for (let i = 0; i < 6; i++) voice({ type: 'sawtooth', f: 100, dur: 0.05, vol: 0.03, at: i * 0.07 + Math.random() * 0.03, x, filter: { f: 700 }, wet: 0.1 }); };
const chime = (x) => { voice({ f: 1318, dur: 0.5, vol: 0.04, x, wet: 0.4 }); voice({ f: 988, dur: 0.6, vol: 0.04, at: 0.22, x, wet: 0.4 }); };
const owl = (x) => { for (let i = 0; i < 2; i++) voice({ f: 420, to: 330, dur: 0.45, vol: 0.05, at: i * 0.7, x, wet: 0.5, attack: 0.08 }); };
const bell = (x) => { for (const [f, v] of [[220, 0.06], [440, 0.03], [660, 0.02]]) voice({ f, dur: 3, vol: v, x, wet: 0.7, attack: 0.005 }); };
const chirp = (x) => { for (let i = 0; i < 3; i++) voice({ f: 2800 + Math.random() * 1200, to: 3800, dur: 0.07, vol: 0.025, at: i * 0.11, x, wet: 0.2 }); };
const swing = (x) => voice({ type: 'sawtooth', f: 1200, to: 850, dur: 0.6, vol: 0.02, x, filter: { type: 'bandpass', f: 1500, q: 8 }, vib: 0.08, wet: 0.4 });
const horn = (x) => voice({ type: 'sawtooth', f: 98, dur: 2.2, vol: 0.07, x, filter: { f: 500 }, wet: 0.7, attack: 0.25 });
const gull = (x) => { for (let i = 0; i < 3; i++) voice({ f: 1800, to: 1200, dur: 0.3, vol: 0.03, at: i * 0.4, x, wet: 0.3, vib: 0.06 }); };
const chain = (x) => { for (let i = 0; i < 4; i++) voice({ type: 'triangle', f: 1400 + Math.random() * 400, dur: 0.07, vol: 0.03, at: i * 0.09, x, wet: 0.5 }); };
const klaxon = (x) => voice({ type: 'square', f: 440, dur: 1, vol: 0.035, x, filter: { f: 1800 }, wet: 0.5 });
const farShot = (x) => { puff({ dur: 0.25, vol: 0.05, x, lp: 700, wet: 0.7 }); };
const farCry = (x) => moan(x);

const EVENTS = {
  res: { day: [bark, caw, creak, glass], night: [bark, owl, creak, moan] },
  banlieue: { day: [bark, caw, chirp, creak], night: [bark, owl, creak, moan] },
  centre: { day: [siren, carAlarm, glass, klaxon, farShot], night: [siren, carAlarm, glass, moan, farShot] },
  police: { day: [radio, neon, siren], night: [radio, neon, moan, siren] },
  indus: { day: [clang, steam, creak, chain], night: [clang, steam, creak, moan] },
  hopital: { day: [beep, flatline, moan, clang], night: [beep, flatline, moan, moan] },
  station: { day: [neon, chime, clang, carAlarm], night: [neon, chime, creak, moan] },
  cimetiere: { day: [caw, bell, creak], night: [owl, bell, moan, moan] },
  parc: { day: [chirp, chirp, caw, bark], night: [owl, creak, moan] },
  ecole: { day: [swing, bell, caw], night: [swing, creak, moan] },
  port: { day: [horn, gull, chain, clang], night: [horn, chain, clang, moan] },
  autoroute: { day: [klaxon, carAlarm, farShot, caw], night: [klaxon, carAlarm, moan, farShot] },
};

function ambientEvent() {
  const z = zoneAt(state.player.x, state.player.y).id;
  const table = EVENTS[z] || EVENTS.res;
  const list = dayNight() > 0.55 ? table.night : table.day;
  const fn = list[Math.floor(Math.random() * list.length)];
  fn(far().x);
}

// ---------- Grognements spatialisés ----------

const GROAN = {            // [fréquence de base, durée, filtre formant, volume]
  walker: [95, 1.0, 520, 0.07], runner: [160, 0.55, 800, 0.06], tank: [55, 1.4, 320, 0.1], spitter: [130, 0.9, 700, 0.06],
  exploder: [120, 0.8, 600, 0.05], charger: [70, 0.9, 400, 0.08], summoner: [180, 1.2, 900, 0.06], crawler: [150, 0.7, 1000, 0.055], boss: [45, 1.8, 260, 0.12],
};

function groan(z, aggro) {
  const def = GROAN[z.type] || GROAN.walker;
  const d = Math.hypot(z.x - state.player.x, z.y - state.player.y);
  const v = volAt(z.x, z.y, HEAR);
  if (v < 0.03) return;
  const f = def[0] * (0.85 + (z.ph % 1) * 0.3);
  const cut = 500 + 3500 * (1 - d / HEAR);                     // plus loin = plus sourd
  voice({ type: 'sawtooth', f, to: f * (aggro ? 0.7 : 0.82), dur: def[1] * (aggro ? 0.8 : 1), vol: def[3] * v * (aggro ? 1.3 : 1), x: z.x, filter: { type: 'bandpass', f: Math.min(def[2], cut), q: 3 }, vib: 0.05, wet: 0.25, attack: 0.12 });
  puff({ dur: def[1] * 0.7, vol: def[3] * v * 0.4, x: z.x, bp: [Math.min(1000, cut), 1.2], wet: 0.2, attack: 0.15 });
  if (z.type === 'exploder' && d < 160) voice({ f: 1400, dur: 0.05, vol: 0.03 * v, x: z.x });
}

function alertCry(z) {                                          // cri quand un zombie repère le joueur
  const v = volAt(z.x, z.y, HEAR * 1.2);
  if (v < 0.03) return;
  voice({ type: 'sawtooth', f: 260, to: 110, dur: 0.6, vol: 0.09 * v, x: z.x, filter: { type: 'bandpass', f: 1100, q: 2 }, vib: 0.06, wet: 0.35, attack: 0.03 });
  puff({ dur: 0.4, vol: 0.05 * v, x: z.x, bp: [1500, 1], wet: 0.3 });
}

function zombieSounds(dt) {
  groanClock += dt;
  groanBudget = Math.min(3, groanBudget + dt * 6);
  const p = state.player;
  let near = 0;
  for (const z of state.zombies) {
    if (z.dead) continue;
    const d = Math.hypot(z.x - p.x, z.y - p.y);
    if (z.aggro && !z._ag) { z._ag = true; if (groanBudget >= 1) { groanBudget--; alertCry(z); } }
    else if (!z.aggro) z._ag = false;
    if (z.aggro && d < 300) near += 1 - d / 300;
    if (d > HEAR) continue;
    z.gT = (z.gT ?? rand(0.5, 5)) - dt;
    if (z.gT <= 0) {
      z.gT = z.aggro ? rand(1.6, 3.6) : rand(4, 9);
      if (z.type === 'crawler' && !z.aggro) continue;            // les rampants font le mort : silence
      if (groanBudget >= 1) { groanBudget--; groan(z, z.aggro); }
    }
  }
  threat += (clamp(near / 4, 0, 1) - threat) * Math.min(1, dt * 0.8);
}

// ---------- Pas ----------

function steps(dt) {
  const p = state.player;
  const d = Math.hypot(p.x - lastX, p.y - lastY);
  lastX = p.x;
  lastY = p.y;
  if (d > 40 || d < 0.05) return;
  stepAcc += d;
  if (stepAcc < 24) return;
  stepAcc = 0;
  stepSide = -stepSide;
  const pan = stepSide * 0.12;
  void pan;
  const surf = surfaceAt(p.x, p.y);
  const x = p.x + stepSide * 6;
  const wet = isIndoor(p.x, p.y) ? 0.5 : 0.08;
  if (surf === 'grass') puff({ dur: 0.09, vol: 0.045, x, lp: 900, wet: 0.05 });
  else if (surf === 'gravel') { puff({ dur: 0.05, vol: 0.05, x, hp: 2500, wet: 0.1 }); puff({ dur: 0.05, vol: 0.04, x, hp: 3200, at: 0.045, wet: 0.1 }); }
  else if (surf === 'tile') { voice({ type: 'triangle', f: 620 + stepSide * 40, dur: 0.05, vol: 0.04, x, wet }); puff({ dur: 0.04, vol: 0.03, x, bp: [2000, 2], wet }); }
  else puff({ dur: 0.06, vol: 0.045, x, bp: [1500, 1.2], wet: 0.1 });
}

// ---------- Événements envoyés par la logique ----------

function playEvent(e) {
  switch (e.kind) {
    case 'thunder': puff({ dur: 2.4, vol: 0.22, lp: 380, attack: 0.15, wet: 0.7 }); voice({ type: 'sawtooth', f: 60, to: 30, dur: 2, vol: 0.12, filter: { f: 200 }, wet: 0.6, attack: 0.2 }); break;
    case 'crow': caw(e.x, 0.07); break;
    case 'wings': puff({ dur: 0.4, vol: 0.05, x: e.x, bp: [900, 1], wet: 0.1 }); break;
    case 'alarmStart': alarmT = 14; break;
    case 'chest': case 'mapFound': break;                          // joués par sfx.chest / sfx.paper ci-dessous
    default:
  }
}

export function updateSoundscape(dt) {
  // la file est toujours vidée, même sans son
  const q = soundQueue.splice(0, soundQueue.length);
  G = audioGraph(false);
  if (!G) return;
  if (!beds) buildBeds();
  const muted = isMuted();
  setGain(beds.bus, muted ? 0 : 1, 0.1);
  if (muted) return;
  for (const e of q) playEvent(e);

  const p = state.player;
  const zone = zoneAt(p.x, p.y);
  const indoor = isIndoor(p.x, p.y);
  const night = dayNight();
  const rain = rainAmount();
  const fog = fogAmount();
  const B = ZONE_BED[zone.id] || ZONE_BED.res;
  const out = indoor ? 0.35 : 1;                                  // dedans, l'extérieur est étouffé

  setSpace(indoor ? 0.5 : 0.18);                                  // réverbération des sons joués
  setGain(beds.wind.g, (B.wind + rain * 0.04 + fog * 0.015) * out, 1.2);
  setGain(beds.rain.g, rain * 0.09 * out, 1.5);
  setGain(beds.waves.g, B.waves * out, 1.5);
  if (B.hum[0]) { beds.hum1.o.frequency.setTargetAtTime(B.hum[0], G.ctx.currentTime, 0.5); beds.hum2.o.frequency.setTargetAtTime(B.hum[0] * 1.012, G.ctx.currentTime, 0.5); }
  setGain(beds.humG, B.hum[1] * (indoor ? 1.4 : 1), 1);
  const crickets = ['res', 'banlieue', 'parc', 'cimetiere', 'ecole'].includes(zone.id) ? night * (1 - rain) * 0.011 : 0;
  setGain(beds.crick, crickets * out, 1.5);

  // musique adaptative + cœur
  const hpR = p.hp / state.stats.maxHp;
  setGain(beds.mLow, 0.05 + 0.02 * night, 1.5);
  setGain(beds.mTen, threat * 0.06, 0.5);
  setGain(beds.mDan, threat * threat * 0.022, 0.5);
  if (G.lp) G.lp.frequency.setTargetAtTime(hpR < 0.3 ? 700 + hpR * 6000 : 22000, G.ctx.currentTime, 0.4);   // son assourdi à PV bas
  if (hpR < 0.4 && !state.dead) {
    beatT -= dt;
    if (beatT <= 0) {
      beatT = 0.45 + hpR * 1.4;
      voice({ f: 60, to: 40, dur: 0.14, vol: 0.2, wet: 0 });
      voice({ f: 55, to: 38, dur: 0.12, vol: 0.14, at: 0.17, wet: 0 });
    }
  }
  if (threat > 0.25) {
    pulseT -= dt;
    if (pulseT <= 0) {
      pulseT = 60 / (72 + threat * 70);
      voice({ f: 70, to: 38, dur: 0.18, vol: 0.09 * threat, wet: 0 });
    }
  }

  // sons d'ambiance ponctuels
  evT -= dt;
  if (evT <= 0) {
    evT = rand(4, 10) * (indoor ? 1.3 : 1);
    ambientEvent();
  }
  if (alarmT > 0) {                                               // alarme de voiture en cours : bips depuis la voiture
    alarmT -= dt;
    const c = state.city;
    const l = c && c.lures[0];
    if (l && Math.floor(alarmT * 6) !== Math.floor((alarmT + dt) * 6)) voice({ type: 'square', f: Math.floor(alarmT * 3) % 2 ? 950 : 720, dur: 0.12, vol: 0.05 * Math.max(0.15, volAt(l.x, l.y, 520)), x: l.x, filter: { f: 3000 }, wet: 0.35 });
  }

  zombieSounds(dt);
  steps(dt);
}

// Coupe les nappes (retour au menu, mort, pause prolongée).
export function silenceSoundscape() {
  if (!G || !beds) return;
  setGain(beds.bus, 0, 0.15);
  if (G.lp) G.lp.frequency.setTargetAtTime(22000, G.ctx.currentTime, 0.1);
  setSpace(0);
}

export function resetSoundscape() {
  soundQueue.length = 0;
  evT = 3;
  stepAcc = 0;
  beatT = 0;
  pulseT = 0;
  threat = 0;
  alarmT = 0;
  lastX = state.player ? state.player.x : 0;
  lastY = state.player ? state.player.y : 0;
}
