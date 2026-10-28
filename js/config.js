// Constantes d'équilibrage du jeu. Tout le réglage passe par ce fichier.
// Unités : pixels logiques (l'arène fait 360 px de large, la hauteur s'adapte à l'écran).

export const PLAYER = {
  radius: 10,
  speed: 120,        // px/s
  maxHealth: 100,
  hitCooldown: 0.5,  // invulnérabilité après un coup (s)
  healPickup: 25,
};

// unlock = vague à partir de laquelle l'arme est débloquée.
// startReserve absent = munitions illimitées (pistolet). gunLen = longueur du canon à l'écran.
export const WEAPONS = {
  pistol: {
    unlock: 1, mag: 12, reload: 1.0, rate: 0.22, damage: 1,
    pellets: 1, spread: 0.03, speed: 460, life: 1.0, sound: 'pistol', gunLen: 12,
  },
  shotgun: {
    unlock: 3, mag: 6, reload: 1.8, rate: 0.75, damage: 1,
    pellets: 6, spread: 0.3, speed: 420, life: 0.45, sound: 'shotgun', gunLen: 18,
    startReserve: 18, maxReserve: 36, pickup: 8,
  },
  smg: {
    unlock: 5, mag: 30, reload: 1.5, rate: 0.09, damage: 1,
    pellets: 1, spread: 0.09, speed: 500, life: 0.8, sound: 'smg', gunLen: 15,
    startReserve: 60, maxReserve: 150, pickup: 40,
  },
};

// size = diamètre de collision ; scale = facteur du sprite pixel art (12x16 px de base).
export const ZOMBIES = {
  walker: { hp: 1,  speed: [20, 30], size: 22, score: 10,  damage: 8,  scale: 2 },
  runner: { hp: 1,  speed: [48, 62], size: 20, score: 15,  damage: 6,  scale: 2 },
  tank:   { hp: 5,  speed: [15, 20], size: 32, score: 40,  damage: 16, scale: 3 },
  boss:   { hp: 40, speed: [26, 32], size: 46, score: 300, damage: 25, scale: 4 },
};

export const WAVES = {
  baseCount: 4,        // zombies de la vague n = round(baseCount + perWave * n)
  perWave: 2.5,
  intermission: 3,     // pause entre deux vagues (s)
  clearBonus: 50,      // bonus = clearBonus * vague
  bossEvery: 5,        // un boss toutes les 5 vagues
  speedBonusPerWave: 0.8,
  speedBonusCap: 15,   // nombre de vagues max pris en compte pour la vitesse
};

export const DROPS = {
  walker: 0.1, runner: 0.12, tank: 0.5, boss: 1,
  lifetime: 12,        // durée de vie d'un pickup (s)
  ammoShare: 0.55,     // probabilité d'une caisse de munitions (si une arme à réserve est débloquée)
};

export const LOGICAL_WIDTH = 360;
