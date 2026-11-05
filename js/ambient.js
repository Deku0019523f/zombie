// Ambiance de la ville : cycle jour/nuit, météo (pluie, brouillard, orages), décor vivant (papiers, corbeaux, fumée).
// Logique pure (aucun accès au canvas ni à WebAudio) ; render.js dessine, soundscape.js joue les sons associés.
import { state } from './state.js';
import { CITY } from './config.js';
import { zoneAt, isIndoor } from './citymap.js';
import { rand } from './util.js';
import { emit } from './soundq.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };

// Plancher d'obscurité par zone (même en plein jour) : l'hôpital et le cimetière restent sinistres.
const ZONE_DARK = { hopital: 0.3, cimetiere: 0.14, indus: 0.08, port: 0.04 };

export function initAmbient(c) {
  c.tod = CITY.startTod;
  c.zoneDark = 0;
  c.wx = { kind: 'clear', rain: 0, fog: 0, left: rand(CITY.weatherEvery[0], CITY.weatherEvery[1]) * 0.6, flash: 0, lightT: rand(6, 14), thunderT: 0 };
  c.fx = { papers: [], crows: [], smoke: [], smokeT: 0, spawnT: 0 };
  c.rings = [];
  c.lures = [];
  c.hordes = {};
  // corbeaux perchés sur quelques réverbères
  c.map.lamps.forEach((l, i) => {
    if (i % 9 === 4) c.fx.crows.push({ x: l.x, y: l.y - 22, hx: l.x, hy: l.y - 22, st: 'perch', vx: 0, vy: 0, t: 0, back: 0, ph: rand(0, 6) });
  });
}

// Hauteur du soleil : -1 (minuit) .. 1 (midi).
export const sunHeight = (tod) => -Math.cos(tod * Math.PI * 2);
export const dayNight = () => (state.city ? smooth(0.25, -0.35, sunHeight(state.city.tod)) : 0);   // 0 = jour, 1 = nuit noire

// Obscurité totale appliquée à l'écran (jour/nuit + zone + météo), 0..0.9.
export function darkness() {
  const c = state.city;
  if (!c) return 0;
  const base = Math.max(dayNight(), c.zoneDark || 0);
  return clamp(base + c.wx.rain * 0.12 + c.wx.fog * 0.08, 0, 0.9);
}
// Part de crépuscule (teinte orangée à l'aube / au crépuscule)
export const dusk = () => (state.city ? smooth(0.5, 0.05, Math.abs(sunHeight(state.city.tod) - 0.05)) * (1 - dayNight()) : 0);
export const isNight = () => dayNight() > 0.55;
export const rainAmount = () => (state.city ? state.city.wx.rain : 0);
export const fogAmount = () => (state.city ? state.city.wx.fog : 0);

export function todLabel() {
  const c = state.city;
  if (!c) return '';
  const h = Math.floor(((c.tod + 0.5) % 1) * 24);     // 0 = minuit → 00:00, 0.5 = midi → 12:00
  const m = Math.floor((((c.tod + 0.5) % 1) * 24 - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function nearView(x, y, m = 80) {
  const cam = state.cam;
  return x > cam.x - m && x < cam.x + state.vw + m && y > cam.y - m && y < cam.y + state.vh + m;
}

export function updateAmbient(dt) {
  const c = state.city;
  if (!c || !c.wx) return;
  const p = state.player;
  c.tod = (c.tod + dt / CITY.dayLen) % 1;

  // plancher d'obscurité de la zone (lissé), un peu plus sombre à l'intérieur d'un bâtiment
  const z = zoneAt(p.x, p.y);
  const goal = (ZONE_DARK[z.id] || 0) + (isIndoor(p.x, p.y) ? 0.14 : 0);
  c.zoneDark += (goal - c.zoneDark) * Math.min(1, dt * 1.5);

  // météo
  const w = c.wx;
  w.left -= dt;
  if (w.left <= 0) {
    const r = Math.random();
    w.kind = r < CITY.rainChance ? 'rain' : r < CITY.rainChance + CITY.fogChance ? 'fog' : 'clear';
    w.left = rand(CITY.weatherEvery[0], CITY.weatherEvery[1]);
  }
  const k = Math.min(1, dt * 0.2);
  w.rain += ((w.kind === 'rain' ? 1 : 0) - w.rain) * k;
  w.fog += ((w.kind === 'fog' ? 1 : 0) - w.fog) * k;
  if (w.kind !== 'rain' && w.rain < 0.01) w.rain = 0;
  if (w.kind !== 'fog' && w.fog < 0.01) w.fog = 0;
  w.flash = Math.max(0, w.flash - dt * 2.4);
  if (w.thunderT > 0) {
    w.thunderT -= dt;
    if (w.thunderT <= 0) emit('thunder', p.x, p.y);
  }
  if (w.rain > 0.6) {                      // orage : éclair puis tonnerre retardé
    w.lightT -= dt;
    if (w.lightT <= 0) {
      w.lightT = rand(8, 20);
      w.flash = 1;
      w.thunderT = rand(0.3, 2.2);
    }
  }

  const fx = c.fx;
  // papiers emportés par le vent
  fx.spawnT -= dt;
  if (fx.spawnT <= 0 && fx.papers.length < 9 && w.rain < 0.4) {
    fx.spawnT = rand(1.2, 3);
    const x = state.cam.x - 20;
    const y = state.cam.y + rand(0, state.vh);
    fx.papers.push({ x, y, vx: rand(35, 70), vy: rand(-8, 8), rot: rand(0, 6), ph: rand(0, 6), life: rand(7, 12) });
  }
  for (const q of fx.papers) {
    q.ph += dt * 5;
    q.x += q.vx * dt;
    q.y += (q.vy + Math.sin(q.ph) * 14) * dt;
    q.rot += dt * 3;
    q.life -= dt;
  }
  if (fx.papers.some((q) => q.life <= 0 || q.x > state.cam.x + state.vw + 40)) fx.papers = fx.papers.filter((q) => q.life > 0 && q.x < state.cam.x + state.vw + 40);

  // corbeaux : perchés, ils s'envolent quand on approche et reviennent plus tard
  for (const b of fx.crows) {
    const d = Math.hypot(p.x - b.hx, p.y - b.hy);
    if (b.st === 'perch') {
      if (d < 85) {
        b.st = 'fly';
        b.t = 3.2;
        b.vx = (b.hx - p.x) * 0.9 + rand(-20, 20);
        b.vy = -rand(50, 80);
        emit('crow', b.x, b.y);
        emit('wings', b.x, b.y);
      }
    } else if (b.st === 'fly') {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.t -= dt;
      if (b.t <= 0) { b.st = 'gone'; b.back = rand(40, 80); }
    } else {
      b.back -= dt;
      if (b.back <= 0 && d > 260) { b.st = 'perch'; b.x = b.hx; b.y = b.hy; }
    }
  }

  // fumée : cheminée de l'usine et feux de baril
  fx.smokeT -= dt;
  if (fx.smokeT <= 0) {
    fx.smokeT = 0.42;
    const src = [{ x: 290, y: 44, big: 1 }, ...c.map.fires.map((f) => ({ x: f.x, y: f.y - 10, big: 0 }))];
    for (const s of src) {
      if (fx.smoke.length < 46 && nearView(s.x, s.y, 120)) {
        fx.smoke.push({ x: s.x + rand(-2, 2), y: s.y, vx: rand(8, 20) * (1 + w.rain), vy: -rand(10, 18), r: s.big ? 4 : 2, grow: s.big ? 7 : 4, life: s.big ? 4.5 : 2.4, max: s.big ? 4.5 : 2.4 });
      }
    }
  }
  for (const s of fx.smoke) {
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.r += s.grow * dt;
    s.life -= dt;
  }
  if (fx.smoke.some((s) => s.life <= 0)) fx.smoke = fx.smoke.filter((s) => s.life > 0);
}
