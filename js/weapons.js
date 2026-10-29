// Armes : tir, rechargement temporisé, changement d'arme. Tient compte des améliorations et de la rage.
import { WEAPONS } from './config.js';
import { state } from './state.js';
import { input, isFiring } from './input.js';
import { sfx } from './audio.js';
import { addShake } from './effects.js';

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

// Passe à l'arme débloquée suivante (bouton tactile / touche E).
export function cycleWeapon() {
  const ids = Object.keys(WEAPONS).filter((id) => state.weapons[id].unlocked);
  const next = ids[(ids.indexOf(state.current) + 1) % ids.length];
  return switchWeapon(next);
}

export function startReload() {
  const d = def();
  const w = cur();
  if (state.reload > 0 || w.mag >= d.mag || w.reserve <= 0) return;
  state.reload = d.reload * state.stats.reload;
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

  const rage = state.buffs.rage > 0;
  w.mag--;
  state.cooldown = d.rate * state.stats.rate * (rage ? 0.5 : 1);
  state.muzzle = 0.06;
  if (d.pellets > 1) addShake(2.5);
  const p = state.player;
  const ox = p.x + Math.cos(p.angle) * (d.gunLen + 6);
  const oy = p.y + Math.sin(p.angle) * (d.gunLen + 6);
  for (let i = 0; i < d.pellets; i++) {
    const off = d.pellets > 1
      ? (i / (d.pellets - 1) - 0.5) * d.spread * 2 + (Math.random() - 0.5) * 0.08
      : (Math.random() - 0.5) * d.spread;
    const a = p.angle + off;
    state.bullets.push({
      x: ox, y: oy,
      vx: Math.cos(a) * d.speed,
      vy: Math.sin(a) * d.speed,
      life: d.life,
      dmg: d.damage * state.stats.dmg * (rage ? 1.5 : 1),
      pierce: state.stats.pierce,
      hit: [],
      dead: false,
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

  // Maintenir le bouton / clic / Espace = tir continu, limité par la cadence de l'arme.
  if (isFiring() || input.clickBuffer > 0) shoot();
}
