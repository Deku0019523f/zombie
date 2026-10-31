// Gestion des vagues : thèmes, composition, apparition, fin de vague, déblocage d'armes.
import { WAVES, WEAPONS, THEMES, SPAWN_TABLE } from './config.js';
import { state } from './state.js';
import { spawnZombie } from './zombies.js';
import { spawnSupply } from './pickups.js';
import { sfx } from './audio.js';
import { toast } from './ui.js';
import { t } from './i18n.js';
import { rand } from './util.js';

// Nombre de boss de la vague : survie = un de plus toutes les 5 vagues ; campagne = sur la dernière vague du niveau.
function bossCount(n) {
  if (state.mode === 'campaign') return state.waveNo === state.level.waves ? state.level.boss : 0;
  return n % WAVES.bossEvery === 0 ? n / WAVES.bossEvery : 0;
}

// Thème de la vague : campagne = défini par le niveau ; survie = normal au début et sur les boss, sinon aléatoire (jamais 2 fois de suite).
function chooseTheme(n) {
  if (state.mode === 'campaign') return state.level.themes[state.waveNo - 1] || 'normal';
  if (n <= 2 || n % WAVES.bossEvery === 0) return 'normal';
  const ids = Object.keys(THEMES).filter((id) => id !== state.theme);
  return ids[Math.floor(Math.random() * ids.length)];
}

function pickType(n, theme) {
  const opts = [];
  let total = 0;
  for (const e of SPAWN_TABLE) {
    if (n < e.from) continue;
    if (theme.only && !theme.only.includes(e.type)) continue;
    const w = e.w(n) + (theme.boost?.[e.type] ?? 0);
    if (w > 0) { opts.push([e.type, w]); total += w; }
  }
  let r = Math.random() * total;
  for (const [type, w] of opts) {
    r -= w;
    if (r <= 0) return type;
  }
  return 'walker';
}

function buildQueue(n, theme) {
  const total = Math.max(3, Math.round((WAVES.baseCount + n * WAVES.perWave) * (theme.count ?? 1)));
  const list = [];
  for (let i = 0; i < total; i++) list.push(pickType(n, theme));
  for (let k = 0; k < bossCount(n); k++) list.push('boss');
  return list;
}

export function startWave(n) {
  state.waveNo = state.mode === 'campaign' ? n - state.level.from + 1 : n;
  const id = chooseTheme(n);
  const theme = THEMES[id];
  state.wave = n;
  state.theme = id;
  state.dark = !!theme.dark;
  state.spawnMult = theme.spawn ?? 1;
  state.waveState = 'spawning';
  state.queue = buildQueue(n, theme);
  state.spawnTimer = 0.8;

  const isBoss = bossCount(n) > 0;
  if (isBoss) toast(t('waveBoss', state.waveNo), 2200);
  else if (id === 'normal') toast(t('waveStart', state.waveNo), 2000);
  else toast(t('waveTheme', state.waveNo, t(`theme_${id}`)), 2400);
  sfx.wave();

  if (theme.supply) spawnSupply(theme.supply);

  for (const [wid, d] of Object.entries(WEAPONS)) {
    const w = state.weapons[wid];
    if (!w.unlocked && d.unlock <= n) {
      w.unlocked = true;
      setTimeout(() => toast(t('unlocked', t(`weapon_${wid}`)), 2500), 1500);
    }
  }
}

export function updateWaves(dt) {
  switch (state.waveState) {
    case 'intermission':
      state.intermission -= dt;
      if (state.intermission <= 0) startWave(state.wave + 1);
      break;
    case 'spawning':
      if (state.queue.length) {
        state.spawnTimer -= dt;
        if (state.spawnTimer <= 0) {
          spawnZombie(state.queue.shift());
          state.spawnTimer = Math.max(0.25, 1.1 - state.wave * 0.05) * state.spawnMult * rand(0.8, 1.2);
        }
      } else if (state.zombies.length === 0) {
        const bonus = WAVES.clearBonus * state.wave;
        state.score += bonus;
        state.waveState = 'cleared';
        state.clearTimer = WAVES.clearDelay;
        state.dark = false;
        toast(t('waveClear', state.waveNo, bonus), 2200);
        if (state.mode === 'campaign' && state.waveNo >= state.level.waves) {
          state.waveState = 'won';           // dernière vague du niveau : victoire
          state.clearTimer = 1.8;
        }
      }
      break;
    case 'cleared':
      state.clearTimer -= dt;
      if (state.clearTimer <= 0) {
        state.waveState = 'perkwait';
        state.pendingPerk = true;   // game.js ouvre l'écran d'amélioration
      }
      break;
    case 'won':
      state.clearTimer -= dt;
      if (state.clearTimer <= 0) { state.waveState = 'ended'; state.pendingWin = true; }
      break;
    default:                         // 'perkwait' / 'ended' : on attend le choix du joueur
      break;
  }
}
