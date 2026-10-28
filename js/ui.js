// Interface : HUD, barre d'armes, messages, écrans (démarrage / pause / game over).
import { $, arena } from './dom.js';
import { state } from './state.js';
import { PLAYER, WEAPONS } from './config.js';
import { t, applyStaticTexts, getLanguage } from './i18n.js';
import { isMuted } from './audio.js';

const els = {
  health: $('health'), healthFill: $('healthFill'), score: $('score'), wave: $('wave'), best: $('best'),
  message: $('message'), toast: $('toast'),
  overlay: $('overlay'), ovTitle: $('ovTitle'), ovText: $('ovText'), ovExtra: $('ovExtra'), ovBtn: $('ovBtn'),
  reloadBtn: $('btnReload'), btnLang: $('btnLang'), btnMute: $('btnMute'),
};

const weaponUI = [...document.querySelectorAll('[data-weapon]')].map((b) => ({
  b, id: b.dataset.weapon, name: b.querySelector('.wname'), ammo: b.querySelector('.wammo'),
}));

function setText(el, v) {
  if (el._v !== v) { el._v = v; el.textContent = v; }
}

export function render() {
  const p = state.player;
  setText(els.health, Math.ceil(p.hp));
  const pct = `${Math.round((p.hp / PLAYER.maxHealth) * 100)}%`;
  if (els.healthFill._w !== pct) { els.healthFill._w = pct; els.healthFill.style.width = pct; }
  setText(els.score, state.score);
  setText(els.wave, state.wave || 1);
  setText(els.best, Math.max(state.best, state.score));

  for (const u of weaponUI) {
    const w = state.weapons[u.id];
    const d = WEAPONS[u.id];
    u.b.classList.toggle('locked', !w.unlocked);
    u.b.classList.toggle('active', state.current === u.id);
    setText(u.ammo, w.unlocked ? `${w.mag}/${w.reserve === Infinity ? '∞' : w.reserve}` : t('lockedAt', d.unlock));
  }
  const d = WEAPONS[state.current];
  setText(els.reloadBtn, state.reload > 0 ? `↻ ${Math.round((1 - state.reload / d.reload) * 100)}%` : '↻ R');

  arena.classList.toggle('hurt', state.hurtFlash > 0);
}

let toastTimer = null;
export function toast(text, ms = 1800) {
  els.toast.textContent = text;
  els.message.textContent = text;
  els.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove('show'), ms);
}

// ---- Overlay ----
let kind = null;

export function renderOverlay() {
  if (!kind) return;
  let title = '';
  let text = '';
  let extra = '';
  let btn = '';
  if (kind === 'ready') {
    title = t('startTitle'); text = t('startText'); btn = t('play');
    if (state.best > 0) extra = t('bestIs', state.best);
  } else if (kind === 'paused') {
    title = t('paused'); btn = t('resume');
  } else if (kind === 'over') {
    title = t('overTitle');
    text = t('overText', state.score, state.wave);
    extra = state.newBest ? t('newBest') : t('bestIs', state.best);
    btn = t('again');
  }
  els.ovTitle.textContent = title;
  els.ovText.textContent = text;
  els.ovExtra.textContent = extra;
  els.ovBtn.textContent = btn;
}

export function showOverlay(k) {
  kind = k;
  renderOverlay();
  els.overlay.classList.remove('hidden');
}

export function hideOverlay() {
  kind = null;
  els.overlay.classList.add('hidden');
}

// Textes dépendant de la langue (appelé au démarrage et au changement de langue).
export function refreshTexts() {
  applyStaticTexts();
  for (const u of weaponUI) u.name.textContent = t(`weapon_${u.id}`);
  els.btnLang.textContent = getLanguage() === 'fr' ? 'EN' : 'FR';
  els.btnMute.textContent = isMuted() ? '🔇' : '🔊';
  els.message.textContent = t('survive');
  renderOverlay();
}
