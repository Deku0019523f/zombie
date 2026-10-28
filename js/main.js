// Point d'entrée : branche le DOM, les entrées et la boucle de jeu.
import { stage, canvas, $ } from './dom.js';
import { state } from './state.js';
import { initInput, resetInput } from './input.js';
import { initGame, startGame, togglePause, confirm, update } from './game.js';
import { switchWeapon, cycleWeapon, startReload } from './weapons.js';
import { clampPlayer } from './player.js';
import { renderHud, refreshTexts } from './ui.js';
import { initRender, resizeCanvas, render } from './render.js';
import { toggleLanguage } from './i18n.js';
import { sfx, toggleMute } from './audio.js';

initRender();
new ResizeObserver(() => {
  resizeCanvas();
  clampPlayer();
}).observe(stage);

initInput(stage, canvas, {
  onGesture: () => sfx.unlock(),
  onReload: () => { if (state.phase === 'playing') startReload(); },
  onSwitch: (id) => { if (state.phase === 'playing') switchWeapon(id); },
  onCycle: () => { if (state.phase === 'playing') cycleWeapon(); },
  onPause: togglePause,
  onConfirm: confirm,
});

// Boutons : on retire le focus pour que Espace / Entrée ne les réactivent pas.
const click = (id, fn) => $(id).addEventListener('click', (e) => { sfx.unlock(); fn(); e.currentTarget.blur(); });
click('btnPause', togglePause);
click('ovBtn', confirm);
click('btnRestart', startGame);
click('btnReload', () => { if (state.phase === 'playing') startReload(); });
click('btnWeapon', () => { if (state.phase === 'playing') cycleWeapon(); });
click('btnMute', () => { toggleMute(); refreshTexts(); });
click('btnLang', () => { toggleLanguage(); refreshTexts(); });

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
  renderHud();
  render(now / 1000);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
