// Effets visuels purement logiques : particules, taches, texte flottant, tremblement, flashs.
import { state } from './state.js';
import { rand } from './util.js';

const BLOOD = ['#b01818', '#8b1010'];

function burst(x, y, n, spd, cols, life = 1, size = 1) {
  for (let i = 0; i < n && state.particles.length < 400; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = rand(0.3, 1) * spd;
    const l = rand(0.25, 0.55) * life;
    state.particles.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: l, max: l, size: rand(1, 2.6) * size,
      col: cols[Math.floor(Math.random() * cols.length)],
    });
  }
}

export const spawnBlood = (x, y, n, spd = 70, cols = BLOOD) => burst(x, y, n, spd, cols);
export const spawnFire = (x, y, n) => burst(x, y, n, 150, ['#ff7a1a', '#ffc21a', '#fff0a0', '#6b6b6b'], 1.6, 1.6);
export const spawnSpark = (x, y) => burst(x, y, 3, 60, ['#ffe9a0', '#ffffff'], 0.6);

// Tache persistante au sol. col = "r,g,b".
export function addDecal(x, y, r, col = '110,12,12') {
  if (state.decals.length < 40) state.decals.push({ x, y, r, a: rand(0.35, 0.6), col });
}

export function addFloater(x, y, text, color = '#fff') {
  if (state.floaters.length < 24) state.floaters.push({ x, y, text, color, life: 0.9, max: 0.9 });
}

export function addShake(v) {
  state.shake = Math.max(state.shake, v);
}

export function updateEffects(dt) {
  state.muzzle = Math.max(0, state.muzzle - dt);
  state.shake = Math.max(0, state.shake - dt * 14);
  state.flash = Math.max(0, state.flash - dt * 1.6);
  state.darkAmt += ((state.dark ? 1 : 0) - state.darkAmt) * Math.min(1, dt * 2.5);

  const f = Math.pow(0.02, dt);
  for (const p of state.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= f;
    p.vy *= f;
    p.life -= dt;
  }
  if (state.particles.some((p) => p.life <= 0)) state.particles = state.particles.filter((p) => p.life > 0);

  for (const b of state.blasts) b.t += dt;
  if (state.blasts.some((b) => b.t > 0.4)) state.blasts = state.blasts.filter((b) => b.t <= 0.4);

  for (const fl of state.floaters) {
    fl.y -= 18 * dt;
    fl.life -= dt;
  }
  if (state.floaters.some((fl) => fl.life <= 0)) state.floaters = state.floaters.filter((fl) => fl.life > 0);
}
