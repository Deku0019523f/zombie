// Caisses de soin et de munitions lâchées par les zombies.
import { DROPS, PLAYER, WEAPONS } from './config.js';
import { state } from './state.js';
import { makeEl, place } from './dom.js';
import { sfx } from './audio.js';
import { toast } from './ui.js';
import { t } from './i18n.js';

const SIZE = 24;

export function maybeDrop(z) {
  if (Math.random() > (DROPS[z.type] ?? 0.1)) return;
  const hasLimited = Object.values(state.weapons).some((w) => w.unlocked && w.reserve !== Infinity);
  const kind = hasLimited && Math.random() < DROPS.ammoShare ? 'ammo' : 'health';
  state.pickups.push({
    x: z.x, y: z.y, kind, life: DROPS.lifetime, dead: false,
    el: makeEl(`entity pickup ${kind}`, undefined, kind === 'ammo' ? '📦' : '❤️'),
  });
}

function collect(pk) {
  const p = state.player;
  if (pk.kind === 'health') {
    p.hp = Math.min(PLAYER.maxHealth, p.hp + PLAYER.healPickup);
    toast(t('healthPickup') + PLAYER.healPickup, 1200);
  } else {
    for (const [id, d] of Object.entries(WEAPONS)) {
      const w = state.weapons[id];
      if (w.unlocked && w.reserve !== Infinity) w.reserve = Math.min(d.maxReserve, w.reserve + d.pickup);
    }
    toast(t('ammoPickup'), 1200);
  }
  sfx.pickup();
}

export function updatePickups(dt) {
  const p = state.player;
  for (const pk of state.pickups) {
    pk.life -= dt;
    if (pk.life <= 0) { pk.dead = true; pk.el.remove(); continue; }
    if (Math.hypot(p.x - pk.x, p.y - pk.y) < p.r + SIZE / 2) {
      collect(pk);
      pk.dead = true;
      pk.el.remove();
      continue;
    }
    pk.el.classList.toggle('blink', pk.life < 3 && Math.floor(pk.life * 4) % 2 === 0);
    place(pk.el, pk.x, pk.y, SIZE);
  }
  state.pickups = state.pickups.filter((pk) => !pk.dead);
}
