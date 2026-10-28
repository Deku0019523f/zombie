import { state } from './state.js';
import { damageZombie } from './zombies.js';

// Déplacement par sous-pas : une balle rapide ne « traverse » jamais un zombie.
export function updateBullets(dt) {
  const { w, h } = state;
  for (const b of state.bullets) {
    const steps = Math.max(1, Math.ceil((Math.hypot(b.vx, b.vy) * dt) / 8));
    const sdt = dt / steps;
    for (let s = 0; s < steps && b.life > 0; s++) {
      b.x += b.vx * sdt;
      b.y += b.vy * sdt;
      b.life -= sdt;
      for (const z of state.zombies) {
        if (z.dead) continue;
        const dx = z.x - b.x;
        const dy = z.y - b.y;
        const rr = z.r + 3;
        if (dx * dx + dy * dy < rr * rr) {
          damageZombie(z, b.dmg, b.vx, b.vy);
          b.life = 0;
          break;
        }
      }
    }
    if (b.life <= 0 || b.x < -10 || b.y < -10 || b.x > w + 10 || b.y > h + 10) b.dead = true;
  }
  if (state.bullets.some((b) => b.dead)) state.bullets = state.bullets.filter((b) => !b.dead);
}
