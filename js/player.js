import { PLAYER, DASH } from './config.js';
import { sfx } from './audio.js';
import { damageZombie } from './zombies.js';
import { addShake, spawnColor } from './effects.js';
import { state } from './state.js';
import { getMove, input } from './input.js';
import { pushOut } from './layout.js';
import { clamp } from './util.js';

function nearestZombie(p, maxDist) {
  let best = null;
  let bd = maxDist * maxDist;
  for (const z of state.zombies) {
    if (z.dead) continue;
    const dx = z.x - p.x;
    const dy = z.y - p.y;
    const d = dx * dx + dy * dy;
    if (d < bd) { bd = d; best = z; }
  }
  return best;
}

// Esquive : élan rapide dans la direction du déplacement (sinon à l'opposé du zombie le plus proche), invulnérable un court instant.
export function startDash() {
  const d = state.dash;
  if (state.phase !== 'playing' || d.cd > 0 || d.t > 0) return false;
  const p = state.player;
  const m = getMove();
  let dx = m.x;
  let dy = m.y;
  if (Math.hypot(dx, dy) < 0.1) {
    const z = nearestZombie(p, 200);
    if (z) { dx = p.x - z.x; dy = p.y - z.y; }
    else { dx = Math.cos(p.angle); dy = Math.sin(p.angle); }
  }
  const l = Math.hypot(dx, dy) || 1;
  d.dx = dx / l;
  d.dy = dy / l;
  d.t = DASH.dur;
  d.id++;
  d.cd = state.stats.dashCd;
  d.max = d.cd;
  p.hitTimer = Math.max(p.hitTimer, DASH.invuln + (state.stats.syn.ghost ? 0.2 : 0));
  sfx.dash();
  spawnColor(p.x, p.y + 8, 6, ['#cbd5e1', '#94a3b8'], 50);
  return true;
}

function updateDash(dt) {
  const p = state.player;
  const d = state.dash;
  d.t -= dt;
  p.x += d.dx * DASH.speed * dt;
  p.y += d.dy * DASH.speed * dt;
  d.trail.push({ x: p.x, y: p.y, a: 0.5 });
  if (state.stats.syn.ghost) {           // synergie : l'esquive blesse et repousse les zombies traversés
    for (const z of state.zombies) {
      if (z.dead || z.dashHit === d.id) continue;
      if (Math.hypot(z.x - p.x, z.y - p.y) < z.r + p.r + DASH.ghostReach) {
        z.dashHit = d.id;
        damageZombie(z, DASH.ghostDmg * state.stats.dmg, d.dx, d.dy, { kb: 14, num: true });
        addShake(2);
      }
    }
  }
}

export function updatePlayer(dt) {
  const p = state.player;
  const m = getMove();
  const speed = PLAYER.speed * state.stats.speed;
  const dashing = state.dash.t > 0;
  p.moving = dashing || Math.hypot(m.x, m.y) > 0.05;
  if (dashing) updateDash(dt);
  else {
    p.x = clamp(p.x + m.x * speed * dt, p.r, state.w - p.r);
    p.y = clamp(p.y + m.y * speed * dt, p.r + 24, state.h - p.r);
  }
  for (const q of state.dash.trail) q.a -= dt * 3.2;
  if (state.dash.trail.length && state.dash.trail[0].a <= 0) state.dash.trail = state.dash.trail.filter((q) => q.a > 0);
  pushOut(p, state.solids, state.barrels);     // les obstacles bloquent le joueur
  p.x = clamp(p.x, p.r, state.w - p.r);
  p.y = clamp(p.y, p.r + 24, state.h - p.r);

  if (input.aimSource === 'mouse') {
    p.angle = Math.atan2(input.mouse.y - p.y, input.mouse.x - p.x);
  } else {
    const z = nearestZombie(p, 420);
    if (z) p.angle = Math.atan2(z.y - p.y, z.x - p.x);
    else if (p.moving) p.angle = Math.atan2(m.y, m.x);
  }

  p.hitTimer = Math.max(0, p.hitTimer - dt);
}

// Appelé quand la taille de l'arène change : garde le joueur à l'intérieur.
export function clampPlayer() {
  const p = state.player;
  if (!p) return;
  p.x = clamp(p.x, p.r, state.w - p.r);
  p.y = clamp(p.y, p.r + 24, state.h - p.r);
}
