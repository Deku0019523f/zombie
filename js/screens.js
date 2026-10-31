// Écrans hors partie : menu principal, carte du parcours, réglages, aide, pause, victoire, défaite.
// Tout est construit en JS dans #ovCard ; les actions de jeu (démarrer, reprendre…) sont injectées par main.js.
import { $ } from './dom.js';
import { state } from './state.js';
import { WEAPONS } from './config.js';
import { LEVELS, STAR_RULES } from './campaign.js';
import { t, getLanguage, toggleLanguage } from './i18n.js';
import { isMuted, toggleMute } from './audio.js';
import { getProgress, clearProgress, setSettings } from './storage.js';
import { cycleMode, modeOf } from './weapons.js';

export const VERSION = '2.4.0';

let actions = {};
export const setScreenActions = (a) => { actions = a; };

let kind = null;          // écran affiché (null = aucun)
let stack = [];           // pile de navigation pour « Retour »
let selected = 1;         // niveau sélectionné sur la carte
let confirmReset = false;

const isTouch = () => typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
const totalStars = (p) => Object.values(p.stars).reduce((a, b) => a + b, 0);

// ---- Petits utilitaires DOM ----
function h(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
function button(cls, text, fn) {
  const b = h('button', cls, text);
  b.type = 'button';
  b.addEventListener('click', (e) => {
    if (actions.gesture) actions.gesture();
    fn();
    if (e.currentTarget && e.currentTarget.blur) e.currentTarget.blur();
  });
  return b;
}
function title(card, text, plain = true) {
  const e = h('h2', '', '');
  if (!plain && text.includes('|')) {
    const [a, b] = text.split('|');
    e.append(h('span', '', a), h('span', 'accent', b));
  } else {
    e.textContent = text;
  }
  card.appendChild(e);
  return e;
}
function header(card, label, backFn) {
  const bar = h('div', 'scr-head');
  bar.appendChild(button('back', '◀', backFn));
  bar.appendChild(h('h3', '', label));
  card.appendChild(bar);
  return bar;
}
const starText = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);

// ---- Navigation ----
export function showScreen(k, push = false) {
  if (push && kind) stack.push(kind);
  else if (!push) stack = [];
  kind = k;
  $('overlay').classList.remove('hidden');
  renderScreen();
}

export function hideScreen() {
  kind = null;
  stack = [];
  $('overlay').classList.add('hidden');
}

export const currentScreen = () => kind;

// « Retour » (bouton ◀ ou touche Échap).
export function backScreen() {
  if (!kind || kind === 'main') return false;
  if (stack.length) { kind = stack.pop(); }
  else if (kind === 'campaign') kind = 'main';
  else return false;
  renderScreen();
  return true;
}

// Action principale de l'écran (touche Entrée / Espace).
export function primaryAction() {
  if (kind === 'main') { selected = Math.min(getProgress().unlocked, LEVELS.length); showScreen('campaign', true); }
  else if (kind === 'campaign') playSelected();
  else if (kind === 'paused') actions.resume();
  else if (kind === 'victory') (state.level && state.level.id < LEVELS.length ? actions.start('campaign', state.level.id + 1) : showScreen('campaign'));
  else if (kind === 'over') actions.start(state.mode, state.level && state.level.id);
  else if (kind === 'settings' || kind === 'howto') backScreen();
}

function playSelected() {
  const p = getProgress();
  if (selected <= p.unlocked) actions.start('campaign', selected);
}

// ---- Rendu ----
export function renderScreen() {
  if (!kind) return;
  const ov = $('overlay');
  ov.classList.toggle('menu', kind === 'main');
  ov.classList.toggle('full', kind === 'campaign' || kind === 'settings' || kind === 'howto');
  const card = $('ovCard');
  card.textContent = '';
  card.className = `ov-card ${kind}`;
  const fn = { main, campaign, settings, howto, paused, over, victory }[kind];
  if (fn) fn(card);
}

function main(card) {
  const p = getProgress();
  card.appendChild(h('p', 'ov-kicker', t('startKicker')));
  title(card, t('startTitle'), false);
  card.appendChild(h('p', 'tagline', t('startText')));

  const next = Math.min(p.unlocked, LEVELS.length);
  const b = button('primary big', `▶ ${t('campaign')}`, () => { selected = next; showScreen('campaign', true); });
  b.appendChild(h('small', '', p.unlocked > 1 || totalStars(p) > 0 ? t('continueLvl', next, LEVELS.length, totalStars(p)) : t('newGame')));
  card.appendChild(b);

  const s = button('secondary big', `♾ ${t('survival')}`, () => actions.start('survival'));
  s.appendChild(h('small', '', t('survivalSub', state.best)));
  card.appendChild(s);

  const row = h('div', 'row2');
  row.appendChild(button('secondary', `⚙ ${t('settings')}`, () => showScreen('settings', true)));
  row.appendChild(button('secondary', `? ${t('help')}`, () => showScreen('howto', true)));
  card.appendChild(row);
  card.appendChild(menuTools());
  card.appendChild(h('p', 'ov-hint', `v${VERSION}`));
}

// ---- Carte du parcours ----
const NODE_X = [50, 27, 68, 36, 72, 30, 62, 24, 66, 50];   // positions horizontales (%) des niveaux
const STEP = 92;

function campaign(card) {
  const p = getProgress();
  if (selected > Math.min(p.unlocked, LEVELS.length)) selected = Math.min(p.unlocked, LEVELS.length);
  const bar = header(card, t('mapTitle'), backScreen);
  bar.appendChild(h('span', 'stars-total', `★ ${totalStars(p)}/${LEVELS.length * 3}`));

  const scroll = h('div', 'map-scroll');
  const H = LEVELS.length * STEP + 60;
  const map = h('div', 'map');
  map.style.height = `${H}px`;
  const yOf = (i) => H - 56 - i * STEP;
  const xOf = (i) => NODE_X[i % NODE_X.length];

  // route sinueuse (SVG statique) : la partie déjà parcourue est en orange
  let d = '';
  let done = '';
  LEVELS.forEach((l, i) => {
    const x = (xOf(i) / 100) * 300;
    const y = yOf(i);
    if (i === 0) { d = `M${x} ${y}`; done = `M${x} ${y}`; return; }
    const px = (xOf(i - 1) / 100) * 300;
    const py = yOf(i - 1);
    const seg = ` C${px} ${py - STEP * 0.55} ${x} ${y + STEP * 0.55} ${x} ${y}`;
    d += seg;
    if (i < p.unlocked) done += seg;
  });
  const road = h('div', 'road');
  road.innerHTML = `<svg viewBox="0 0 300 ${H}" preserveAspectRatio="none"><path d="${d}" class="road-base"/><path d="${done}" class="road-done"/></svg>`;
  map.appendChild(road);

  LEVELS.forEach((l, i) => {
    const locked = l.id > p.unlocked;
    const stars = p.stars[l.id] || 0;
    const cls = `node${locked ? ' locked' : ''}${l.id === p.unlocked ? ' current' : ''}${stars ? ' done' : ''}${l.id === selected ? ' sel' : ''}${l.boss ? ' boss' : ''}`;
    const n = button(cls, locked ? '🔒' : l.boss ? '💀' : String(l.id), () => { selected = l.id; renderScreen(); });
    n.style.left = `${xOf(i)}%`;
    n.style.top = `${yOf(i)}px`;
    if (stars) n.appendChild(h('i', 'node-stars', starText(stars)));
    map.appendChild(n);
  });
  scroll.appendChild(map);
  card.appendChild(scroll);

  // fiche du niveau sélectionné
  const l = LEVELS[selected - 1];
  const locked = l.id > p.unlocked;
  const brief = h('div', 'brief');
  brief.appendChild(h('b', '', `${l.id}. ${t(`lvl_${l.id}_n`)}`));
  brief.appendChild(h('p', '', locked ? t('lockedLvl') : t(`lvl_${l.id}_d`)));
  const chips = h('div', 'chips');
  chips.appendChild(h('span', '', t('waveCount', l.waves)));
  if (l.boss) chips.appendChild(h('span', 'warn', `💀 ${t('bossTag', l.boss)}`));
  if (l.themes.includes('night')) chips.appendChild(h('span', '', '🌙'));
  if (l.themes.includes('horde')) chips.appendChild(h('span', '', '🧟'));
  if (l.kit) chips.appendChild(h('span', 'good', t('kitTag', l.kit)));
  brief.appendChild(chips);
  if (!locked && p.best[l.id]) brief.appendChild(h('p', 'small', t('bestLvl', p.best[l.id])));
  brief.appendChild(h('p', 'small', t('starRules')));
  const play = button('primary', `${t('playLevel')} ▶`, playSelected);
  if (locked) play.disabled = true;
  brief.appendChild(play);
  card.appendChild(brief);

  // centre la carte sur le niveau sélectionné
  const target = yOf(selected - 1) - 190;
  scroll.scrollTop = Math.max(0, target);
  if (typeof requestAnimationFrame !== 'undefined') requestAnimationFrame(() => { scroll.scrollTop = Math.max(0, target); });
}

// ---- Réglages ----
function row(label, control, sub) {
  const r = h('div', 'set-row');
  const l = h('div', 'set-label');
  l.appendChild(h('span', '', label));
  if (sub) l.appendChild(h('small', '', sub));
  r.appendChild(l);
  r.appendChild(control);
  return r;
}

function settings(card) {
  header(card, t('settings'), backScreen);
  const body = h('div', 'set-body');

  body.appendChild(row(t('language'), button('tool', getLanguage().toUpperCase(), () => { toggleLanguage(); actions.refresh(); })));
  body.appendChild(row(t('sound'), button('tool', isMuted() ? t('off') : t('on'), () => { toggleMute(); actions.refresh(); })));
  body.appendChild(row(t('rangeRing'), button('tool', state.settings.range ? t('on') : t('off'), () => {
    state.settings.range = !state.settings.range;
    setSettings(state.settings);
    renderScreen();
  })));

  body.appendChild(h('h4', '', t('fireModes')));
  for (const [id, d] of Object.entries(WEAPONS)) {
    const m = modeOf(id);
    body.appendChild(row(t(`weapon_${id}`), button('tool wide', t(`mode_${m}`), () => { cycleMode(id); renderScreen(); }), t(`mode_${m}_d`)));
  }

  const reset = button('secondary danger', confirmReset ? t('resetConfirm') : t('resetProgress'), () => {
    if (!confirmReset) { confirmReset = true; renderScreen(); return; }
    clearProgress();
    confirmReset = false;
    selected = 1;
    renderScreen();
  });
  body.appendChild(reset);
  card.appendChild(body);
}

// ---- Aide ----
function howto(card) {
  header(card, t('help'), backScreen);
  const body = h('div', 'set-body how');
  body.appendChild(h('h4', '', t('howControls')));
  body.appendChild(h('p', '', t(isTouch() ? 'howTouchText' : 'howKeysText')));
  body.appendChild(h('h4', '', t('howModes')));
  const modes = new Set(Object.values(WEAPONS).flatMap((w) => w.modes));
  for (const m of ['semi', 'auto', 'burst', 'charge']) {
    if (!modes.has(m)) continue;
    const r = h('p', 'mode-line');
    r.appendChild(h('b', '', t(`mode_${m}`)));
    r.appendChild(document.createTextNode(` — ${t(`mode_${m}_d`)}`));
    body.appendChild(r);
  }
  body.appendChild(h('h4', '', t('howTips')));
  body.appendChild(h('p', '', t('howTipsText')));
  card.appendChild(body);
}

// ---- Pause / fin de partie ----
function levelLine() {
  return state.mode === 'campaign' && state.level ? `${t('mapTitle')} · ${state.level.id}. ${t(`lvl_${state.level.id}_n`)}` : '';
}

function paused(card) {
  title(card, t('paused'));
  if (state.mode === 'campaign') card.appendChild(h('p', 'ov-extra', levelLine()));
  card.appendChild(button('primary', t('resume'), () => actions.resume()));
  card.appendChild(button('secondary', t('restart'), () => actions.start(state.mode, state.level && state.level.id)));
  card.appendChild(button('secondary', `⚙ ${t('settings')}`, () => showScreen('settings', true)));
  card.appendChild(button('secondary', t('quit'), () => actions.menu()));
}

function over(card) {
  const camp = state.mode === 'campaign' && state.level;
  title(card, camp ? t('defeatTitle') : t('overTitle'));
  if (camp) {
    card.appendChild(h('p', 'ov-extra', levelLine()));
    card.appendChild(h('p', '', t('defeatText', state.level.id, state.waveNo, state.level.waves)));
    card.appendChild(button('primary', t('retry'), () => actions.start('campaign', state.level.id)));
    card.appendChild(button('secondary', t('toMap'), () => showScreen('campaign')));
  } else {
    card.appendChild(h('p', '', t('overText', state.score, state.wave)));
    card.appendChild(h('p', 'ov-extra', state.newBest ? t('newBest') : t('bestIs', state.best)));
    card.appendChild(button('primary', t('again'), () => actions.start('survival')));
  }
  card.appendChild(button('secondary', t('quit'), () => actions.menu()));
}

function victory(card) {
  const last = state.level.id >= LEVELS.length;
  title(card, last ? t('campaignDone') : t('victoryTitle'));
  card.appendChild(h('p', 'ov-extra', levelLine()));
  card.appendChild(h('div', 'big-stars', starText(state.stars)));
  const hp = Math.round((state.player.hp / state.stats.maxHp) * 100);
  card.appendChild(h('p', '', t('victoryText', state.score, hp)));
  if (state.unlockedNew) card.appendChild(h('p', 'ov-extra', t('unlockedLvl', state.level.id + 1)));
  if (state.starsUp) card.appendChild(h('p', 'ov-extra', t('newStars')));
  if (last) card.appendChild(h('p', '', t('campaignDoneText')));
  else card.appendChild(button('primary', `${t('nextLevel')} ▶`, () => actions.start('campaign', state.level.id + 1)));
  card.appendChild(button(last ? 'primary' : 'secondary', t('toMap'), () => { selected = Math.min(state.level.id + 1, LEVELS.length); showScreen('campaign'); }));
  card.appendChild(button('secondary', t('retry'), () => actions.start('campaign', state.level.id)));
  card.appendChild(button('secondary', t('quit'), () => actions.menu()));
}

// Sélectionne un niveau sur la carte (ex. après une victoire).
export const selectLevel = (id) => { selected = id; };
export { STAR_RULES };

// Barre d'outils langue / son du menu principal (affichée sous le menu).
export function menuTools() {
  const box = h('div', 'ov-tools');
  box.appendChild(button('tool', getLanguage() === 'fr' ? 'EN' : 'FR', () => { toggleLanguage(); actions.refresh(); }));
  box.appendChild(button('tool', isMuted() ? '🔇' : '🔊', () => { toggleMute(); actions.refresh(); }));
  return box;
}
