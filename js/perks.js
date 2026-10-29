// Améliorations choisies après chaque vague (style « roguelite »).
import { PERKS, WEAPONS } from './config.js';
import { state } from './state.js';
import { computeStats } from './stats.js';

// Tire `n` améliorations différentes, parmi celles qui ne sont pas au niveau maximum.
export function rollChoices(n = 3) {
  const ids = Object.keys(PERKS).filter((id) => (state.perks[id] || 0) < PERKS[id].max);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids.slice(0, n);
}

export function applyPerk(id) {
  if (!PERKS[id]) return;
  state.perks[id] = (state.perks[id] || 0) + 1;
  state.stats = computeStats(state.perks);
  const p = state.player;
  if (id === 'hp') p.hp = Math.min(state.stats.maxHp, p.hp + 20);
  if (id === 'ammo') {
    for (const [wid, d] of Object.entries(WEAPONS)) {
      const w = state.weapons[wid];
      if (w.unlocked && w.reserve !== Infinity) {
        w.reserve = Math.min(Math.round(d.maxReserve * state.stats.ammo), w.reserve + Math.round(d.pickup));
      }
    }
  }
}
