// Effets visuels purement logiques : particules, taches de sang, tremblement, flash de tir.
import { state } from './state.js';
import { rand } from './util.js';

export function spawnBlood(x, y, n, spd = 70) {
  for (let i = 0; i < n && state.particles.length < 300; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = rand(0.3, 1) * spd;
    state.particles.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: rand(0.25, 0.55), max: 0.55, size: rand(1, 2.6),
    });
  }
}

export function addDecal(x, y, r) {
  if (state.decals.length < 40) state.decals.push({ x, y, r, a: rand(0.35, 0.6) });
}

export function addShake(v) {
  state.shake = Math.max(state.shake, v);
}

export function updateEffects(dt) {
  state.muzzle = Math.max(0, state.muzzle - dt);
  state.shake = Math.max(0, state.shake - dt * 14);
  const f = Math.pow(0.02, dt);
  for (const p of state.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= f;
    p.vy *= f;
    p.life -= dt;
  }
  if (state.particles.some((p) => p.life <= 0)) state.particles = state.particles.filter((p) => p.life > 0);
}
