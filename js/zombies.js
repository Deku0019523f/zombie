import { WAVES, ZOMBIES, AI, COMBO } from './config.js';
import { state } from './state.js';
import { rand } from './util.js';
import { sfx } from './audio.js';
import { maybeDrop } from './pickups.js';
import { addDecal, addFloater, addShake, spawnBlood } from './effects.js';
import { explode, fireAcid } from './combat.js';
import { pushOut } from './layout.js';

export function spawnZombie(type) {
  const def = ZOMBIES[type];
  const { w, h } = state;
  const m = def.size / 2 + 6;
  const side = Math.floor(Math.random() * 4);
  let x;
  let y;
  if (side === 0) { x = -m; y = rand(30, h); }
  else if (side === 1) { x = w + m; y = rand(30, h); }
  else if (side === 2) { x = rand(0, w); y = 20 - m; }
  else { x = rand(0, w); y = h + m; }

  const bonus = Math.min(state.wave, WAVES.speedBonusCap) * WAVES.speedBonusPerWave;
  const z = {
    type, x, y,
    r: def.size / 2, size: def.size,
    hp: def.hp, maxHp: def.hp,
    speed: rand(def.speed[0], def.speed[1]) + bonus,
    damage: def.damage, score: def.score,
    hitTimer: 0, dead: false,
    ph: rand(0, 6), fx: 1,            // phase d'animation, sens du regard
    side: Math.random() < 0.5 ? 1 : -1, avoid: 0, entered: false,
  };
  if (type === 'spitter') {
    z.hold = rand(AI.spitter.hold[0], AI.spitter.hold[1]);
    z.shootT = rand(1, 2.2);
    z.charge = false;
  } else if (type === 'charger') {
    z.st = 'walk';                    // walk | tele | dash | recover
    z.chT = rand(AI.charger.cooldown[0], AI.charger.cooldown[1]);
    z.tT = 0; z.dT = 0; z.rT = 0; z.dx = 0; z.dy = 0;
  }
  state.zombies.push(z);
}

export function damageZombie(z, dmg, vx, vy) {
  if (z.dead) return;
  z.hp -= dmg;
  z.hitTimer = 0.08;
  const l = Math.hypot(vx, vy) || 1;
  z.x += (vx / l) * 2.5;      // léger recul
  z.y += (vy / l) * 2.5;
  spawnBlood(z.x, z.y, 3, 50);
  if (z.hp <= 0) killZombie(z);
  else sfx.hit();
}

export const comboMult = () => Math.min(COMBO.max, 1 + Math.floor(state.combo.count / COMBO.step));

// opts.silent : mort sans explosion ni butin (bombe nucléaire)
export function killZombie(z, opts = {}) {
  if (z.dead) return;
  z.dead = true;
  const c = state.combo;
  const mult = comboMult();
  const pts = z.score * mult;
  state.score += pts;
  c.count++;
  c.timer = COMBO.window;
  state.kills++;
  addFloater(z.x, z.y - z.r, `+${pts}`, mult > 1 ? '#fde047' : '#e5e7eb');

  const p = state.player;
  if (state.stats.vamp > 0) p.hp = Math.min(state.stats.maxHp, p.hp + state.stats.vamp);

  spawnBlood(z.x, z.y, z.type === 'boss' ? 30 : 9, 90);
  addDecal(z.x, z.y + z.r * 0.4, z.r * (z.type === 'boss' ? 1.6 : 1.1));
  sfx.kill();
  if (opts.silent) return;
  maybeDrop(z);
  if (z.type === 'exploder') {
    explode(z.x, z.y, AI.exploder.radius, { pDmg: AI.exploder.dmgPlayer, zDmg: AI.exploder.dmgZombie });
  }
}

export function hurtPlayer(dmg) {
  const p = state.player;
  if (state.buffs.shield > 0) {      // bouclier : aucun dégât
    p.hitTimer = 0.25;
    sfx.shield();
    return;
  }
  p.hp = Math.max(0, p.hp - dmg * state.stats.armor);
  p.hitTimer = 0.5;
  state.hurtFlash = 0.25;
  state.combo.count = 0;             // se faire toucher casse le combo
  state.combo.timer = 0;
  addShake(4);
  spawnBlood(p.x, p.y, 6, 60);
  sfx.hurt();
  if (p.hp <= 0) state.dead = true;
}

export function updateZombies(dt) {
  if (state.zombies.some((z) => z.dead)) state.zombies = state.zombies.filter((z) => !z.dead);
  const zs = state.zombies;
  const p = state.player;
  const slow = state.buffs.freeze > 0 ? 0.35 : 1;

  for (const z of zs) {
    const dx = p.x - z.x;
    const dy = p.y - z.y;
    const dist = Math.hypot(dx, dy) || 1;
    const ux = dx / dist;
    const uy = dy / dist;
    if (Math.abs(dx) > 2) z.fx = dx > 0 ? 1 : -1;
    if (!z.entered && z.x > 0 && z.x < state.w && z.y > 20 && z.y < state.h) z.entered = true;

    let mx = 0;
    let my = 0;
    let spd = z.speed * slow;

    if (z.type === 'spitter') {
      const A = AI.spitter;
      if (dist > z.hold) { mx = ux; my = uy; }
      else if (dist < A.retreat && z.entered) { mx = -ux; my = -uy; spd *= 0.7; }
      z.shootT -= dt * slow;
      z.charge = z.shootT < 0.4;
      if (z.shootT <= 0) {
        if (z.entered && dist < 280) fireAcid(z);
        z.shootT = rand(A.shootEvery[0], A.shootEvery[1]);
      }
    } else if (z.type === 'charger') {
      const A = AI.charger;
      if (z.st === 'walk') {
        mx = ux; my = uy;
        z.chT -= dt * slow;
        if (z.chT <= 0 && z.entered && dist < A.triggerDist && dist > 50) {
          z.st = 'tele'; z.tT = A.telegraph; z.dx = ux; z.dy = uy;
          sfx.charge();
        }
      } else if (z.st === 'tele') {
        z.tT -= dt * slow;
        if (z.tT > 0.18) { z.dx = ux; z.dy = uy; }   // la direction se verrouille juste avant la charge
        if (z.tT <= 0) { z.st = 'dash'; z.dT = A.dash; }
      } else if (z.st === 'dash') {
        mx = z.dx; my = z.dy; spd = A.dashSpeed * slow;
        z.dT -= dt * slow;
        if (z.dT <= 0) { z.st = 'recover'; z.rT = A.recover; }
      } else {
        z.rT -= dt * slow;
        if (z.rT <= 0) { z.st = 'walk'; z.chT = rand(A.cooldown[0], A.cooldown[1]); }
      }
    } else {
      mx = ux; my = uy;
    }

    // Contournement des obstacles : après un contact, on longe l'obstacle un moment.
    if (z.avoid > 0 && z.st !== 'dash') {
      z.avoid -= dt;
      const tx = -my * z.side;
      const ty = mx * z.side;
      const bx = mx * 0.35 + tx;
      const by = my * 0.35 + ty;
      const l = Math.hypot(bx, by) || 1;
      mx = bx / l;
      my = by / l;
    }
    z.x += mx * spd * dt;
    z.y += my * spd * dt;
  }

  // Séparation : les zombies ne se superposent pas en une seule tache.
  for (let i = 0; i < zs.length; i++) {
    for (let j = i + 1; j < zs.length; j++) {
      const a = zs[i];
      const b = zs[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const min = (a.r + b.r) * 0.8;
      const d2 = dx * dx + dy * dy;
      if (d2 > 0 && d2 < min * min) {
        const d = Math.sqrt(d2);
        const push = (min - d) * 0.5;
        const nx = dx / d;
        const ny = dy / d;
        a.x -= nx * push; a.y -= ny * push;
        b.x += nx * push; b.y += ny * push;
      }
    }
  }

  // Obstacles + contact avec le joueur
  for (const z of zs) {
    if (z.entered && pushOut(z, state.solids, state.barrels)) {
      z.avoid = 0.6;
      if (z.type === 'charger' && z.st === 'dash') {   // charge stoppée net : la brute est sonnée
        z.st = 'recover';
        z.rT = AI.charger.recover * 1.6;
        addShake(2);
      }
    }
    if (z.hitTimer > 0) z.hitTimer -= dt;
    if (z.dead) continue;
    if (Math.hypot(p.x - z.x, p.y - z.y) < p.r + z.r) {
      if (z.type === 'exploder') killZombie(z);
      else if (p.hitTimer <= 0) hurtPlayer(z.damage);
    }
  }
}
