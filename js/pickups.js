// Caisses de soin / munitions et bonus temporaires (rage, bouclier, gel, bombe nucléaire).
import { DROPS, POWER, WEAPONS, ELITE, INFUSE } from './config.js';
import { state } from './state.js';
import { sfx } from './audio.js';
import { toast } from './ui.js';
import { t } from './i18n.js';
import { freeSpot } from './spots.js';
import { nuke } from './combat.js';

export const PICKUP_SIZE = 18;

export function spawnPickup(kind, x, y, life = DROPS.lifetime, tier = 0) {
  state.pickups.push({ x, y, kind, life, dead: false, tier });
}

// Munitions infusées (feu ou foudre). tier : 1 = commun, 2 = rare, 3 = épique.
export function spawnInfuse(x, y, tier = 1, life = 16, kind = null) {
  spawnPickup(kind || (Math.random() < 0.5 ? 'fire' : 'volt'), x, y, life, tier);
}

const hasLimitedAmmo = () => Object.values(state.weapons).some((w) => w.unlocked && w.reserve !== Infinity);

export function maybeDrop(z) {
  if (z.type === 'boss') spawnInfuse(z.x + 16, z.y, 3, 20);
  else if (z.elite && Math.random() < ELITE.powerDrop) { spawnInfuse(z.x, z.y, Math.random() < 0.3 ? 3 : 2); return; }
  else if ((z.type === 'tank' || z.type === 'charger') && Math.random() < 0.08) { spawnInfuse(z.x, z.y, 1); return; }
  if (Math.random() < (DROPS.power[z.type] ?? 0)) {
    const kind = POWER.kinds[Math.floor(Math.random() * POWER.kinds.length)];
    spawnPickup(kind, z.x, z.y, 14);
    return;
  }
  if (Math.random() > (DROPS[z.type] ?? 0.1)) return;
  const kind = hasLimitedAmmo() && Math.random() < DROPS.ammoShare ? 'ammo' : 'health';
  spawnPickup(kind, z.x, z.y);
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
  } else if (k === 'fire' || k === 'volt') {
    const tier = pk.tier || 1;
    state.ammoFx = { kind: k, tier, t: INFUSE.dur[tier - 1] };
    toast(t(`fx_${k}`, t(`rar_${INFUSE.rarity[tier - 1]}`)), 2000);
    sfx.power();
  } else if (k === 'drop') {                       // caisse larguee : un peu de tout
    collect({ kind: 'health' });
    if (hasLimitedAmmo()) collect({ kind: 'ammo' });
    const pw = POWER.kinds.filter((x) => x !== 'nuke');
    collect({ kind: pw[Math.floor(Math.random() * pw.length)] });
    if (Math.random() < 0.6) collect({ kind: Math.random() < 0.5 ? 'fire' : 'volt', tier: 2 });
    toast(t('dropToast'), 2000);
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
