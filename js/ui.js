// Interface HTML : HUD du haut, messages, écrans (démarrage / pause / game over / améliorations).
import { $ } from './dom.js';
import { state } from './state.js';
import { PERKS, COMBO, SYNERGIES } from './config.js';
import { t, applyStaticTexts } from './i18n.js';
import { renderScreen } from './screens.js';
import { modeOf } from './weapons.js';
import { synergyFor } from './perks.js';
import { ZONES, ZONE_ORDER } from './citymap.js';

const els = {
  health: $('health'), healthFill: $('healthFill'), score: $('score'), wave: $('wave'), combo: $('combo'),
  ammo: $('ammo'), reserve: $('reserve'), wname: $('wname'), btnReload: $('btnReload'),
  waveLbl: $('waveLbl'), buffs: $('buffs'), btnGrenade: $('btnGrenade'), grenadeCd: $('grenadeCd'),
  toast: $('toast'), banner: $('banner'), coins: $('coins'),
  btnDash: $('btnDash'), dashCd: $('dashCd'),
  btnMode: $('btnMode'),
  perkOverlay: $('perkOverlay'), perkList: $('perkList'),
};

function setText(el, v) {
  if (el._v !== v) { el._v = v; el.textContent = v; }
}

const mapBtn = typeof document !== 'undefined' ? document.getElementById('btnMap') : null;

export function renderHud() {
  if (mapBtn) { const on = state.mode === 'city' && state.phase === 'playing' ? 'block' : 'none'; if (mapBtn._d !== on) { mapBtn._d = on; mapBtn.style.display = on; } }
  const p = state.player;
  const w = state.weapons[state.current];
  setText(els.health, Math.ceil(p.hp));
  const pct = `${Math.round((p.hp / state.stats.maxHp) * 100)}%`;
  if (els.healthFill._w !== pct) { els.healthFill._w = pct; els.healthFill.style.width = pct; }
  setText(els.score, state.score);
  if (state.mode === 'city' && state.city) {
    setText(els.waveLbl, ZONES[state.city.zone || 'res'].icon);
    setText(els.wave, `🚩${Object.keys(state.city.cps).length}/${ZONE_ORDER.length}`);
  } else {
    setText(els.waveLbl, t('wave'));
    setText(els.wave, state.mode === 'campaign' && state.level ? `${Math.max(1, state.waveNo)}/${state.level.waves}` : (state.wave || 1));
  }
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
  const ct = c.count >= 3 ? Math.max(0, Math.round((c.timer / COMBO.window) * 100)) : 0;
  if (els.combo._t !== ct) { els.combo._t = ct; els.combo.style.setProperty('--ct', `${ct}%`); }
  setText(els.coins, `🪙 ${Math.floor(state.coins)}`);

  // bonus temporaires actifs
  const b = state.buffs;
  const parts = [];
  if (b.rage > 0) parts.push(`⚡${Math.ceil(b.rage)}`);
  if (b.shield > 0) parts.push(`🛡️${Math.ceil(b.shield)}`);
  if (b.freeze > 0) parts.push(`❄️${Math.ceil(b.freeze)}`);
  if (state.ammoFx) parts.push(`${state.ammoFx.kind === 'fire' ? '🔥' : '🌩️'}${Math.ceil(state.ammoFx.t)}`);
  setText(els.buffs, parts.join('  '));

  // grenade : anneau de recharge
  const cd = state.grenadeCd > 0 ? Math.round((state.grenadeCd / state.grenadeMax) * 100) : 0;
  if (els.grenadeCd._v !== cd) {
    els.grenadeCd._v = cd;
    els.grenadeCd.style.setProperty('--cd', `${cd}%`);
    els.btnGrenade.classList.toggle('ready', cd === 0);
  }
  // esquive : anneau de recharge
  const dc = state.dash.cd > 0 ? Math.round((state.dash.cd / (state.dash.max || 1)) * 100) : 0;
  if (els.dashCd._v !== dc) {
    els.dashCd._v = dc;
    els.dashCd.style.setProperty('--cd', `${dc}%`);
    els.btnDash.classList.toggle('ready', dc === 0);
  }
}

// Grande annonce au centre de l'écran (séries de kills, événements, objectifs). tone : '' | streak | alert | good | obj
let bannerTimer = null;
export function banner(text, tone = '', ms = 1700) {
  const b = els.banner;
  if (!b) return;
  b.textContent = text;
  b.className = `banner ${tone}`;
  void b.offsetWidth;                     // relance l'animation CSS
  b.classList.add('show');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => b.classList.remove('show'), ms);
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
    const risk = !!PERKS[id].risk;
    const syn = synergyFor(id);
    const btn = el('button', `perk${risk ? ' risk' : ''}${syn ? ' syn' : ''}`);
    btn.type = 'button';
    const txt = el('span', 'pt');
    txt.appendChild(el('b', '', t(`perk_${id}_n`)));
    txt.appendChild(el('small', '', t(`perk_${id}_d`)));
    txt.appendChild(el('em', '', `${t('level')} ${lv + 1}/${PERKS[id].max}${risk ? ` · ⚠ ${t('riskTag')}` : ''}`));
    if (syn) txt.appendChild(el('span', 'syn-tag', `${SYNERGIES[syn].icon} ${t('synTag', t(`syn_${syn}_n`))}`));
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
