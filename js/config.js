// Constantes d'équilibrage du jeu. Tout le réglage passe par ce fichier.

export const PLAYER = {
  radius: 14,
  speed: 210,        // px/s
  maxHealth: 100,
  hitCooldown: 0.5,  // invulnérabilité après un coup (s)
  healPickup: 25,
};

// unlock = vague à partir de laquelle l'arme est débloquée.
// reserve absent = munitions illimitées (pistolet).
export const WEAPONS = {
  pistol: {
    unlock: 1, mag: 12, reload: 1.0, rate: 0.22, damage: 1,
    pellets: 1, spread: 0.03, speed: 520, life: 1.1, auto: false, sound: 'pistol',
  },
  shotgun: {
    unlock: 3, mag: 6, reload: 1.8, rate: 0.75, damage: 1,
    pellets: 6, spread: 0.3, speed: 480, life: 0.45, auto: false, sound: 'shotgun',
    startReserve: 18, maxReserve: 36, pickup: 8,
  },
  smg: {
    unlock: 5, mag: 30, reload: 1.5, rate: 0.09, damage: 1,
    pellets: 1, spread: 0.1, speed: 580, life: 0.9, auto: true, sound: 'smg',
    startReserve: 60, maxReserve: 150, pickup: 40,
  },
};

export const ZOMBIES = {
  walker: { hp: 1,  speed: [30, 46],  size: 27, score: 10,  damage: 8,  cls: 'walker' },
  runner: { hp: 1,  speed: [75, 100], size: 22, score: 15,  damage: 6,  cls: 'runner' },
  tank:   { hp: 5,  speed: [22, 30],  size: 38, score: 40,  damage: 16, cls: 'tank' },
  boss:   { hp: 40, speed: [38, 46],  size: 64, score: 300, damage: 25, cls: 'boss' },
};

export const WAVES = {
  baseCount: 5,        // zombies de la vague 1 = baseCount + 3 * vague
  perWave: 3,
  intermission: 3,     // pause entre deux vagues (s)
  clearBonus: 50,      // bonus = clearBonus * vague
  bossEvery: 5,        // un boss toutes les 5 vagues
  speedBonusPerWave: 1.5,
  speedBonusCap: 15,   // nombre de vagues max pris en compte pour la vitesse
};

export const DROPS = {
  walker: 0.1, runner: 0.12, tank: 0.5, boss: 1,
  lifetime: 12,        // durée de vie d'un pickup (s)
  ammoShare: 0.55,     // probabilité d'une caisse de munitions (si une arme à réserve est débloquée)
};
