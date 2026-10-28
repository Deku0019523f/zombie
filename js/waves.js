// Gestion des vagues : composition, apparition, fin de vague, déblocage d'armes.
import { WAVES, WEAPONS } from './config.js';
import { state } from './state.js';
import { spawnZombie } from './zombies.js';
import { sfx } from './audio.js';
import { toast } from './ui.js';
import { t } from './i18n.js';
import { rand } from './util.js';

function buildQueue(n) {
  const total = WAVES.baseCount + n * WAVES.perWave;
  const pTank = n >= 4 ? Math.min(0.2, 0.04 * (n - 2)) : 0;
  const pRunner = n >= 2 ? Math.min(0.35, 0.06 * n) : 0;
  const list = [];
  for (let i = 0; i < total; i++) {
    const r = Math.random();
    list.push(r < pTank ? 'tank' : r < pTank + pRunner ? 'runner' : 'walker');
  }
  if (n % WAVES.bossEvery === 0) {
    for (let k = 0; k < n / WAVES.bossEvery; k++) list.push('boss');
  }
  return list;
}

export function startWave(n) {
  state.wave = n;
  state.waveState = 'spawning';
  state.queue = buildQueue(n);
  state.spawnTimer = 0.8;

  const isBoss = n % WAVES.bossEvery === 0;
  toast(isBoss ? t('waveBoss', n) : t('waveStart', n), 2000);
  sfx.wave();

  for (const [id, d] of Object.entries(WEAPONS)) {
    const w = state.weapons[id];
    if (!w.unlocked && d.unlock <= n) {
      w.unlocked = true;
      setTimeout(() => toast(t('unlocked', t(`weapon_${id}`)), 2500), 1500);
    }
  }
}

export function updateWaves(dt) {
  if (state.waveState === 'intermission') {
    state.intermission -= dt;
    if (state.intermission <= 0) startWave(state.wave + 1);
    return;
  }

  if (state.queue.length) {
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      spawnZombie(state.queue.shift());
      state.spawnTimer = Math.max(0.3, 1.2 - state.wave * 0.06) * rand(0.8, 1.2);
    }
  } else if (state.zombies.length === 0) {
    const bonus = WAVES.clearBonus * state.wave;
    state.score += bonus;
    state.waveState = 'intermission';
    state.intermission = WAVES.intermission;
    toast(t('waveClear', state.wave, bonus), 2200);
  }
}
