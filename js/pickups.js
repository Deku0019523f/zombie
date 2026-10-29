// Caisses de soin / munitions et bonus temporaires (rage, bouclier, gel, bombe nucléaire).
import { DROPS, POWER, WEAPONS } from './config.js';
import { state } from './state.js';
import { sfx } from './audio.js';
import { toast } from './ui.js';
import { t } from './i18n.js';
import { rand } from './util.js';
import { hitsSolid } from './layout.js';
import { nuke } from './combat.js';

export const PICKUP_SIZE = 18;

export function spawnPickup(kind, x, y, life = DROPS.lifetime) {
  state.pickups.push({ x, y, kind, life, dead: false });
}

const hasLimitedAmmo = () => Object.values(state.weapons).some((w) => w.unlocked && w.reserve !== Infinity);

export function maybeDrop(z) {
  if (Math.random() < (DROPS.power[z.type] ?? 0)) {
    const kind = POWER.kinds[Math.floor(Math.random() * POWER.kinds.length)];
    spawnPickup(kind, z.x, z.y, 14);
    return;
  }
  if (Math.random() > (DROPS[z.type] ?? 0.1)) return;
  const kind = hasLimitedAmmo() && Math.random() < DROPS.ammoShare ? 'ammo' : 'health';
  spawnPickup(kind, z.x, z.y);
}

function freeSpot() {
  for (let i = 0; i < 40; i++) {
    const x = rand(30, state.w - 30);
    const y = rand(70, state.h - 130);
    if (!hitsSolid(state.solids, x, y, 18)) return { x, y };
  }
  return { x: state.w / 2, y: state.h / 2 };
}

// Largage : des bonus tombent à des endroits aléatoires de l'arène (thème « LARGAGE »).
export function spawnSupply(n) {
  const kinds = POWER.kinds.filter((k) => k !== 'nuke');
  for (let i = 0; i < n; i++) {
    const s = freeSpot();
    spawnPickup(kinds[Math.floor(Math.random() * kinds.length)], s.x, s.y, 24);
  }
  let s = freeSpot();
  spawnPickup('health', s.x, s.y, 24);
  if (hasLimitedAmmo()) {
    s = freeSpot();
    spawnPickup('ammo', s.x, s.y, 24);
  }
}

function collect(pk) {
  const p = state.player;
  const k = pk.kind;
  if (k === 'health') {
    p.hp = Math.min(state.stats.maxHp, p.hp + 25);
    toast(t('healthPickup') + 25, 1200);
    sfx.pickup();
  } else if (k === 'ammo') {
    for (const [id, d] of Object.entries(WEAPONS)) {
      const w = state.weapons[id];
      if (w.unlocked && w.reserve !== Infinity) {
        w.reserve = Math.min(Math.round(d.maxReserve * state.stats.ammo), w.reserve + d.pickup);
      }
    }
    toast(t('ammoPickup'), 1200);
    sfx.pickup();
  } else {
    if (k === 'nuke') nuke();
    else state.buffs[k] = POWER[k].dur;
    toast(t(`power_${k}`), 1800);
    if (k !== 'nuke') sfx.power();
  }
}

export function updatePickups(dt) {
  const p = state.player;
  const magnet = state.stats.magnet * 55;
  for (const pk of state.pickups) {
    pk.life -= dt;
    if (pk.life <= 0) { pk.dead = true; continue; }
    const d = Math.hypot(p.x - pk.x, p.y - pk.y);
    if (magnet > 0 && d < magnet && d > 1) {   // aimant : les caisses viennent vers le joueur
      pk.x += ((p.x - pk.x) / d) * 150 * dt;
      pk.y += ((p.y - pk.y) / d) * 150 * dt;
    }
    if (d < p.r + PICKUP_SIZE / 2 + 4) {
      collect(pk);
      pk.dead = true;
    }
  }
  if (state.pickups.some((pk) => pk.dead)) state.pickups = state.pickups.filter((pk) => !pk.dead);
}
