// Événements surprise en cours de vague : embuscade, noir soudain, caisse larguée.
import { EVENTS } from './config.js';
import { state } from './state.js';
import { rand } from './util.js';
import { sfx } from './audio.js';
import { banner } from './ui.js';
import { t } from './i18n.js';
import { spawnZombie } from './zombies.js';
import { spawnPickup } from './pickups.js';
import { freeSpot } from './spots.js';

// Programme (ou non) l'événement de la vague.
export function scheduleEvent(n, isBossWave) {
  state.eventT = n >= EVENTS.from && !isBossWave ? rand(EVENTS.delay[0], EVENTS.delay[1]) : 0;
}

function edgePos(side) {
  const { w, h } = state;
  if (side === 0) return { x: -14, y: rand(40, h) };
  if (side === 1) return { x: w + 14, y: rand(40, h) };
  if (side === 2) return { x: rand(0, w), y: 6 };
  return { x: rand(0, w), y: h + 14 };
}

function pickEvent() {
  const e = Object.entries(EVENTS.weights);
  let r = Math.random() * e.reduce((a, [, w]) => a + w, 0);
  for (const [id, w] of e) {
    r -= w;
    if (r <= 0) return id;
  }
  return 'ambush';
}

export function fireEvent(id = pickEvent()) {
  if (id === 'ambush') {
    const n = Math.min(12, EVENTS.ambushBase + Math.floor(state.wave / 3));
    for (let i = 0; i < n; i++) {
      const type = state.wave >= 4 && Math.random() < 0.2 ? 'exploder' : state.wave >= 2 && Math.random() < 0.4 ? 'runner' : 'walker';
      spawnZombie(type, { ...edgePos(i % 4), elite: false });
    }
    banner(t('evAmbush'), 'alert');
    sfx.alert();
  } else if (id === 'blackout') {
    state.dark = true;
    state.darkT = EVENTS.blackoutDur;
    banner(t('evBlackout'), 'alert');
    sfx.alert();
  } else if (id === 'airdrop') {
    const s = freeSpot();
    spawnPickup('drop', s.x, s.y, EVENTS.airdropLife);
    banner(t('evAirdrop'), 'good');
    sfx.pickup();
  }
  state.lastEvent = id;
}

export function updateEvents(dt) {
  if (state.darkT > 0) {
    state.darkT -= dt;
    if (state.darkT <= 0 && state.theme !== 'night') state.dark = false;
  }
  if (state.eventT <= 0 || state.waveState !== 'spawning') return;
  state.eventT -= dt;
  if (state.eventT > 0) return;
  state.eventT = 0;
  fireEvent();
}
