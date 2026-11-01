import { state } from './state.js';
import { INFUSE } from './config.js';
import { sfx } from './audio.js';
import { damageZombie } from './zombies.js';
import { damageBarrel } from './combat.js';
import { hitsSolid } from './layout.js';
import { spawnSpark } from './effects.js';

// Effets des balles infusées : feu (brûlure) ou foudre (éclairs vers les zombies voisins).
function applyFx(b, z) {
  const k = (b.tier || 1) - 1;
  if (b.fx === 'fire') {
    if (z.dead) return;
    z.burnT = INFUSE.fire.burn[k];
    z.burnDps = INFUSE.fire.dps[k];
    z.burnTick = Math.min(z.burnTick, 0.4);
  } else if (b.fx === 'volt') {
    const near = state.zombies
      .filter((o) => o !== z && !o.dead && !b.hit.includes(o) && Math.hypot(o.x - z.x, o.y - z.y) < INFUSE.volt.range)
      .sort((a, c) => Math.hypot(a.x - z.x, a.y - z.y) - Math.hypot(c.x - z.x, c.y - z.y))
      .slice(0, INFUSE.volt.arcs[k]);
    for (const o of near) {
      state.arcs.push({ x0: z.x, y0: z.y, x1: o.x, y1: o.y, t: 0.14 });
      damageZombie(o, INFUSE.volt.dmg[k] * state.stats.dmg, 0, 0, { quiet: true });
    }
    if (near.length) sfx.zap();
  }
}

// Déplacement par sous-pas : une balle rapide ne « traverse » jamais un zombie.
// Les obstacles arrêtent les balles ; les barils explosent ; les balles perforantes traversent des zombies.
export function updateBullets(dt) {
  const { w, h } = state;
  for (const b of state.bullets) {
    const steps = Math.max(1, Math.ceil((Math.hypot(b.vx, b.vy) * dt) / 8));
    const sdt = dt / steps;
    for (let s = 0; s < steps && b.life > 0; s++) {
      b.x += b.vx * sdt;
      b.y += b.vy * sdt;
      b.life -= sdt;

      if (hitsSolid(state.solids, b.x, b.y)) {
        b.life = 0;
        spawnSpark(b.x, b.y);
        break;
      }
      let stopped = false;
      for (const br of state.barrels) {
        if (br.dead) continue;
        if (Math.hypot(br.x - b.x, br.y - b.y) < br.r + 2) {
          damageBarrel(br, 1);
          spawnSpark(b.x, b.y);
          b.life = 0;
          stopped = true;
          break;
        }
      }
      if (stopped) break;

      for (const z of state.zombies) {
        if (z.dead || b.hit.includes(z)) continue;
        const dx = z.x - b.x;
        const dy = z.y - b.y;
        const rr = z.r + 3;
        if (dx * dx + dy * dy < rr * rr) {
          // tir critique : la balle passe près du centre du zombie (« tête »)
          const sp = Math.hypot(b.vx, b.vy) || 1;
          const crit = Math.abs(dx * b.vy - dy * b.vx) / sp < z.r * state.stats.critZone;
          damageZombie(z, crit ? b.dmg * state.stats.critMult : b.dmg, b.vx, b.vy, { crit, kb: b.kb, num: true });
          if (b.fx) applyFx(b, z);
          if (b.pierce > 0) { b.pierce--; b.hit.push(z); }
          else { b.life = 0; break; }
        }
      }
    }
    if (b.life <= 0 || b.x < -10 || b.y < -10 || b.x > w + 10 || b.y > h + 10) b.dead = true;
  }
  if (state.bullets.some((b) => b.dead)) state.bullets = state.bullets.filter((b) => !b.dead);
}
