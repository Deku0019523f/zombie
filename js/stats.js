// Calcule les statistiques du joueur à partir des améliorations choisies (niveau par amélioration).
import { PLAYER } from './config.js';

export function computeStats(perks) {
  const L = (id) => perks[id] || 0;
  return {
    dmg: 1 + 0.25 * L('dmg'),                    // multiplicateur de dégâts
    rate: Math.pow(0.88, L('rate')),             // multiplicateur de délai entre deux tirs
    speed: 1 + 0.08 * L('speed'),                // multiplicateur de vitesse
    maxHp: PLAYER.maxHealth + 20 * L('hp'),
    reload: Math.pow(0.78, L('reload')),         // multiplicateur de durée de rechargement
    pierce: L('pierce'),                         // zombies traversés en plus
    vamp: 0.5 * L('vamp'),                       // PV rendus par kill
    magnet: L('magnet'),                         // rayon d'attraction = 55 px par niveau
    ammo: 1 + 0.5 * L('ammo'),                   // multiplicateur de réserve max
    armor: 1 - 0.15 * L('armor'),                // multiplicateur de dégâts subis
    grenadeCd: Math.pow(0.75, L('grenade')),     // multiplicateur de recharge de la grenade
    range: 1 + 0.2 * L('range'),                 // multiplicateur de portée des balles
    blast: 1 + 0.12 * L('grenade'),              // multiplicateur du rayon d'explosion
  };
}
