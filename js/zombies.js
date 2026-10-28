import { PLAYER, WAVES, ZOMBIES } from './config.js';
import { state } from './state.js';
import { rand } from './util.js';
import { sfx } from './audio.js';
import { maybeDrop } from './pickups.js';
import { addDecal, addShake, spawnBlood } from './effects.js';

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
  state.zombies.push({
    type, x, y,
    r: def.size / 2, size: def.size,
    hp: def.hp, maxHp: def.hp,
    speed: rand(def.speed[0], def.speed[1]) + bonus,
    damage: def.damage, score: def.score,
    hitTimer: 0, dead: false,
    ph: rand(0, 6), fx: 1,   // phase d'animation, sens du regard
  });
}

export function damageZombie(z, dmg, vx, vy) {
  z.hp -= dmg;
  z.hitTimer = 0.08;
  const l = Math.hypot(vx, vy) || 1;
  z.x += (vx / l) * 2.5;      // léger recul
  z.y += (vy / l) * 2.5;
  spawnBlood(z.x, z.y, 3, 50);
  if (z.hp <= 0) killZombie(z);
  else sfx.hit();
}

function killZombie(z) {
  z.dead = true;
  state.score += z.score;
  state.kills++;
  spawnBlood(z.x, z.y, z.type === 'boss' ? 30 : 9, 90);
  addDecal(z.x, z.y + z.r * 0.4, z.r * (z.type === 'boss' ? 1.6 : 1.1));
  sfx.kill();
  maybeDrop(z);
}

export function hurtPlayer(dmg) {
  const p = state.player;
  p.hp = Math.max(0, p.hp - dmg);
  p.hitTimer = PLAYER.hitCooldown;
  state.hurtFlash = 0.25;
  addShake(4);
  spawnBlood(p.x, p.y, 6, 60);
  sfx.hurt();
  if (p.hp <= 0) state.dead = true;
}

export function updateZombies(dt) {
  if (state.zombies.some((z) => z.dead)) state.zombies = state.zombies.filter((z) => !z.dead);
  const zs = state.zombies;
  const p = state.player;

  for (const z of zs) {
    const dx = p.x - z.x;
    const dy = p.y - z.y;
    const dist = Math.hypot(dx, dy) || 1;
    z.x += (dx / dist) * z.speed * dt;
    z.y += (dy / dist) * z.speed * dt;
    if (Math.abs(dx) > 2) z.fx = dx > 0 ? 1 : -1;
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

  for (const z of zs) {
    if (z.hitTimer > 0) z.hitTimer -= dt;
    if (p.hitTimer <= 0 && Math.hypot(p.x - z.x, p.y - z.y) < p.r + z.r) hurtPlayer(z.damage);
  }
}
