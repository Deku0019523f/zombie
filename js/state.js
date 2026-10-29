// État global unique du jeu (objet muté en place, jamais remplacé).
import { WEAPONS, LOGICAL_WIDTH } from './config.js';
import { computeStats } from './stats.js';
import { computeSolids, makeBarrels } from './layout.js';

export const state = {
  phase: 'ready',        // ready | playing | paused | perk | over
  w: LOGICAL_WIDTH, h: 640, // taille logique de l'arène
  best: 0,
  newBest: false,
  dead: false,

  score: 0, kills: 0, wave: 0,
  player: null,
  zombies: [], bullets: [], pickups: [],
  acid: [], grenades: [], blasts: [], barrels: [], solids: [],

  weapons: {}, current: 'pistol', cooldown: 0, reload: 0,

  // vagues : intermission | spawning | cleared | perkwait
  waveState: 'intermission', intermission: 0, clearTimer: 0, queue: [], spawnTimer: 0,
  theme: 'normal', spawnMult: 1, dark: false, darkAmt: 0,

  // progression de la partie
  perks: {}, stats: computeStats({}), pendingPerk: false, perkChoices: [],
  buffs: { rage: 0, shield: 0, freeze: 0 },
  combo: { count: 0, timer: 0 },
  grenadeCd: 0, grenadeMax: 1,

  // Effets visuels (la logique ne touche jamais au canvas)
  particles: [], decals: [], floaters: [],
  shake: 0, muzzle: 0, hurtFlash: 0, flash: 0,
};

export function resetState() {
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
  state.solids = computeSolids(state.w, state.h);
  state.barrels = makeBarrels(state.w, state.h);
  state.player = {
    x: state.w / 2, y: state.h * 0.58, r: 10,
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
      unlocked: d.unlock === 1,
    };
  }
  state.current = 'pistol';
  state.cooldown = 0;
  state.reload = 0;
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
  state.floaters = [];
  state.shake = 0;
  state.muzzle = 0;
  state.hurtFlash = 0;
  state.flash = 0;
}
