// Point d'entrée : branche le DOM, les entrées et la boucle de jeu.
import { stage, canvas, $ } from './dom.js';
import { state } from './state.js';
import { WEAPONS } from './config.js';
import { initInput, resetInput } from './input.js';
import { initGame, startGame, togglePause, confirm, update, choosePerk } from './game.js';
import { switchWeapon, cycleWeapon, startReload } from './weapons.js';
import { throwGrenade } from './combat.js';
import { clampPlayer } from './player.js';
import { renderHud, refreshTexts, setPerkHandler } from './ui.js';
import { initRender, resizeCanvas, render } from './render.js';
import { toggleLanguage } from './i18n.js';
import { sfx, toggleMute } from './audio.js';
import { runLoader } from './loader.js';

initRender();
new ResizeObserver(() => {
  resizeCanvas();
  clampPlayer();
}).observe(stage);

const weaponIds = Object.keys(WEAPONS);
setPerkHandler(choosePerk);

initInput(stage, canvas, {
  onGesture: () => sfx.unlock(),
  onReload: () => { if (state.phase === 'playing') startReload(); },
  // Touches 1/2/3 : changer d'arme en jeu, choisir une amélioration sur l'écran d'amélioration.
  onSwitch: (id) => {
    if (state.phase === 'playing') switchWeapon(id);
    else if (state.phase === 'perk') choosePerk(weaponIds.indexOf(id));
  },
  onCycle: () => { if (state.phase === 'playing') cycleWeapon(); },
  onGrenade: () => throwGrenade(),
  onPause: togglePause,
  onConfirm: () => { if (!$('loader')) confirm(); },
});

// Boutons : on retire le focus pour que Espace / Entrée ne les réactivent pas.
const click = (id, fn) => $(id).addEventListener('click', (e) => { sfx.unlock(); fn(); e.currentTarget.blur(); });
click('btnPause', togglePause);
click('ovBtn', confirm);
click('btnRestart', startGame);
click('btnReload', () => { if (state.phase === 'playing') startReload(); });
click('btnWeapon', () => { if (state.phase === 'playing') cycleWeapon(); });
click('btnGrenade', () => throwGrenade());
click('btnMute', () => { toggleMute(); refreshTexts(); });
click('btnLang', () => { toggleLanguage(); refreshTexts(); });

// Pause automatique quand la page perd le focus.
window.addEventListener('blur', () => { resetInput(); if (state.phase === 'playing') togglePause(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.phase === 'playing') togglePause();
});

initGame();
refreshTexts();
runLoader(); // sprites PNG optionnels : passer leurs chemins ici (voir MESHY.md)

// Outil de débogage (uniquement avec ?debug dans l'URL) : permet de tester des situations précises.
if (new URLSearchParams(location.search).has('debug')) {
  Promise.all([import('./waves.js'), import('./zombies.js'), import('./pickups.js')]).then(([w, z, p]) => {
    window.__dbg = { state, startWave: w.startWave, spawnZombie: z.spawnZombie, spawnPickup: p.spawnPickup, choosePerk };
  });
}

let previous = performance.now();
function frame(now) {
  const dt = Math.min((now - previous) / 1000, 0.05);
  previous = now;
  if (state.phase === 'playing') update(dt);
  renderHud();
  render(now / 1000);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
