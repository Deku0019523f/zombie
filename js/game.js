// Cycle de vie du jeu : démarrage, pause, fin de partie, mise à jour par frame.
import { state, resetState } from './state.js';
import { input, resetInput } from './input.js';
import { updatePlayer } from './player.js';
import { updateWeapons } from './weapons.js';
import { updateBullets } from './bullets.js';
import { updateZombies } from './zombies.js';
import { updatePickups } from './pickups.js';
import { updateWaves, startWave } from './waves.js';
import { showOverlay, hideOverlay } from './ui.js';
import { getBest, setBest } from './storage.js';
import { sfx } from './audio.js';

export function initGame() {
  state.best = getBest();
  resetState();
  state.phase = 'ready';
  showOverlay('ready');
}

export function startGame() {
  resetState();
  resetInput();
  startWave(1);
  state.phase = 'playing';
  hideOverlay();
}

export function pauseGame() {
  if (state.phase !== 'playing') return;
  state.phase = 'paused';
  resetInput();
  showOverlay('paused');
}

export function resumeGame() {
  if (state.phase !== 'paused') return;
  state.phase = 'playing';
  hideOverlay();
}

export function togglePause() {
  if (state.phase === 'playing') pauseGame();
  else if (state.phase === 'paused') resumeGame();
}

// Entrée / Espace / bouton de l'overlay.
export function confirm() {
  if (state.phase === 'ready' || state.phase === 'over') startGame();
  else if (state.phase === 'paused') resumeGame();
}

function endGame() {
  state.phase = 'over';
  input.firing = false;
  if (state.score > state.best) {
    state.best = state.score;
    state.newBest = true;
    setBest(state.best);
  }
  sfx.over();
  showOverlay('over');
}

export function update(dt) {
  updatePlayer(dt);
  updateWeapons(dt);
  updateBullets(dt);
  updateZombies(dt);
  updatePickups(dt);
  updateWaves(dt);
  state.hurtFlash = Math.max(0, state.hurtFlash - dt);
  if (state.dead) endGame();
}
