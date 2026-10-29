// Cycle de vie du jeu : démarrage, pause, choix d'amélioration, fin de partie, mise à jour par frame.
import { WAVES } from './config.js';
import { state, resetState } from './state.js';
import { input, resetInput } from './input.js';
import { updatePlayer } from './player.js';
import { updateWeapons } from './weapons.js';
import { updateBullets } from './bullets.js';
import { updateZombies } from './zombies.js';
import { updatePickups } from './pickups.js';
import { updateWaves, startWave } from './waves.js';
import { updateEffects } from './effects.js';
import { updateAcid, updateGrenades } from './combat.js';
import { rollChoices, applyPerk } from './perks.js';
import { showOverlay, hideOverlay, showPerks, hidePerks } from './ui.js';
import { getBest, setBest } from './storage.js';
import { sfx } from './audio.js';

export function initGame() {
  state.best = getBest();
  resetState();
  state.phase = 'ready';
  showOverlay('ready');
}

export function startGame() {
  hidePerks();
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

// ---- Écran d'amélioration (entre deux vagues) ----
function openPerks() {
  state.pendingPerk = false;
  const choices = rollChoices(3);
  if (choices.length === 0) {            // tout est au maximum : on enchaîne
    state.waveState = 'intermission';
    state.intermission = WAVES.nextDelay;
    return;
  }
  state.perkChoices = choices;
  state.phase = 'perk';
  resetInput();
  showPerks(choices);
}

export function choosePerk(i) {
  if (state.phase !== 'perk') return;
  const id = state.perkChoices[i];
  if (!id) return;
  applyPerk(id);
  sfx.perk();
  hidePerks();
  state.phase = 'playing';
  state.waveState = 'intermission';
  state.intermission = WAVES.nextDelay;
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

// Minuteurs : bonus temporaires, combo, grenade, barils.
function updateTimers(dt) {
  for (const k of Object.keys(state.buffs)) state.buffs[k] = Math.max(0, state.buffs[k] - dt);
  state.grenadeCd = Math.max(0, state.grenadeCd - dt);
  const c = state.combo;
  if (c.count > 0) {
    c.timer -= dt;
    if (c.timer <= 0) c.count = 0;
  }
  for (const b of state.barrels) if (b.flash > 0) b.flash -= dt;
  if (state.barrels.some((b) => b.dead)) state.barrels = state.barrels.filter((b) => !b.dead);
}

export function update(dt) {
  updateTimers(dt);
  updatePlayer(dt);
  updateWeapons(dt);
  updateBullets(dt);
  updateZombies(dt);
  updateAcid(dt);
  updateGrenades(dt);
  updatePickups(dt);
  updateWaves(dt);
  updateEffects(dt);
  state.hurtFlash = Math.max(0, state.hurtFlash - dt);
  if (state.dead) endGame();
  else if (state.pendingPerk) openPerks();
}
