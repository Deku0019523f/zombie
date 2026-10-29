// Interface HTML : HUD du haut, messages, écrans (démarrage / pause / game over / améliorations).
import { $ } from './dom.js';
import { state } from './state.js';
import { PERKS, COMBO } from './config.js';
import { t, applyStaticTexts, getLanguage } from './i18n.js';
import { isMuted } from './audio.js';

const els = {
  health: $('health'), healthFill: $('healthFill'), score: $('score'), wave: $('wave'), combo: $('combo'),
  ammo: $('ammo'), reserve: $('reserve'), wname: $('wname'), btnReload: $('btnReload'),
  buffs: $('buffs'), btnGrenade: $('btnGrenade'), grenadeCd: $('grenadeCd'),
  toast: $('toast'),
  overlay: $('overlay'), ovTitle: $('ovTitle'), ovKicker: $('ovKicker'), ovText: $('ovText'), ovExtra: $('ovExtra'), ovHint: $('ovHint'),
  ovBtn: $('ovBtn'), btnRestart: $('btnRestart'), btnLang: $('btnLang'), btnMute: $('btnMute'),
  perkOverlay: $('perkOverlay'), perkList: $('perkList'),
};

function setText(el, v) {
  if (el._v !== v) { el._v = v; el.textContent = v; }
}

const isTouch = () => typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;

export function renderHud() {
  const p = state.player;
  const w = state.weapons[state.current];
  setText(els.health, Math.ceil(p.hp));
  const pct = `${Math.round((p.hp / state.stats.maxHp) * 100)}%`;
  if (els.healthFill._w !== pct) { els.healthFill._w = pct; els.healthFill.style.width = pct; }
  setText(els.score, state.score);
  setText(els.wave, state.wave || 1);
  setText(els.ammo, state.reload > 0 ? '…' : w.mag);
  setText(els.reserve, w.reserve === Infinity ? '/∞' : `/${w.reserve}`);
  setText(els.wname, t(`weapon_${state.current}`));
  els.btnReload.classList.toggle('busy', state.reload > 0);

  // combo : s'affiche à partir de 3 kills d'affilée
  const c = state.combo;
  const mult = Math.min(COMBO.max, 1 + Math.floor(c.count / COMBO.step));
  setText(els.combo, c.count >= 3 ? `${t('combo')} x${mult} · ${c.count}` : '');

  // bonus temporaires actifs
  const b = state.buffs;
  const parts = [];
  if (b.rage > 0) parts.push(`⚡${Math.ceil(b.rage)}`);
  if (b.shield > 0) parts.push(`🛡️${Math.ceil(b.shield)}`);
  if (b.freeze > 0) parts.push(`❄️${Math.ceil(b.freeze)}`);
  setText(els.buffs, parts.join('  '));

  // grenade : anneau de recharge
  const cd = state.grenadeCd > 0 ? Math.round((state.grenadeCd / state.grenadeMax) * 100) : 0;
  if (els.grenadeCd._v !== cd) {
    els.grenadeCd._v = cd;
    els.grenadeCd.style.setProperty('--cd', `${cd}%`);
    els.btnGrenade.classList.toggle('ready', cd === 0);
  }
}

let toastTimer = null;
export function toast(text, ms = 1800) {
  els.toast.textContent = text;
  els.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove('show'), ms);
}

// ---- Overlay (menu / pause / game over) ----
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
  const isMenu = kind === 'ready';
  els.overlay.classList.toggle('menu', isMenu);
  els.ovKicker.classList.toggle('hidden', !isMenu);
  els.ovKicker.textContent = isMenu ? t('startKicker') : '';
  if (isMenu && title.includes('|')) {
    const [a, b] = title.split('|');
    els.ovTitle.innerHTML = '';
    const l1 = document.createElement('span'); l1.textContent = a;
    const l2 = document.createElement('span'); l2.textContent = b; l2.className = 'accent';
    els.ovTitle.append(l1, l2);
  } else {
    els.ovTitle.textContent = title;
  }
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

// ---- Écran d'amélioration ----
let perkHandler = null;
export const setPerkHandler = (fn) => { perkHandler = fn; };

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

export function showPerks(choices) {
  els.perkList.textContent = '';
  choices.forEach((id, i) => {
    const lv = state.perks[id] || 0;
    const btn = el('button', 'perk');
    btn.type = 'button';
    const txt = el('span', 'pt');
    txt.appendChild(el('b', '', t(`perk_${id}_n`)));
    txt.appendChild(el('small', '', t(`perk_${id}_d`)));
    txt.appendChild(el('em', '', `${t('level')} ${lv + 1}/${PERKS[id].max}`));
    btn.appendChild(el('span', 'pi', PERKS[id].icon));
    btn.appendChild(txt);
    btn.appendChild(el('kbd', '', String(i + 1)));
    btn.addEventListener('click', () => { if (perkHandler) perkHandler(i); });
    els.perkList.appendChild(btn);
  });
  els.perkOverlay.classList.remove('hidden');
}

export function hidePerks() {
  els.perkOverlay.classList.add('hidden');
}

// Textes dépendant de la langue (appelé au démarrage et au changement de langue).
export function refreshTexts() {
  applyStaticTexts();
  els.btnLang.textContent = getLanguage() === 'fr' ? 'EN' : 'FR';
  els.btnMute.textContent = isMuted() ? '🔇' : '🔊';
  renderOverlay();
}
