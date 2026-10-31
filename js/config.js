// Constantes d'équilibrage du jeu. Tout le réglage passe par ce fichier.
// Unités : pixels logiques (l'arène fait 360 px de large, la hauteur s'adapte à l'écran).

export const PLAYER = {
  radius: 10,
  speed: 120,        // px/s
  maxHealth: 100,
  hitCooldown: 0.5,  // invulnérabilité après un coup (s)
  healPickup: 25,
};

// range = portée en pixels logiques (la balle disparaît au-delà) ; modes = modes de tir proposés, mode = mode par défaut.
// unlock = vague à partir de laquelle l'arme est débloquée.
// startReserve absent = munitions illimitées (pistolet). gunLen = longueur du canon à l'écran.
export const WEAPONS = {
  pistol: {
    unlock: 1, mag: 12, reload: 1.0, rate: 0.22, damage: 1,
    pellets: 1, spread: 0.03, speed: 460, range: 170, sound: 'pistol', gunLen: 12,
    modes: ['semi', 'auto', 'burst', 'charge'], mode: 'semi',
  },
  shotgun: {
    unlock: 3, mag: 6, reload: 1.8, rate: 0.75, damage: 1,
    pellets: 6, spread: 0.3, speed: 420, range: 105, sound: 'shotgun', gunLen: 18,
    modes: ['semi', 'auto', 'charge'], mode: 'semi',
    startReserve: 18, maxReserve: 36, pickup: 8,
  },
  smg: {
    unlock: 5, mag: 30, reload: 1.5, rate: 0.09, damage: 1,
    pellets: 1, spread: 0.09, speed: 500, range: 150, sound: 'smg', gunLen: 15,
    modes: ['auto', 'burst', 'semi'], mode: 'auto',
    startReserve: 60, maxReserve: 150, pickup: 40,
  },
};

// Modes de tir. dmg = multiplicateur de dégâts, spread = multiplicateur de dispersion.
//  semi  : un tir par appui, plus précis · auto : maintenir = tirer · burst : rafale de `count` balles puis pause
//  charge : maintenir pour charger, relâcher pour tirer (dégâts, portée et perforation augmentent avec la charge)
export const FIRE_MODES = {
  semi:   { dmg: 1.2, spread: 0.5, rate: 1 },
  auto:   { dmg: 1, spread: 1, rate: 1 },
  burst:  { dmg: 1, spread: 0.6, rate: 1, count: 3, gap: 0.06, pause: 2.6 },
  charge: { dmg: 1, spread: 0.6, rate: 1.4, time: 0.85, min: 0.18, dmgMax: 3.2, rangeMax: 1.55, pierceMax: 2, tight: 0.55 },
};

// size = diamètre de collision ; scale = facteur du sprite pixel art (12x16 px de base).
export const ZOMBIES = {
  walker:   { hp: 1,  speed: [20, 30], size: 22, score: 10,  damage: 8,  scale: 2 },
  runner:   { hp: 1,  speed: [48, 62], size: 20, score: 15,  damage: 6,  scale: 2 },
  tank:     { hp: 5,  speed: [15, 20], size: 32, score: 40,  damage: 16, scale: 3 },
  // Cracheur : garde ses distances et lance de l'acide
  spitter:  { hp: 2,  speed: [24, 30], size: 22, score: 25,  damage: 6,  scale: 2 },
  // Explosif : fonce sur le joueur et explose (à sa mort ou au contact)
  exploder: { hp: 2,  speed: [38, 48], size: 24, score: 20,  damage: 0,  scale: 2 },
  // Brute : s'arrête, se prépare, puis charge en ligne droite
  charger:  { hp: 4,  speed: [24, 28], size: 30, score: 45,  damage: 14, scale: 3 },
  boss:     { hp: 40, speed: [26, 32], size: 46, score: 300, damage: 25, scale: 4 },
};

// Comportements spéciaux
export const AI = {
  spitter: { hold: [100, 150], retreat: 80, shootEvery: [2.0, 3.2], acidSpeed: 95, acidDmg: 10, acidLife: 3 },
  exploder: { radius: 46, dmgPlayer: 22, dmgZombie: 3 },
  charger: { triggerDist: 230, telegraph: 0.65, dash: 0.7, dashSpeed: 235, recover: 0.9, cooldown: [3, 5] },
  barrel: { radius: 54, dmgPlayer: 22, dmgZombie: 6 },
};

export const WAVES = {
  baseCount: 4,        // zombies de la vague n = round((baseCount + perWave * n) * theme.count)
  perWave: 2.5,
  clearDelay: 1.4,     // délai entre la dernière mort et le choix d'amélioration (s)
  nextDelay: 1.2,      // délai entre le choix d'amélioration et la vague suivante (s)
  clearBonus: 50,      // bonus = clearBonus * vague
  bossEvery: 5,        // un boss toutes les 5 vagues
  speedBonusPerWave: 0.8,
  speedBonusCap: 15,   // nombre de vagues max pris en compte pour la vitesse
};

// Apparition : poids par type (fonction de la vague). `from` = première vague où le type apparaît.
export const SPAWN_TABLE = [
  { type: 'walker',   from: 1, w: (n) => Math.max(30, 100 - n * 5) },
  { type: 'runner',   from: 2, w: (n) => Math.min(35, 6 * n) },
  { type: 'spitter',  from: 3, w: (n) => Math.min(16, 4 + n) },
  { type: 'exploder', from: 4, w: (n) => Math.min(14, 3 + n) },
  { type: 'tank',     from: 4, w: (n) => Math.min(14, 2 + n) },
  { type: 'charger',  from: 6, w: (n) => Math.min(14, n) },
];

// Thèmes de vague : changent le déroulement pour casser la répétition.
//  count = multiplicateur de zombies · spawn = multiplicateur d'intervalle (plus petit = plus rapide)
//  only = types autorisés · boost = poids ajoutés · dark = nuit · supply = nb de bonus parachutés
export const THEMES = {
  normal:  {},
  horde:   { count: 1.7, spawn: 0.55, only: ['walker', 'runner', 'exploder'] },
  armored: { count: 0.75, boost: { tank: 40, charger: 25, spitter: 10 } },
  night:   { dark: true },
  supply:  { count: 0.9, supply: 2 },
  blitz:   { count: 1.25, spawn: 0.7, only: ['runner', 'walker', 'exploder'], boost: { runner: 90 } },
};

export const DROPS = {
  walker: 0.1, runner: 0.12, tank: 0.5, spitter: 0.15, exploder: 0.1, charger: 0.5, boss: 1,
  // chance qu'un zombie lâche un bonus temporaire (prioritaire sur soin/munitions)
  power: { walker: 0.02, runner: 0.03, spitter: 0.08, exploder: 0.05, tank: 0.22, charger: 0.3, boss: 1 },
  lifetime: 12,        // durée de vie d'un pickup (s)
  ammoShare: 0.55,     // probabilité d'une caisse de munitions (si une arme à réserve est débloquée)
};

export const POWER = {
  kinds: ['rage', 'shield', 'freeze', 'nuke'],
  rage: { dur: 8 },    // tir x2 et dégâts +50 %
  shield: { dur: 7 },  // invulnérable
  freeze: { dur: 6 },  // zombies ralentis
};

export const GRENADE = { cooldown: 9, radius: 56, damage: 6, flight: 0.55, range: 230 };

export const COMBO = { window: 2.5, step: 5, max: 5 };

// Améliorations proposées après chaque vague (3 au hasard parmi celles non au maximum).
export const PERKS = {
  dmg:     { icon: '💥', max: 4 },
  rate:    { icon: '⚡', max: 4 },
  speed:   { icon: '👟', max: 4 },
  hp:      { icon: '❤️', max: 5 },
  reload:  { icon: '🔄', max: 3 },
  pierce:  { icon: '🎯', max: 2 },
  vamp:    { icon: '🧛', max: 2 },
  magnet:  { icon: '🧲', max: 2 },
  ammo:    { icon: '📦', max: 2 },
  armor:   { icon: '🛡️', max: 3 },
  grenade: { icon: '💣', max: 3 },
  range:   { icon: '📡', max: 3 },
};

export const LOGICAL_WIDTH = 360;
