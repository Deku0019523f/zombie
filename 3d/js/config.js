// Équilibrage et constantes du jeu 3D. Aucun import : module pur (testable sous Node).
export const VERSION = '4.0.0-alpha';
export const MODELS = '../assets/models/';

export const WORLD = { half: 56, fogNear: 22, fogFar: 85 };

export const CAMERA = {
  fov: 64,
  dist: 3.3,        // distance derrière le joueur
  shoulder: 0.6,    // décalage vers la droite (par-dessus l'épaule)
  pivotY: 1.55,     // hauteur du point visé par la caméra
  pitchMin: -0.35,
  pitchMax: 0.85,
  sens: 0.0042,     // rad / pixel (glisser le doigt)
};

export const PLAYER = {
  model: 'characters/Characters_Matt_SingleWeapon.gltf',
  scale: 1.1,
  hp: 100,
  speed: 3.6,
  sprint: 6.4,
  stamina: 100,
  drain: 24,        // /s en sprint
  regen: 14,        // /s au repos
  turn: 14,         // vitesse de rotation du corps
  radius: 0.38,
};

// Position de l'arme dans la main : même os / même pose que le couteau livré avec le modèle.
export const WEAPON_HAND = {
  bone: 'Middle1.L',
  pos: [0.011570863, 0.104614112, -0.045776397],
  quat: [0.433318317, 0.556886971, 0.439809144, 0.555589914],
  hide: ['Knife', 'WoodenBat_Saw'],
};

export const WEAPON_ORDER = ['pistol', 'shotgun', 'smg', 'rifle'];
export const WEAPONS = {
  pistol:  { name: 'Pistolet',   model: 'weapons/Pistol.gltf',  dmg: 24, interval: 0.30, mag: 12, reserve: 72,  reload: 1.3, spread: 0.014, range: 30, pellets: 1, auto: false, pierce: 1, kick: 0.012 },
  shotgun: { name: 'Fusil à pompe', model: 'weapons/Shotgun.gltf', dmg: 12, interval: 0.85, mag: 6,  reserve: 30,  reload: 2.1, spread: 0.095, range: 15, pellets: 8, auto: false, pierce: 1, kick: 0.04 },
  smg:     { name: 'Mitraillette', model: 'weapons/SMG.gltf',    dmg: 11, interval: 0.085, mag: 30, reserve: 150, reload: 1.8, spread: 0.04,  range: 26, pellets: 1, auto: true,  pierce: 1, kick: 0.008 },
  rifle:   { name: 'Fusil',      model: 'weapons/Rifle.gltf',   dmg: 52, interval: 0.55, mag: 8,  reserve: 40,  reload: 2.0, spread: 0.004, range: 60, pellets: 1, auto: false, pierce: 3, kick: 0.025 },
};
export const ASSIST = 0.17;       // visée assistée (rad ≈ 10°) : indispensable au tactile
export const HEAD_MULT = 2.2;

// h = hauteur approximative du zombie (sert aux zones de touche : tête / torse / jambes)
export const ZOMBIES = {
  basic:    { model: 'characters/Zombie_Basic.gltf',    scale: 1.1, hp: 60,  speed: 1.7, dmg: 10, h: 1.5, radius: 0.4,  score: 10, range: 1.15, cycle: 1.1, hitAt: 0.5, stagger: 0.35, atk: ['Idle_Attack', 'Punch'] },
  arm:      { model: 'characters/Zombie_Arm.gltf',      scale: 1.1, hp: 45,  speed: 2.9, dmg: 8,  h: 1.5, radius: 0.38, score: 15, range: 1.1,  cycle: 0.9, hitAt: 0.4, stagger: 0.30, atk: ['Run_Attack', 'Punch'] },
  ribcage:  { model: 'characters/Zombie_Ribcage.gltf',  scale: 1.1, hp: 30,  speed: 3.8, dmg: 7,  h: 1.25, radius: 0.34, score: 12, range: 1.0, cycle: 0.8, hitAt: 0.35, stagger: 0.25, atk: ['Run', 'Idle'] },
  chubby:   { model: 'characters/Zombie_Chubby.gltf',   scale: 1.1, hp: 170, speed: 1.3, dmg: 20, h: 1.8, radius: 0.55, score: 30, range: 1.35, cycle: 1.4, hitAt: 0.7, stagger: 0.10, atk: ['Idle_Attack', 'Punch'] },
};
export const ZOMBIE_AGGRO = 13;     // un zombie « au repos » nous remarque à cette distance
export const ALERT_RADIUS = 34;     // un tir alerte les zombies proches
export const RUN_ABOVE = 2.4;       // au-delà : animation de course

export const WAVE = {
  baseCount: 5, perWave: 3, maxCount: 70,
  maxAlive: 18,          // plafond d'ennemis simultanés (mobile)
  spawnEvery: 0.7,
  spawnMin: 20, spawnMax: 30,
  pause: 6,              // temps entre deux vagues
  bonus: 50,             // points × numéro de vague
  ambient: 8,            // zombies endormis au départ
  unlocks: { 2: 'shotgun', 4: 'smg', 7: 'rifle' },   // caisse d'arme au début de ces vagues
  medEvery: 2,           // caisse de soin toutes les N vagues
};

export const PICKUP = {
  radius: 1.4, med: 35,
  dropMed: 0.10, dropAmmo: 0.14,
  ammoMagsPistol: 2, ammoMags: 1.5,
};
