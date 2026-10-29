// Gestion des vagues : thèmes, composition, apparition, fin de vague, déblocage d'armes.
import { WAVES, WEAPONS, THEMES, SPAWN_TABLE } from './config.js';
import { state } from './state.js';
import { spawnZombie } from './zombies.js';
import { spawnSupply } from './pickups.js';
import { sfx } from './audio.js';
import { toast } from './ui.js';
import { t } from './i18n.js';
import { rand } from './util.js';

// Thème de la vague : normal au début et sur les vagues de boss, sinon tiré au hasard (jamais 2 fois de suite).
function chooseTheme(n) {
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
  if (n % WAVES.bossEvery === 0) {
    for (let k = 0; k < n / WAVES.bossEvery; k++) list.push('boss');
  }
  return list;
}

export function startWave(n) {
  const id = chooseTheme(n);
  const theme = THEMES[id];
  state.wave = n;
  state.theme = id;
  state.dark = !!theme.dark;
  state.spawnMult = theme.spawn ?? 1;
  state.waveState = 'spawning';
  state.queue = buildQueue(n, theme);
  state.spawnTimer = 0.8;

  const isBoss = n % WAVES.bossEvery === 0;
  if (isBoss) toast(t('waveBoss', n), 2200);
  else if (id === 'normal') toast(t('waveStart', n), 2000);
  else toast(t('waveTheme', n, t(`theme_${id}`)), 2400);
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
        toast(t('waveClear', state.wave, bonus), 2200);
      }
      break;
    case 'cleared':
      state.clearTimer -= dt;
      if (state.clearTimer <= 0) {
        state.waveState = 'perkwait';
        state.pendingPerk = true;   // game.js ouvre l'écran d'amélioration
      }
      break;
    default:                         // 'perkwait' : on attend le choix du joueur
      break;
  }
}
