import { PLAYER } from './config.js';
import { state } from './state.js';
import { getMove, input } from './input.js';
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

export function updatePlayer(dt) {
  const p = state.player;
  const m = getMove();
  p.moving = Math.hypot(m.x, m.y) > 0.05;
  p.x = clamp(p.x + m.x * PLAYER.speed * dt, p.r, state.w - p.r);
  p.y = clamp(p.y + m.y * PLAYER.speed * dt, p.r + 24, state.h - p.r);

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
