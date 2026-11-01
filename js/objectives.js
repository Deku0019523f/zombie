// Objectifs de niveau : générateur à défendre, zone à tenir, survivant à secourir (+ allié qui tire).
// La logique est ici ; le dessin est dans render.js (lit state.gen / zone / surv / ally).
import { OBJ, ALLY } from './config.js';
import { state } from './state.js';
import { freeSpot } from './spots.js';
import { addFloater, addShake, spawnColor, spawnBlood } from './effects.js';
import { sfx } from './audio.js';
import { toast, banner } from './ui.js';
import { t } from './i18n.js';
import { spawnSupply } from './pickups.js';

const near = (a, b, d) => Math.hypot(a.x - b.x, a.y - b.y) < d;

// ---- Générateur (campagne) : les zombies s'y attaquent ; le perdre = défaite. Se répare en restant à côté. ----
export function setupGenerator() {
  const p = state.player;
  const s = freeSpot({ x: p.x, y: p.y, d: 90 });
  const G = OBJ.generator;
  state.gen = { x: s.x, y: s.y, r: G.r, hp: G.hp, max: G.hp, flash: 0 };
  banner(t('genBanner'), 'obj');
}

// Direction et distance vers le générateur, vu d'un zombie.
export function genPull(z) {
  const g = state.gen;
  const dx = g.x - z.x;
  const dy = g.y - z.y;
  const d = Math.hypot(dx, dy) || 1;
  return { ux: dx / d, uy: dy / d, d };
}

export function damageGen(n) {
  const g = state.gen;
  if (!g || g.hp <= 0) return;
  g.hp = Math.max(0, g.hp - n);
  g.flash = 0.15;
  sfx.hit();
  if (g.hp <= 0) {
    spawnColor(g.x, g.y, 24, ['#ff7a1a', '#ffc21a', '#6b6b6b'], 130);
    addShake(8);
    state.dead = true;
    state.deathCause = 'gen';
  }
}

function updateGenerator(dt) {
  const g = state.gen;
  if (!g) return;
  if (g.flash > 0) g.flash -= dt;
  if (g.hp > 0 && g.hp < g.max && near(state.player, g, OBJ.generator.repairReach)) {
    g.hp = Math.min(g.max, g.hp + OBJ.generator.repair * dt);
  }
}

// ---- Zone à tenir : y rester cumulativement `need` secondes ; la vague ne se termine pas avant ----
function startZone() {
  const p = state.player;
  const s = freeSpot({ x: p.x, y: p.y, d: 70 });
  const Z = OBJ.zone;
  state.zone = { x: s.x, y: s.y, r: Z.r, need: Z.need + Z.needPerWave * state.wave, prog: 0, left: Z.timeout, inside: false, trickle: Z.trickleEvery };
  banner(t('zoneBanner'), 'obj');
}

function updateZone(dt) {
  const z = state.zone;
  if (!z) return;
  z.left -= dt;
  z.inside = near(state.player, z, z.r - 4);
  if (z.inside) z.prog += dt;
  if (z.prog >= z.need) {
    const gain = OBJ.zone.rewardScore * state.wave;
    state.score += gain;
    state.coins += 5 * state.stats.coin;
    addFloater(z.x, z.y - 14, `+${gain}`, '#a3e635', 11);
    toast(t('zoneDone', gain), 2200);
    sfx.rescue();
    spawnSupply(1);
    state.zone = null;
  } else if (z.left <= 0) {
    toast(t('zoneLost'), 2000);
    state.zone = null;
  }
}

// ---- Survivant à secourir : rester à côté 2,5 s → il devient un allié qui tire pendant ALLY.dur secondes ----
function startRescue() {
  const p = state.player;
  const s = freeSpot({ x: p.x, y: p.y, d: 80 });
  state.surv = { x: s.x, y: s.y, prog: 0, left: OBJ.rescue.time };
  banner(t('rescueBanner'), 'obj');
}

function updateRescue(dt) {
  const s = state.surv;
  if (!s) return;
  s.left -= dt;
  if (near(state.player, s, OBJ.rescue.reach)) s.prog += dt;
  else s.prog = Math.max(0, s.prog - dt * 0.5);
  if (s.prog >= OBJ.rescue.hold) {
    state.ally = { x: s.x, y: s.y, t: ALLY.dur, cd: 0.5, face: 1, aim: 0 };
    const gain = OBJ.rescue.rewardScore * state.wave;
    state.score += gain;
    state.coins += OBJ.rescue.rewardCoins * state.stats.coin;
    addFloater(s.x, s.y - 18, `+${gain}`, '#a3e635', 11);
    toast(t('rescued'), 2200);
    sfx.rescue();
    state.surv = null;
  } else if (s.left <= 0) {
    toast(t('rescueLost'), 2000);
    state.surv = null;
  }
}

function updateAlly(dt) {
  const a = state.ally;
  if (!a) return;
  a.t -= dt;
  if (a.t <= 0) {
    toast(t('allyGone'), 1800);
    state.ally = null;
    return;
  }
  const p = state.player;
  const tx = p.x - 24;
  const ty = p.y + 8;
  const d = Math.hypot(tx - a.x, ty - a.y);
  if (d > 6) {
    const k = Math.min(1, (d > 60 ? 170 : 90) * dt / d);
    a.x += (tx - a.x) * k;
    a.y += (ty - a.y) * k;
  }
  a.cd -= dt;
  let best = null;
  let bd = ALLY.range * ALLY.range;
  for (const z of state.zombies) {
    if (z.dead) continue;
    const dd = (z.x - a.x) ** 2 + (z.y - a.y) ** 2;
    if (dd < bd) { bd = dd; best = z; }
  }
  if (best) {
    a.face = best.x >= a.x ? 1 : -1;
    a.aim = Math.atan2(best.y - a.y, best.x - a.x);
    if (a.cd <= 0) {
      a.cd = ALLY.rate;
      const life = ALLY.range / ALLY.speed;
      state.bullets.push({
        x: a.x, y: a.y - 2, vx: Math.cos(a.aim) * ALLY.speed, vy: Math.sin(a.aim) * ALLY.speed,
        life, maxLife: life, dmg: ALLY.dmg * state.stats.dmg, pierce: 0, kb: 2, fx: null, tier: 0, big: false, hit: [], dead: false,
      });
      spawnBlood(a.x, a.y, 0);
    }
  }
}

// ---- Cycle : appelé au début / à la fin d'une vague et à chaque frame ----
// Campagne : le niveau choisit l'objectif (obj). Survie : zone toutes les 4 vagues, sauvetage toutes les 3 (hors boss).
export function startWaveObjectives(n, isBossWave) {
  let kind = null;
  if (state.mode === 'campaign' && state.level) {
    const o = state.level.obj;
    if (o === 'generator' && !state.gen) setupGenerator();
    if (!isBossWave && state.waveNo >= 2) {
      if (o === 'zone') kind = 'zone';
      else if (o === 'rescue' && state.waveNo % 2 === 0) kind = 'rescue';
    }
  } else if (n >= 3 && !isBossWave) {
    if (n % 4 === 0) kind = 'zone';
    else if (n % 3 === 0) kind = 'rescue';
  }
  if (kind === 'zone') startZone();
  else if (kind === 'rescue') startRescue();
}

export function endWaveObjectives() {
  if (state.zone) { state.zone = null; }
  state.surv = null;
  if (state.gen && state.gen.hp > 0) state.gen.hp = Math.min(state.gen.max, state.gen.hp + OBJ.generator.waveHeal);
}

export function updateObjectives(dt) {
  updateGenerator(dt);
  updateZone(dt);
  updateRescue(dt);
  updateAlly(dt);
}
