// Calcule les statistiques du joueur à partir des améliorations choisies (niveau par amélioration)
// et des améliorations permanentes de l'atelier (méta-progression).
import { PLAYER, CRIT, DASH, SYNERGIES } from './config.js';

let META = {};                                   // niveaux de l'atelier (défini au démarrage / après un achat)
export const setMeta = (m) => { META = m || {}; };

// Synergies actives pour un ensemble d'améliorations : { sniper: true, ... }
export function activeSynergies(perks) {
  const out = {};
  for (const [id, s] of Object.entries(SYNERGIES)) out[id] = s.needs.every((n) => (perks[n] || 0) >= 1);
  return out;
}

export function computeStats(perks) {
  const L = (id) => perks[id] || 0;
  const M = (id) => META[id] || 0;
  const syn = activeSynergies(perks);
  const maxHp = (PLAYER.maxHealth + 20 * L('hp') + 10 * M('vigor') - 20 * L('pact')) * (1 - 0.3 * L('glass'));
  return {
    dmg: 1 + 0.25 * L('dmg') + 0.04 * M('power') + 0.5 * L('glass'),   // multiplicateur de dégâts
    rate: Math.pow(0.88, L('rate')) * Math.pow(0.8, L('berserk')),     // multiplicateur de délai entre deux tirs
    speed: 1 + 0.08 * L('speed'),                // multiplicateur de vitesse
    maxHp: Math.max(30, Math.round(maxHp)),
    reload: Math.pow(0.78, L('reload')),         // multiplicateur de durée de rechargement
    pierce: L('pierce'),                         // zombies traversés en plus
    vamp: 0.5 * L('vamp') + 1.5 * L('pact'),     // PV rendus par kill
    magnet: L('magnet'),                         // rayon d'attraction = 55 px par niveau
    ammo: 1 + 0.5 * L('ammo'),                   // multiplicateur de réserve max
    armor: (1 - 0.15 * L('armor')) * (1 + 0.25 * L('berserk')),   // multiplicateur de dégâts subis
    grenadeCd: Math.pow(0.75, L('grenade')),     // multiplicateur de recharge de la grenade
    range: 1 + 0.2 * L('range'),                 // multiplicateur de portée des balles
    blast: 1 + 0.12 * L('grenade'),              // multiplicateur du rayon d'explosion
    critZone: syn.sniper ? CRIT.sniperZone : CRIT.zone,                          // fraction du rayon qui compte comme « tête »
    critMult: CRIT.mult + CRIT.perk * L('crit') + (syn.sniper ? CRIT.sniper : 0), // multiplicateur des critiques
    dashCd: DASH.cooldown * Math.pow(0.85, L('dash')) * Math.pow(0.9, M('agility')) * (syn.ghost ? 0.7 : 1),
    coin: 1 + 0.15 * M('purse'),                 // multiplicateur de pièces
    regen: syn.fortress ? 0.5 : 0,               // PV/s hors combat
    syn,
  };
}
