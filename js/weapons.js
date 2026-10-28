// Armes : tir, rechargement temporisé, changement d'arme.
import { WEAPONS } from './config.js';
import { state } from './state.js';
import { input } from './input.js';
import { sfx } from './audio.js';
import { makeEl } from './dom.js';

const def = () => WEAPONS[state.current];
const cur = () => state.weapons[state.current];

export function switchWeapon(id) {
  const w = state.weapons[id];
  if (!w || !w.unlocked || state.current === id) return false;
  state.current = id;
  state.reload = 0;        // changer d'arme annule le rechargement
  state.cooldown = 0.15;
  sfx.switch();
  return true;
}

export function startReload() {
  const d = def();
  const w = cur();
  if (state.reload > 0 || w.mag >= d.mag || w.reserve <= 0) return;
  state.reload = d.reload;
  sfx.reload();
}

function finishReload() {
  const d = def();
  const w = cur();
  const take = Math.min(d.mag - w.mag, w.reserve);
  w.mag += take;
  if (w.reserve !== Infinity) w.reserve -= take;
  state.reload = 0;
}

function shoot() {
  if (state.cooldown > 0 || state.reload > 0) return;
  const d = def();
  const w = cur();
  input.clickBuffer = 0;

  if (w.mag <= 0) {
    if (w.reserve > 0) startReload();
    else { state.cooldown = 0.3; sfx.empty(); }
    return;
  }

  w.mag--;
  state.cooldown = d.rate;
  const p = state.player;
  for (let i = 0; i < d.pellets; i++) {
    const off = d.pellets > 1
      ? (i / (d.pellets - 1) - 0.5) * d.spread * 2 + (Math.random() - 0.5) * 0.08
      : (Math.random() - 0.5) * d.spread;
    const a = p.angle + off;
    state.bullets.push({
      x: p.x + Math.cos(p.angle) * 18,
      y: p.y + Math.sin(p.angle) * 18,
      vx: Math.cos(a) * d.speed,
      vy: Math.sin(a) * d.speed,
      life: d.life,
      dmg: d.damage,
      dead: false,
      el: makeEl('entity bullet'),
    });
  }
  sfx[d.sound]();
  if (w.mag === 0) startReload(); // rechargement automatique
}

export function updateWeapons(dt) {
  state.cooldown = Math.max(0, state.cooldown - dt);
  input.clickBuffer = Math.max(0, input.clickBuffer - dt);

  if (state.reload > 0) {
    state.reload -= dt;
    if (state.reload <= 0) finishReload();
  }

  // Arme à réserve vide et chargeur vide : retour au pistolet.
  const w = cur();
  if (state.current !== 'pistol' && w.mag === 0 && w.reserve === 0) {
    switchWeapon('pistol');
    return;
  }

  const wants = def().auto ? input.firing : input.clickBuffer > 0;
  if (wants) shoot();
}
