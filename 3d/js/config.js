// Équilibrage et constantes du jeu 3D. Aucun import : module pur (testable sous Node).
export const VERSION = '5.2.0-survie';
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

// Sac à dos affiché dans le dos du joueur (props/Backpack.glb, 3,3 unités de large : normalisé à `width` mètres).
export const BACKPACK_VIEW = { model: 'props/Backpack.glb', width: 0.42, y: 1.18, z: -0.2 };

export const WEAPON_ORDER = ['knife', 'bat', 'guitar', 'club', 'spear', 'axe', 'pick', 'pistol', 'shotgun', 'smg', 'rifle'];
// melee : pas de munitions. tree / rock = ressources récoltées par coup (0 = impossible). noise = rayon (m) où les zombies entendent le coup.
// builtin : objet déjà présent dans le modèle du joueur (couteau, batte) ; model : objet à attacher à la main.
// fit (outils de mêlée) : { len: longueur réelle en mètres, rot: rotation [x,y,z] en degrés pour amener la TÊTE de l'outil vers +Z
//   (le repère du couteau tenu en main), grip: distance, en unités du modèle depuis le bout du manche, où la main serre l'outil }.
//   view.js mesure l'échelle réelle de la main et en déduit l'échelle du modèle : plus aucun coefficient « au hasard ».
export const WEAPONS = {
  knife:   { name: 'Couteau', melee: true, builtin: 'Knife',         dmg: 26, interval: 0.50, range: 1.9, arc: 1.0, tree: 1, rock: 0, noise: 6, anim: 'Stab' },
  bat:     { name: 'Batte',   melee: true, builtin: 'WoodenBat_Saw', dmg: 42, interval: 0.80, range: 2.1, arc: 1.2, tree: 1, rock: 0, noise: 8, anim: 'Slash' },
  guitar:  { name: 'Guitare', melee: true, model: 'weapons/Guitar.gltf', fit: { len: 0.8, rot: [-90, 0, 0], grip: 0.3 }, dmg: 34, interval: 0.80, range: 2.0, arc: 1.2, tree: 0, rock: 0, noise: 16, anim: 'Slash' },
  club:    { name: 'Batte à clous', melee: true, model: 'weapons/WoodenBat_Barbed.gltf', fit: { len: 0.85, rot: [0, 0, 0], grip: 0.33 }, dmg: 55, interval: 0.85, range: 2.1, arc: 1.2, tree: 1, rock: 0, noise: 9, anim: 'Slash' },
  spear:   { name: 'Lance',   melee: true, model: 'weapons/Spear.gltf', fit: { len: 1.7, rot: [0, 0, 0], grip: 0.75 }, dmg: 40, interval: 0.70, range: 2.7, arc: 0.5, tree: 0, rock: 0, noise: 5, anim: 'Stab' },
  axe:     { name: 'Hache',   melee: true, model: 'weapons/Axe.gltf', dmg: 48, interval: 0.75, range: 2.0, arc: 1.1, tree: 2, rock: 0, noise: 9, anim: 'Slash' },
  pick:    { name: 'Pioche',  melee: true, model: 'props/Shovel.glb', fit: { len: 1.05, rot: [-90, 0, 0], grip: 1.3 }, dmg: 30, interval: 0.85, range: 2.0, arc: 0.9, tree: 1, rock: 2, noise: 10, anim: 'Slash' },
  pistol:  { name: 'Pistolet',   model: 'weapons/Pistol.gltf',  dmg: 24, interval: 0.30, mag: 12, reload: 1.3, spread: 0.014, range: 30, pellets: 1, auto: false, pierce: 1, kick: 0.012 },
  shotgun: { name: 'Fusil à pompe', model: 'weapons/Shotgun.gltf', dmg: 12, interval: 0.85, mag: 6,  reload: 2.1, spread: 0.095, range: 15, pellets: 8, auto: false, pierce: 1, kick: 0.04 },
  smg:     { name: 'Mitraillette', model: 'weapons/SMG.gltf',    dmg: 11, interval: 0.085, mag: 30, reload: 1.8, spread: 0.04,  range: 26, pellets: 1, auto: true,  pierce: 1, kick: 0.008 },
  rifle:   { name: 'Fusil',      model: 'weapons/Rifle.gltf',   dmg: 52, interval: 0.55, mag: 8,  reload: 2.0, spread: 0.004, range: 60, pellets: 1, auto: false, pierce: 3, kick: 0.025 },
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

// ---------------------------------------------------------------- SURVIE (v5)
export const SURVIVAL = {
  dayMinutes: 14,            // durée réelle d'un jour de jeu
  startHour: 7.5,            // on commence le matin
  hungerStart: 70, thirstStart: 60,
  hungerPerSec: 100 / (16 * 60), thirstPerSec: 100 / (11 * 60),   // vide en 16 min / 11 min réelles
  starveDmg: 1.2,            // PV/s quand faim ou soif à zéro
  regen: 0.5,                // PV/s si bien nourri et sans saignement
  bleedDmg: 1.5, bleedChance: 0.3,
  bandageHeal: 15, foodGain: 35, waterGain: 40,
  popDay: 12, popNight: 36, popStart: 12, popMax: 42,
  spawnMin: 30, spawnMax: 48, despawn: 75, spawnEvery: 4,
  sightDay: 13, sightNight: 10, hearing: 6, loseDist: 38,
  lootRespawn: 480,          // s réelles avant qu'un point de butin se remplisse à nouveau
  reach: 2.6, grid: 2,       // construction : distance devant le joueur, pas de la grille
  fireRadius: 3.2, fireHeal: 1.2,
  wanderRatio: 0.4,
  // capacité de transport par ressource (sans sac à dos) ; les munitions et les objets absents de la liste sont illimités
  cap: { wood: 10, stone: 8, food: 4, water: 4, bandage: 4, match: 5 },
  capBag: 2,                 // le sac à dos double chaque plafond
};

export const ITEMS = {
  wood:    { name: 'Bois',      icon: '🪵' },
  stone:   { name: 'Pierre',    icon: '🪨' },
  food:    { name: 'Conserve',  icon: '🥫' },
  water:   { name: 'Eau',       icon: '💧' },
  bandage: { name: 'Bandage',   icon: '🩹' },
  ammo:    { name: 'Munitions', icon: '•' },
  match:   { name: 'Allumette', icon: '🔥' },
  backpack:{ name: 'Sac à dos', icon: '🎒' },
};

// Pièces constructibles. Une pierre dure 3 fois plus longtemps que le bois (demande d'Alec).
// Le feu de camp consomme une allumette (boîte trouvée dans la cabane, les maisons, les voitures…).
export const PIECES = {
  wall:  { name: 'Mur en bois',   cost: { wood: 2 },  hp: 120, h: 2.4 },
  stone: { name: 'Mur en pierre', cost: { stone: 3 }, hp: 360, h: 2.4 },
  door:  { name: 'Porte',         cost: { wood: 3 },  hp: 90,  h: 2.2 },
  fire:  { name: 'Feu de camp',   cost: { wood: 3, match: 1 }, hp: 40, h: 0.6 },
};
export const PIECE_ORDER = ['wall', 'stone', 'door', 'fire'];

// Tables de butin : [objet, min, max, chance]. Un objet qui est une arme (WEAPONS) donne l'arme.
export const LOOT = {
  cabin:     { rolls: [['food', 1, 1, 1], ['bandage', 1, 1, 1], ['match', 2, 3, 1]] },
  tools:     { rolls: [['pick', 1, 1, 1]] },
  house:     { rolls: [['food', 1, 2, 0.65], ['water', 1, 2, 0.6], ['bandage', 1, 1, 0.4], ['wood', 1, 2, 0.3], ['match', 1, 2, 0.3], ['ammo', 3, 6, 0.1], ['bat', 1, 1, 0.07], ['axe', 1, 1, 0.07], ['pistol', 1, 1, 0.05], ['guitar', 1, 1, 0.05], ['club', 1, 1, 0.04], ['spear', 1, 1, 0.04], ['backpack', 1, 1, 0.06]] },
  container: { rolls: [['food', 1, 2, 0.5], ['water', 1, 2, 0.5], ['bandage', 1, 2, 0.5], ['match', 1, 2, 0.25], ['ammo', 4, 8, 0.3], ['axe', 1, 1, 0.12], ['pistol', 1, 1, 0.12], ['shotgun', 1, 1, 0.04], ['club', 1, 1, 0.06], ['spear', 1, 1, 0.06], ['backpack', 1, 1, 0.12]] },
  car:       { rolls: [['water', 1, 1, 0.3], ['bandage', 1, 1, 0.25], ['ammo', 2, 5, 0.25], ['wood', 1, 1, 0.2], ['match', 1, 1, 0.15], ['backpack', 1, 1, 0.08]] },
  barrel:    { rolls: [['water', 1, 1, 0.35], ['wood', 1, 2, 0.4]] },
  trash:     { rolls: [['food', 1, 1, 0.3], ['bandage', 1, 1, 0.12], ['wood', 1, 1, 0.25], ['match', 1, 1, 0.1]] },
};

export const PICKUP = {
  radius: 1.4,
  dropBandage: 0.06, dropFood: 0.08, dropWater: 0.05,   // lâchés par les zombies tués
};
