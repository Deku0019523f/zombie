// État global unique du jeu (objet muté en place, jamais remplacé).
import { PLAYER, WEAPONS, LOGICAL_WIDTH } from './config.js';

export const state = {
  phase: 'ready',        // ready | playing | paused | over
  w: LOGICAL_WIDTH, h: 640, // taille logique de l'arène
  best: 0,
  newBest: false,
  dead: false,

  score: 0, kills: 0, wave: 0,
  player: null,
  zombies: [], bullets: [], pickups: [],

  weapons: {}, current: 'pistol', cooldown: 0, reload: 0,

  waveState: 'intermission', // spawning | intermission
  intermission: 0, queue: [], spawnTimer: 0,

  // Effets visuels (la logique ne touche jamais au canvas)
  particles: [], decals: [], clearDecals: true,
  shake: 0, muzzle: 0, hurtFlash: 0,
};

export function resetState() {
  state.score = 0;
  state.kills = 0;
  state.wave = 0;
  state.dead = false;
  state.newBest = false;
  state.player = {
    x: state.w / 2, y: state.h * 0.58, r: PLAYER.radius,
    hp: PLAYER.maxHealth, angle: -Math.PI / 2, hitTimer: 0, moving: false,
  };
  state.zombies = [];
  state.bullets = [];
  state.pickups = [];
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
  state.queue = [];
  state.spawnTimer = 0;
  state.particles = [];
  state.decals = [];
  state.clearDecals = true;
  state.shake = 0;
  state.muzzle = 0;
  state.hurtFlash = 0;
}
