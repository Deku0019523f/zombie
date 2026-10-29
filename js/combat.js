// Combat « spécial » : explosions, barils, grenade, acide des cracheurs, bombe nucléaire.
import { state } from './state.js';
import { AI, GRENADE } from './config.js';
import { damageZombie, killZombie, hurtPlayer } from './zombies.js';
import { addDecal, addShake, spawnBlood, spawnFire } from './effects.js';
import { hitsSolid } from './layout.js';
import { sfx } from './audio.js';

// Explosion circulaire : blesse les zombies, éventuellement le joueur, et enchaîne sur les barils.
export function explode(x, y, radius, o = {}) {
  const zDmg = o.zDmg ?? 6;
  const pDmg = o.pDmg ?? 0;
  state.blasts.push({ x, y, r: radius, t: 0 });
  addShake(o.shake ?? 7);
  addDecal(x, y, radius * 0.55, '25,22,20');
  spawnFire(x, y, 18);
  sfx.boom();

  for (const z of state.zombies) {
    if (z.dead) continue;
    if (Math.hypot(z.x - x, z.y - y) < radius + z.r * 0.5) damageZombie(z, zDmg, z.x - x, z.y - y);
  }
  const p = state.player;
  if (pDmg > 0 && p.hitTimer <= 0 && Math.hypot(p.x - x, p.y - y) < radius + p.r * 0.5) hurtPlayer(pDmg);
  for (const b of state.barrels) {
    if (!b.dead && Math.hypot(b.x - x, b.y - y) < radius + b.r) damageBarrel(b, 3);
  }
}

export function damageBarrel(b, n) {
  if (b.dead) return;
  b.hp -= n;
  b.flash = 0.1;
  if (b.hp <= 0) {
    b.dead = true;
    explode(b.x, b.y, AI.barrel.radius, { pDmg: AI.barrel.dmgPlayer, zDmg: AI.barrel.dmgZombie });
  }
}

// ---- Grenade (bouton 💣 / touche G) : vise le groupe de zombies le plus dense à portée ----
export function throwGrenade() {
  if (state.phase !== 'playing' || state.grenadeCd > 0) return false;
  const p = state.player;
  let best = null;
  let bestScore = -Infinity;
  for (const z of state.zombies) {
    if (z.dead) continue;
    const d = Math.hypot(z.x - p.x, z.y - p.y);
    if (d > GRENADE.range) continue;
    let near = 0;
    for (const o of state.zombies) {
      if (!o.dead && Math.hypot(o.x - z.x, o.y - z.y) < GRENADE.radius * 0.9) near++;
    }
    const s = near * 1000 - d;
    if (s > bestScore) { bestScore = s; best = z; }
  }
  let tx;
  let ty;
  if (best) { tx = best.x; ty = best.y; }
  else { tx = p.x + Math.cos(p.angle) * 110; ty = p.y + Math.sin(p.angle) * 110; }
  tx = Math.max(10, Math.min(state.w - 10, tx));
  ty = Math.max(30, Math.min(state.h - 10, ty));
  state.grenades.push({ x0: p.x, y0: p.y, x1: tx, y1: ty, t: 0, dur: GRENADE.flight, done: false });
  state.grenadeMax = GRENADE.cooldown * state.stats.grenadeCd;
  state.grenadeCd = state.grenadeMax;
  sfx.throw();
  return true;
}

export function updateGrenades(dt) {
  for (const g of state.grenades) {
    g.t += dt;
    if (g.t >= g.dur) {
      g.done = true;
      explode(g.x1, g.y1, GRENADE.radius * state.stats.blast, { zDmg: GRENADE.damage, pDmg: 0, shake: 6 });
    }
  }
  if (state.grenades.some((g) => g.done)) state.grenades = state.grenades.filter((g) => !g.done);
}

// ---- Acide des cracheurs ----
export function fireAcid(z) {
  const p = state.player;
  const a = Math.atan2(p.y - z.y, p.x - z.x);
  const A = AI.spitter;
  state.acid.push({
    x: z.x, y: z.y, vx: Math.cos(a) * A.acidSpeed, vy: Math.sin(a) * A.acidSpeed,
    life: A.acidLife, dead: false,
  });
  sfx.spit();
}

export function updateAcid(dt) {
  const p = state.player;
  for (const a of state.acid) {
    a.x += a.vx * dt;
    a.y += a.vy * dt;
    a.life -= dt;
    if (a.life <= 0 || a.x < -10 || a.x > state.w + 10 || a.y < -10 || a.y > state.h + 10) { a.dead = true; continue; }
    if (hitsSolid(state.solids, a.x, a.y)) {
      a.dead = true;
      spawnBlood(a.x, a.y, 3, 40, ['#9be02a', '#c6f135']);
      continue;
    }
    if (Math.hypot(p.x - a.x, p.y - a.y) < p.r + 4) {
      a.dead = true;
      spawnBlood(a.x, a.y, 6, 50, ['#9be02a', '#c6f135']);
      if (p.hitTimer <= 0) hurtPlayer(AI.spitter.acidDmg);
    }
  }
  if (state.acid.some((a) => a.dead)) state.acid = state.acid.filter((a) => !a.dead);
}

// ---- Bonus « nucléaire » : tue tout sauf le boss (qui perd 10 PV) ----
export function nuke() {
  state.flash = 0.9;
  addShake(10);
  sfx.nuke();
  for (const z of state.zombies) {
    if (z.dead) continue;
    if (z.type === 'boss') damageZombie(z, 10, 0, 0);
    else killZombie(z, { silent: true });
  }
}
