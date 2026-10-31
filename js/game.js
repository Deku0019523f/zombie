// Cycle de vie du jeu : démarrage, pause, choix d'amélioration, fin de partie, mise à jour par frame.
import { WAVES } from './config.js';
import { levelById, starsFor, LEVELS } from './campaign.js';
import { state, resetState } from './state.js';
import { input, resetInput } from './input.js';
import { updatePlayer } from './player.js';
import { updateWeapons, cancelFire, loadModes } from './weapons.js';
import { updateBullets } from './bullets.js';
import { updateZombies } from './zombies.js';
import { updatePickups } from './pickups.js';
import { updateWaves, startWave } from './waves.js';
import { updateEffects } from './effects.js';
import { updateAcid, updateGrenades } from './combat.js';
import { rollChoices, applyPerk } from './perks.js';
import { toast } from './ui.js';
import { t } from './i18n.js';
import { showPerks, hidePerks } from './ui.js';
import { showScreen, hideScreen, currentScreen, selectLevel, primaryAction } from './screens.js';
import { getBest, setBest, getModes, getSettings, getProgress, setProgress } from './storage.js';
import { sfx } from './audio.js';

export function initGame() {
  state.best = getBest();
  state.settings = getSettings();
  loadModes(getModes());
  resetState();
  state.phase = 'ready';
  showScreen('main');
}

// Retour au menu principal (depuis la pause, la défaite ou la victoire).
export function goMenu() {
  hidePerks();
  resetInput();
  cancelFire();
  state.best = getBest();
  state.phase = 'ready';
  showScreen('main');
}

// Lance une partie. mode : 'survival' (par défaut) ou 'campaign' (+ numéro de niveau).
export function startGame(mode = 'survival', levelId = 1) {
  hidePerks();
  resetState();
  resetInput();
  cancelFire();
  const level = mode === 'campaign' ? levelById(levelId) : null;
  state.mode = level ? 'campaign' : 'survival';
  state.level = level;
  state.phase = 'playing';
  hideScreen();
  if (level) {
    selectLevel(level.id);
    // équipement de départ : améliorations offertes selon le niveau
    for (const id of rollChoices(level.kit)) applyPerk(id);
    state.player.hp = state.stats.maxHp;
    startWave(level.from);
    toast(t('levelStart', level.id, t(`lvl_${level.id}_n`)), 2600);
    if (level.kit) setTimeout(() => { if (state.phase === 'playing') toast(t('kitToast', level.kit), 2000); }, 2700);
  } else {
    startWave(1);
  }
}

export function pauseGame() {
  if (state.phase !== 'playing') return;
  state.phase = 'paused';
  resetInput();
  cancelFire();
  showScreen('paused');
}

export function resumeGame() {
  if (state.phase !== 'paused') return;
  state.phase = 'playing';
  hideScreen();
}

export function togglePause() {
  if (state.phase === 'playing') pauseGame();
  else if (state.phase === 'paused') resumeGame();
}

// Entrée / Espace : action principale de l'écran affiché (menu, pause, victoire…).
export function confirm() {
  if (currentScreen()) primaryAction();
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
  cancelFire();
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
  cancelFire();
  if (state.mode === 'survival' && state.score > state.best) {
    state.best = state.score;
    state.newBest = true;
    setBest(state.best);
  }
  sfx.over();
  showScreen('over');
}

// Victoire d'un niveau de la campagne : étoiles, déblocage du niveau suivant, sauvegarde.
function winLevel() {
  state.pendingWin = false;
  state.phase = 'over';
  state.won = true;
  input.firing = false;
  cancelFire();
  const lv = state.level;
  const stars = starsFor(state.player.hp / state.stats.maxHp);
  const p = getProgress();
  state.stars = stars;
  state.starsUp = stars > (p.stars[lv.id] || 0);
  if (state.starsUp) p.stars[lv.id] = stars;
  p.best[lv.id] = Math.max(p.best[lv.id] || 0, state.score);
  const next = Math.min(lv.id + 1, LEVELS.length);
  state.unlockedNew = lv.id < LEVELS.length && p.unlocked < next;
  p.unlocked = Math.max(p.unlocked, next);
  setProgress(p);
  sfx.wave();
  showScreen('victory');
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
  else if (state.pendingWin) winLevel();
  else if (state.pendingPerk) openPerks();
}
