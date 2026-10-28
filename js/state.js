// État global unique du jeu (objet muté en place, jamais remplacé).
import { PLAYER, WEAPONS } from './config.js';

export const state = {
  phase: 'ready',        // ready | playing | paused | over
  w: 800, h: 500,        // taille de l'arène (px)
  best: 0,
  newBest: false,
  dead: false,

  score: 0, kills: 0, wave: 0,
  player: null,
  zombies: [], bullets: [], pickups: [],

  weapons: {}, current: 'pistol', cooldown: 0, reload: 0,

  waveState: 'intermission', // spawning | intermission
  intermission: 0, queue: [], spawnTimer: 0,

  hurtFlash: 0,
};

export function resetState() {
  state.score = 0;
  state.kills = 0;
  state.wave = 0;
  state.dead = false;
  state.newBest = false;
  state.player = {
    x: state.w / 2, y: state.h / 2, r: PLAYER.radius,
    hp: PLAYER.maxHealth, angle: 0, hitTimer: 0,
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
  state.hurtFlash = 0;
  if (typeof document !== 'undefined') {
    document.querySelectorAll('#arena .zombie, #arena .bullet, #arena .pickup').forEach((e) => e.remove());
  }
}
