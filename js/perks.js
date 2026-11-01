// Améliorations choisies après chaque vague (style « roguelite »), synergies et améliorations risquées.
import { PERKS, WEAPONS, SYNERGIES } from './config.js';
import { state } from './state.js';
import { computeStats } from './stats.js';

// Synergie que `id` terminerait (toutes les autres conditions déjà remplies), ou null.
export function synergyFor(id) {
  for (const [sid, s] of Object.entries(SYNERGIES)) {
    if (state.stats.syn[sid] || !s.needs.includes(id)) continue;
    if (s.needs.every((n) => n === id || (state.perks[n] || 0) >= 1)) return sid;
  }
  return null;
}

// Tire `n` améliorations différentes, parmi celles qui ne sont pas au niveau maximum.
// Celles qui complètent une synergie sont 3 fois plus probables. safe = sans améliorations risquées (équipement offert).
export function rollChoices(n = 3, { safe = false } = {}) {
  const pool = Object.keys(PERKS)
    .filter((id) => (state.perks[id] || 0) < PERKS[id].max && !(safe && PERKS[id].risk))
    .map((id) => ({ id, w: synergyFor(id) ? 3 : PERKS[id].risk ? 0.7 : 1 }));
  const out = [];
  while (out.length < n && pool.length) {
    let r = Math.random() * pool.reduce((a, e) => a + e.w, 0);
    let k = 0;
    for (; k < pool.length - 1; k++) {
      r -= pool[k].w;
      if (r <= 0) break;
    }
    out.push(pool[k].id);
    pool.splice(k, 1);
  }
  return out;
}

// Applique une amélioration. Renvoie la liste des synergies qu'elle vient d'activer.
export function applyPerk(id) {
  if (!PERKS[id]) return [];
  const before = state.stats.syn || {};
  state.perks[id] = (state.perks[id] || 0) + 1;
  state.stats = computeStats(state.perks);
  const p = state.player;
  if (id === 'hp') p.hp = Math.min(state.stats.maxHp, p.hp + 20);
  p.hp = Math.min(p.hp, state.stats.maxHp);          // un malus de PV max réduit aussi les PV actuels
  if (id === 'ammo') {
    for (const [wid, d] of Object.entries(WEAPONS)) {
      const w = state.weapons[wid];
      if (w.unlocked && w.reserve !== Infinity) {
        w.reserve = Math.min(Math.round(d.maxReserve * state.stats.ammo), w.reserve + Math.round(d.pickup));
      }
    }
  }
  return Object.keys(state.stats.syn).filter((s) => state.stats.syn[s] && !before[s]);
}
