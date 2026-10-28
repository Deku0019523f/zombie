// Interface HTML : HUD du haut, messages, écrans (démarrage / pause / game over).
import { $ } from './dom.js';
import { state } from './state.js';
import { PLAYER } from './config.js';
import { t, applyStaticTexts, getLanguage } from './i18n.js';
import { isMuted } from './audio.js';

const els = {
  health: $('health'), healthFill: $('healthFill'), score: $('score'), wave: $('wave'),
  ammo: $('ammo'), reserve: $('reserve'), wname: $('wname'), btnReload: $('btnReload'),
  toast: $('toast'),
  overlay: $('overlay'), ovTitle: $('ovTitle'), ovText: $('ovText'), ovExtra: $('ovExtra'), ovHint: $('ovHint'),
  ovBtn: $('ovBtn'), btnRestart: $('btnRestart'), btnLang: $('btnLang'), btnMute: $('btnMute'),
};

function setText(el, v) {
  if (el._v !== v) { el._v = v; el.textContent = v; }
}

const isTouch = () => typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;

export function renderHud() {
  const p = state.player;
  const w = state.weapons[state.current];
  setText(els.health, Math.ceil(p.hp));
  const pct = `${Math.round((p.hp / PLAYER.maxHealth) * 100)}%`;
  if (els.healthFill._w !== pct) { els.healthFill._w = pct; els.healthFill.style.width = pct; }
  setText(els.score, state.score);
  setText(els.wave, state.wave || 1);
  setText(els.ammo, state.reload > 0 ? '…' : w.mag);
  setText(els.reserve, w.reserve === Infinity ? '/∞' : `/${w.reserve}`);
  setText(els.wname, t(`weapon_${state.current}`));
  els.btnReload.classList.toggle('busy', state.reload > 0);
}

let toastTimer = null;
export function toast(text, ms = 1800) {
  els.toast.textContent = text;
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
  let hint = '';
  let btn = '';
  if (kind === 'ready') {
    title = t('startTitle'); text = t('startText'); btn = t('play');
    if (state.best > 0) extra = t('bestIs', state.best);
    hint = t(isTouch() ? 'hintTouch' : 'hintKeys');
  } else if (kind === 'paused') {
    title = t('paused'); btn = t('resume');
    hint = t(isTouch() ? 'hintTouch' : 'hintKeys');
  } else if (kind === 'over') {
    title = t('overTitle');
    text = t('overText', state.score, state.wave);
    extra = state.newBest ? t('newBest') : t('bestIs', state.best);
    btn = t('again');
  }
  els.ovTitle.textContent = title;
  els.ovText.textContent = text;
  els.ovExtra.textContent = extra;
  els.ovHint.textContent = hint;
  els.ovBtn.textContent = btn;
  els.btnRestart.classList.toggle('hidden', kind !== 'paused');
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
  els.btnLang.textContent = getLanguage() === 'fr' ? 'EN' : 'FR';
  els.btnMute.textContent = isMuted() ? '🔇' : '🔊';
  renderOverlay();
}
