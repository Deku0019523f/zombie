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
    pellets: 1, spread: 0.03, speed: 460, range: 170, sound: 'pistol', gunLen: 12, kb: 2.5,
    modes: ['semi', 'auto', 'burst', 'charge'], mode: 'semi',
  },
  shotgun: {
    unlock: 3, mag: 6, reload: 1.8, rate: 0.75, damage: 1,
    pellets: 6, spread: 0.3, speed: 420, range: 105, sound: 'shotgun', gunLen: 18, kb: 7,
    modes: ['semi', 'auto', 'charge'], mode: 'semi',
    startReserve: 18, maxReserve: 36, pickup: 8,
  },
  smg: {
    unlock: 5, mag: 30, reload: 1.5, rate: 0.09, damage: 1,
    pellets: 1, spread: 0.09, speed: 500, range: 150, sound: 'smg', gunLen: 15, kb: 2,
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
  // Invocateur : reste à distance et fait surgir des zombies autour de lui
  summoner: { hp: 6,  speed: [22, 28], size: 24, score: 60,  damage: 8,  scale: 2 },
  // Rampant : fait le mort au sol, se redresse quand on s'approche (ou au bruit)
  crawler:  { hp: 2,  speed: [34, 44], size: 18, score: 18,  damage: 7,  scale: 2 },
  boss:     { hp: 40, speed: [26, 32], size: 46, score: 300, damage: 25, scale: 4 },
};

// Comportements spéciaux
export const AI = {
  spitter: { hold: [100, 150], retreat: 80, shootEvery: [2.0, 3.2], acidSpeed: 95, acidDmg: 10, acidLife: 3 },
  exploder: { radius: 46, dmgPlayer: 22, dmgZombie: 3 },
  charger: { triggerDist: 230, telegraph: 0.65, dash: 0.7, dashSpeed: 235, recover: 0.9, cooldown: [3, 5] },
  summoner: { hold: [120, 170], retreat: 90, every: [4.5, 6.5], telegraph: 0.9, count: 2, maxAlive: 20 },
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
  { type: 'summoner', from: 7, w: (n) => Math.min(10, n - 4) },
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
  walker: 0.1, crawler: 0.12, runner: 0.12, tank: 0.5, spitter: 0.15, exploder: 0.1, charger: 0.5, summoner: 0.4, boss: 1,
  // chance qu'un zombie lâche un bonus temporaire (prioritaire sur soin/munitions)
  power: { crawler: 0.03, walker: 0.02, runner: 0.03, spitter: 0.08, exploder: 0.05, tank: 0.22, charger: 0.3, summoner: 0.2, boss: 1 },
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
  vamp:    { icon: '🧙', max: 2 },
  magnet:  { icon: '🧲', max: 2 },
  ammo:    { icon: '📦', max: 2 },
  armor:   { icon: '🛡️', max: 3 },
  grenade: { icon: '💣', max: 3 },
  range:   { icon: '📡', max: 3 },
  crit:    { icon: '🔍', max: 3 },                 // tirs critiques plus forts
  dash:    { icon: '💨', max: 3 },                 // esquive plus fréquente
  // Améliorations risquées : un gros bonus contre un vrai malus
  glass:   { icon: '💎', max: 1, risk: true },     // +50 % dégâts, −30 % PV max
  berserk: { icon: '😈', max: 2, risk: true },     // +20 % cadence, +25 % dégâts subis
  pact:    { icon: '🩸', max: 1, risk: true },     // vampirisme +1,5 PV/kill, −20 PV max
};

// Synergies : actives dès que toutes les améliorations listées ont été prises (au moins 1 niveau).
export const SYNERGIES = {
  sniper:   { icon: '🔭', needs: ['range', 'crit'] },     // zone critique élargie, critiques +0,25
  fortress: { icon: '🏰', needs: ['armor', 'hp'] },        // régénération lente hors combat
  chain:    { icon: '🔗', needs: ['pierce', 'grenade'] },  // les zombies tués par une explosion explosent à leur tour
  ghost:    { icon: '👻', needs: ['speed', 'dash'] },      // l'esquive blesse et repousse, recharge −30 %
};

export const LOGICAL_WIDTH = 360;

// ---- v2.5 : rythme et profondeur de jeu ----

// Esquive (touche Maj / Q, bouton 💨) : élan rapide + invulnérabilité brève.
export const DASH = { cooldown: 3.2, dur: 0.16, speed: 420, invuln: 0.4, ghostDmg: 2, ghostReach: 18 };

// Tirs critiques : une balle qui touche près du centre du zombie (zone = fraction du rayon) fait plus de dégâts.
export const CRIT = { zone: 0.3, sniperZone: 0.45, mult: 1.5, perk: 0.35, sniper: 0.25 };

// Recul des balles selon le type de zombie (1 = recul complet).
export const KB_RES = { tank: 0.5, charger: 0.5, summoner: 0.8, boss: 0.15 };

// Zombies d'élite : apparaissent à partir de la vague `from`, avec un modificateur.
export const ELITE = {
  from: 4,
  chance: (n) => Math.min(0.22, 0.04 + 0.02 * (n - 4)),
  scoreMult: 3, coinMult: 4, powerDrop: 0.35,
  mods: {
    swift:    { hp: 1.3, speed: 1.5, color: '#38bdf8' },
    armored:  { hp: 2.4, speed: 0.9, color: '#e5e7eb' },
    healer:   { hp: 1.6, speed: 1,   color: '#4ade80', aura: 70, every: 2 },
    volatile: { hp: 1.4, speed: 1.1, color: '#fb923c', blast: 42, dmgPlayer: 14 },
  },
};

// Événements surprise en cours de vague (une fois par vague, à partir de la vague 3, jamais sur un boss).
export const EVENTS = {
  from: 3, delay: [9, 16],
  weights: { ambush: 45, blackout: 25, airdrop: 30 },
  ambushBase: 6, blackoutDur: 12, airdropLife: 22,
};

// Objectifs : générateur à défendre, zone à tenir, survivant à secourir.
export const OBJ = {
  generator: { hp: 100, r: 13, repair: 6, repairReach: 40, waveHeal: 30, hitCd: 0.8, dmgMult: 0.6 },
  zone: { r: 46, need: 7, needPerWave: 0.8, timeout: 70, trickleMax: 8, trickleEvery: 1.8, rewardScore: 100 },
  rescue: { time: 28, hold: 2.5, reach: 28, rewardScore: 75, rewardCoins: 3 },
};
export const ALLY = { dur: 40, rate: 0.7, range: 150, dmg: 1, speed: 330 };

// Balles infusées (ramassées sur la carte) : rareté 1 = commun, 2 = rare, 3 = épique.
export const INFUSE = {
  dur: [20, 30, 45],
  fire: { burn: [2, 3, 4.5], dps: [0.6, 1, 1.6] },
  volt: { arcs: [1, 2, 3], range: 70, dmg: [0.6, 0.9, 1.4] },
  rarity: ['common', 'rare', 'epic'],
};

// Séries de kills annoncées à l'écran.
export const STREAKS = [10, 20, 35, 50, 75, 100];

// Pièces gagnées (monnaie de l'atelier, conservée entre les parties).
export const COINS = {
  kill: { crawler: 1, walker: 1, runner: 1, tank: 3, spitter: 2, exploder: 2, charger: 3, summoner: 4, boss: 25 },
  wave: 3, wavePerNo: 2, winBase: 20, winPerStar: 15,
};

// Atelier : améliorations permanentes achetées avec les pièces (cost = prix de chaque niveau).
export const META = {
  vigor:   { icon: '❤️', max: 5, cost: [30, 60, 100, 150, 220] },   // +10 PV max
  power:   { icon: '💥', max: 5, cost: [40, 80, 130, 190, 260] },   // +4 % dégâts
  agility: { icon: '💨', max: 4, cost: [40, 80, 140, 220] },        // esquive −10 % de recharge
  purse:   { icon: '🪙', max: 4, cost: [50, 100, 170, 260] },       // +15 % de pièces
  kit:     { icon: '🎒', max: 3, cost: [80, 170, 300] },            // améliorations offertes au départ
  arsenal: { icon: '🔫', max: 2, cost: [120, 260] },                // armes débloquées dès le départ
};

// ---- v3.0 : mode « Ville » (carte étendue, caméra qui suit le joueur) ----
// zw/zh = taille d'une zone ; cols x rows zones (v3.1 : 4 x 3 = 12 zones). aggro = distance de repérage d'un zombie au repos ;
// lose = distance à laquelle il perd le joueur ; noise = rayon alerté par défaut ; spawnRing = anneau d'apparition autour du joueur.
export const CITY = {
  zw: 360, zh: 620, cols: 4, rows: 3,
  aggro: 230, lose: 420, noise: 260,
  // portée du bruit (px) par arme ; avec un silencieux le tir est quasi inaudible
  noiseWeapon: { pistol: 230, shotgun: 340, smg: 290 }, noiseSilenced: 60, noiseBoom: 420, noiseDash: 120,
  stealth: { still: 0.65, dash: 1.35, night: 0.85, rain: 0.85 },   // multiplicateurs de la distance de repérage
  crawlerAggro: 95, lureRange: 480, alarmTime: 14, alarmChance: 0.4, silencerShots: 20,
  spawnEvery: [1.1, 2.4], spawnRing: [300, 470],
  fill: 0.7,                 // part de la densité placée au démarrage
  perkFirst: 12, perkStep: 14, // une amélioration tous les N kills (N augmente)
  supplyCd: 60, cpHeal: 0.35, camLerp: 7,
  winBonus: 40,
  // coffres aléatoires : nombre par zone, rayon d'ouverture, rayon de vue de la carte explorée
  chests: 2, chestsDanger: 3, chestR: 22, exploreR: 120, cell: 40,
  chestLoot: [['ammo', 24], ['health', 20], ['coins', 20], ['grenade', 12], ['map', 16], ['silencer', 6], ['perk', 4]],
  dayLen: 300, startTod: 0.34,   // durée d'un jour complet (s) · heure de départ (0 = minuit, 0.5 = midi)
  weatherEvery: [55, 110], rainChance: 0.3, fogChance: 0.2,
};
