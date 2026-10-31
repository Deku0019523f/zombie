// Interface HTML : HUD du haut, messages, écrans (démarrage / pause / game over / améliorations).
import { $ } from './dom.js';
import { state } from './state.js';
import { PERKS, COMBO } from './config.js';
import { t, applyStaticTexts } from './i18n.js';
import { renderScreen } from './screens.js';
import { modeOf } from './weapons.js';

const els = {
  health: $('health'), healthFill: $('healthFill'), score: $('score'), wave: $('wave'), combo: $('combo'),
  ammo: $('ammo'), reserve: $('reserve'), wname: $('wname'), btnReload: $('btnReload'),
  buffs: $('buffs'), btnGrenade: $('btnGrenade'), grenadeCd: $('grenadeCd'),
  toast: $('toast'),
  btnMode: $('btnMode'),
  perkOverlay: $('perkOverlay'), perkList: $('perkList'),
};

function setText(el, v) {
  if (el._v !== v) { el._v = v; el.textContent = v; }
}

export function renderHud() {
  const p = state.player;
  const w = state.weapons[state.current];
  setText(els.health, Math.ceil(p.hp));
  const pct = `${Math.round((p.hp / state.stats.maxHp) * 100)}%`;
  if (els.healthFill._w !== pct) { els.healthFill._w = pct; els.healthFill.style.width = pct; }
  setText(els.score, state.score);
  setText(els.wave, state.mode === 'campaign' && state.level ? `${Math.max(1, state.waveNo)}/${state.level.waves}` : (state.wave || 1));
  setText(els.ammo, state.reload > 0 ? '…' : w.mag);
  setText(els.reserve, w.reserve === Infinity ? '/∞' : `/${w.reserve}`);
  const mode = modeOf();
  setText(els.wname, `${t(`weapon_${state.current}`)} · ${t(`mode_${mode}`)}`);
  setText(els.btnMode, t(`mode_${mode}_s`));
  els.btnMode.classList.toggle('charging', state.charge > 0);
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

// Textes dépendant de la langue (appelé au démarrage et au changement de langue / de réglage).
export function refreshTexts() {
  applyStaticTexts();
  renderScreen();
}
