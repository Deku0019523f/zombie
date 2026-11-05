// État global unique du jeu (objet muté en place, jamais remplacé).
import { WEAPONS, LOGICAL_WIDTH, CITY } from './config.js';
import { computeStats } from './stats.js';
import { computeSolids, makeBarrels } from './layout.js';
import { buildCityMap, rollChests, WORLD_W, WORLD_H } from './citymap.js';
import { initAmbient } from './ambient.js';

export const state = {
  phase: 'ready',        // ready | playing | paused | perk | over
  w: LOGICAL_WIDTH, h: 640, // taille logique du monde (= de l'écran, sauf en mode ville)
  vw: LOGICAL_WIDTH, vh: 640, // taille logique de l'écran (la caméra en montre cette portion)
  cam: { x: 0, y: 0 }, city: null, bgDirty: false,
  best: 0,
  newBest: false,
  dead: false,

  score: 0, kills: 0, wave: 0,
  player: null,
  zombies: [], bullets: [], pickups: [],
  acid: [], grenades: [], blasts: [], barrels: [], solids: [],

  weapons: {}, current: 'pistol', cooldown: 0, reload: 0,
  modes: {},             // mode de tir par arme (semi | auto | burst | charge), persistant
  burst: { left: 0, timer: 0 }, charge: 0,
  settings: { range: true },
  meta: {},              // niveaux de l'atelier (permanents)

  // mode de jeu : 'survival' (infini) ou 'campaign' (niveau `level`, vague n°`waveNo` sur `level.waves`)
  mode: 'survival', level: null, waveNo: 0, won: false, stars: 0, pendingWin: false, unlockedNew: false, starsUp: false,

  // vagues : intermission | spawning | cleared | perkwait
  waveState: 'intermission', intermission: 0, clearTimer: 0, queue: [], spawnTimer: 0,
  theme: 'normal', spawnMult: 1, dark: false, darkAmt: 0,

  // progression de la partie
  perks: {}, stats: computeStats({}), pendingPerk: false, perkChoices: [],
  buffs: { rage: 0, shield: 0, freeze: 0 },
  combo: { count: 0, timer: 0 },
  grenadeCd: 0, grenadeMax: 1,
  dash: { cd: 0, t: 0, dx: 0, dy: 0, id: 0, trail: [] },
  coins: 0, banked: false, lastCoins: 0, deathCause: '',
  ammoFx: null,          // balles infusées : { kind: 'fire' | 'volt', tier: 1..3, t }
  regenT: 0,             // temps depuis le dernier coup reçu (régénération)
  eventT: 0, darkT: 0,   // minuteur d'événement surprise, durée du noir provoqué par un événement
  gen: null, zone: null, surv: null, ally: null, // objectifs : générateur, zone à tenir, survivant, allié
  arcs: [],              // éclairs (balles électriques)
  hitStop: 0, streak: 0, inBlast: 0,

  // Effets visuels (la logique ne touche jamais au canvas)
  particles: [], decals: [], floaters: [],
  corpses: [], casings: [],   // traces persistantes du combat (ville) : cadavres et douilles
  silencer: 0,                // tirs silencieux restants (ville)
  bigMap: false,              // grande carte ouverte (ville) : le jeu est en pause
  shake: 0, muzzle: 0, hurtFlash: 0, flash: 0,
};

// city = true : monde étendu de la ville (caméra qui suit le joueur) ; sinon arène de la taille de l'écran.
export function resetState(city = false) {
  state.score = 0;
  state.kills = 0;
  state.wave = 0;
  state.dead = false;
  state.newBest = false;
  state.perks = {};
  state.stats = computeStats(state.perks);
  state.pendingPerk = false;
  state.perkChoices = [];
  state.buffs = { rage: 0, shield: 0, freeze: 0 };
  state.combo = { count: 0, timer: 0 };
  state.grenadeCd = 0;
  state.grenadeMax = 1;
  state.dash = { cd: 0, t: 0, dx: 0, dy: 0, id: 0, trail: [] };
  state.coins = 0;
  state.banked = false;
  state.lastCoins = 0;
  state.deathCause = '';
  state.ammoFx = null;
  state.regenT = 0;
  state.eventT = 0;
  state.darkT = 0;
  state.gen = null;
  state.zone = null;
  state.surv = null;
  state.ally = null;
  state.arcs = [];
  state.hitStop = 0;
  state.streak = 0;
  state.inBlast = 0;
  let start = null;
  if (city) {
    const m = buildCityMap();
    state.w = WORLD_W;
    state.h = WORLD_H;
    state.solids = m.solids;
    state.barrels = m.barrels;
    start = m.start;
    const seed = Math.floor(Math.random() * 1e9);
    const cols = Math.ceil(WORLD_W / CITY.cell);
    const rows = Math.ceil(WORLD_H / CITY.cell);
    state.city = {
      map: m, cp: 'res', cps: {}, zone: '', spawnT: 1, perkAt: 0, perksTaken: 0, won: false, filled: false,
      supplies: m.supplies.map((s) => ({ ...s, cd: 0 })), caches: m.caches.map((c) => ({ ...c, taken: false })),
      seed, chests: rollChests(seed, m).map((k) => ({ ...k, open: false, t: 0 })),
      maps: {},                                               // zones dont on possède la carte
      explored: new Uint8Array(cols * rows), gcols: cols, grows: rows, exploreT: 0,
    };
    initAmbient(state.city);
  } else {
    state.w = state.vw;
    state.h = state.vh;
    state.city = null;
    state.solids = computeSolids(state.w, state.h);
    state.barrels = makeBarrels(state.w, state.h);
  }
  state.cam = { x: 0, y: 0 };
  state.bgDirty = true;
  state.player = {
    x: start ? start.x : state.w / 2, y: start ? start.y : state.h * 0.58, r: 10,
    hp: state.stats.maxHp, angle: -Math.PI / 2, hitTimer: 0, moving: false,
  };
  state.zombies = [];
  state.bullets = [];
  state.pickups = [];
  state.acid = [];
  state.grenades = [];
  state.blasts = [];
  state.weapons = {};
  for (const [id, d] of Object.entries(WEAPONS)) {
    state.weapons[id] = {
      mag: d.mag,
      reserve: d.startReserve ?? Infinity,
      unlocked: d.unlock === 1 || (id === 'shotgun' && (state.meta.arsenal || 0) >= 1) || (id === 'smg' && (state.meta.arsenal || 0) >= 2),
    };
  }
  state.current = 'pistol';
  state.cooldown = 0;
  state.reload = 0;
  state.burst = { left: 0, timer: 0 };
  state.charge = 0;
  state.waveNo = 0;
  state.won = false;
  state.pendingWin = false;
  state.unlockedNew = false;
  state.starsUp = false;
  state.stars = 0;
  state.waveState = 'intermission';
  state.intermission = 0;
  state.clearTimer = 0;
  state.queue = [];
  state.spawnTimer = 0;
  state.theme = 'normal';
  state.spawnMult = 1;
  state.dark = false;
  state.darkAmt = 0;
  state.particles = [];
  state.decals = [];
  state.corpses = [];
  state.casings = [];
  state.silencer = 0;
  state.bigMap = false;
  state.floaters = [];
  state.shake = 0;
  state.muzzle = 0;
  state.hurtFlash = 0;
  state.flash = 0;
}
