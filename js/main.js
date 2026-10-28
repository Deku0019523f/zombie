// Point d'entrée : branche le DOM, les entrées et la boucle de jeu.
import { arena, $ } from './dom.js';
import { state } from './state.js';
import { input, initInput, resetInput } from './input.js';
import { initGame, startGame, togglePause, confirm, update } from './game.js';
import { switchWeapon, startReload } from './weapons.js';
import { clampPlayer } from './player.js';
import { render, refreshTexts } from './ui.js';
import { toggleLanguage } from './i18n.js';
import { sfx, toggleMute } from './audio.js';

// Taille de l'arène suivie en continu (rotation d'écran, redimensionnement).
function resize() {
  state.w = arena.clientWidth;
  state.h = arena.clientHeight;
  clampPlayer();
}
new ResizeObserver(resize).observe(arena);
resize();

input.mouse.x = state.w * 0.75;
input.mouse.y = state.h / 2;

initInput(arena, {
  onGesture: () => sfx.unlock(),
  onReload: () => { if (state.phase === 'playing') startReload(); },
  onSwitch: (id) => { if (state.phase === 'playing') switchWeapon(id); },
  onPause: togglePause,
  onConfirm: confirm,
});

// Boutons : on retire le focus pour que Espace / Entrée ne les réactivent pas.
const click = (id, fn) => $(id).addEventListener('click', (e) => { sfx.unlock(); fn(); e.currentTarget.blur(); });
click('restart', startGame);
click('ovBtn', confirm);
click('btnPause', togglePause);
click('btnReload', () => { if (state.phase === 'playing') startReload(); });
click('btnMute', () => { toggleMute(); refreshTexts(); });
click('btnLang', () => { toggleLanguage(); refreshTexts(); });
document.querySelectorAll('[data-weapon]').forEach((b) => {
  b.addEventListener('click', (e) => {
    if (state.phase === 'playing') switchWeapon(b.dataset.weapon);
    e.currentTarget.blur();
  });
});

// Pause automatique quand la page perd le focus.
window.addEventListener('blur', () => { resetInput(); if (state.phase === 'playing') togglePause(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.phase === 'playing') togglePause();
});

initGame();
refreshTexts();

let previous = performance.now();
function frame(now) {
  const dt = Math.min((now - previous) / 1000, 0.05);
  previous = now;
  if (state.phase === 'playing') update(dt);
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
