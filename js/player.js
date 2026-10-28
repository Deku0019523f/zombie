import { PLAYER } from './config.js';
import { state } from './state.js';
import { getMove, getAim } from './input.js';
import { playerEl, place } from './dom.js';
import { clamp } from './util.js';

export function updatePlayer(dt) {
  const p = state.player;
  const m = getMove();
  p.x = clamp(p.x + m.x * PLAYER.speed * dt, p.r, state.w - p.r);
  p.y = clamp(p.y + m.y * PLAYER.speed * dt, p.r, state.h - p.r);

  const a = getAim();
  p.angle = Math.atan2(a.y - p.y, a.x - p.x);

  p.hitTimer = Math.max(0, p.hitTimer - dt);
  playerEl.classList.toggle('invuln', p.hitTimer > 0);
  place(playerEl, p.x, p.y, p.r * 2, p.angle);
}

// Appelé quand la taille de l'arène change : garde le joueur à l'intérieur.
export function clampPlayer() {
  const p = state.player;
  if (!p) return;
  p.x = clamp(p.x, p.r, state.w - p.r);
  p.y = clamp(p.y, p.r, state.h - p.r);
}
