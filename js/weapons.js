// Armes : modes de tir (semi / auto / rafale / tir chargé), portée, rechargement temporisé, changement d'arme.
// Tient compte des améliorations et de la rage.
import { WEAPONS, FIRE_MODES } from './config.js';
import { state } from './state.js';
import { input, isFiring } from './input.js';
import { sfx } from './audio.js';
import { addShake } from './effects.js';
import { setModes } from './storage.js';

const def = () => WEAPONS[state.current];
const cur = () => state.weapons[state.current];

// ---- Modes de tir ----
export const modeOf = (id = state.current) => state.modes[id] || WEAPONS[id].mode;

// Valide les modes enregistrés (arme ou mode disparu → mode par défaut).
export function loadModes(saved = {}) {
  state.modes = {};
  for (const [id, d] of Object.entries(WEAPONS)) {
    state.modes[id] = d.modes.includes(saved[id]) ? saved[id] : d.mode;
  }
}

export function setMode(weaponId, mode) {
  if (!WEAPONS[weaponId]?.modes.includes(mode)) return false;
  state.modes[weaponId] = mode;
  setModes(state.modes);
  if (weaponId === state.current) cancelFire();
  return true;
}

// Mode suivant pour l'arme donnée (touche F, bouton de mode, menu Réglages).
export function cycleMode(weaponId = state.current) {
  const list = WEAPONS[weaponId].modes;
  const next = list[(list.indexOf(modeOf(weaponId)) + 1) % list.length];
  setMode(weaponId, next);
  sfx.switch();
  return next;
}

// Annule rafale et charge en cours (changement d'arme, pause, fin de partie).
export function cancelFire() {
  state.burst.left = 0;
  state.burst.timer = 0;
  state.charge = 0;
}

export function switchWeapon(id) {
  const w = state.weapons[id];
  if (!w || !w.unlocked || state.current === id) return false;
  state.current = id;
  state.reload = 0;        // changer d'arme annule le rechargement
  state.cooldown = 0.15;
  cancelFire();
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
  cancelFire();
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

// Délai avant le prochain tir (cadence de l'arme x améliorations x mode, divisé par 2 avec la rage).
function delay(m, mult = 1) {
  return def().rate * state.stats.rate * (state.buffs.rage > 0 ? 0.5 : 1) * m.rate * mult;
}

// Une détente : consomme 1 munition et tire les balles. power (0..1) = niveau de charge.
function discharge(m, power = 0) {
  const d = def();
  const w = cur();
  const rage = state.buffs.rage > 0;
  input.clickBuffer = 0;
  w.mag--;
  state.muzzle = 0.06;
  if (d.pellets > 1 || power > 0.6) addShake(2.5 + 2 * power);

  const dmgMul = m.dmg * (1 + ((m.dmgMax ?? 1) - 1) * power) * (rage ? 1.5 : 1);
  const spreadMul = m.spread * (1 - (1 - (m.tight ?? 1)) * power);
  const range = d.range * state.stats.range * (1 + ((m.rangeMax ?? 1) - 1) * power);
  const speed = d.speed * (1 + 0.25 * power);
  const pierce = state.stats.pierce + Math.round((m.pierceMax ?? 0) * power);

  const p = state.player;
  const ox = p.x + Math.cos(p.angle) * (d.gunLen + 6);
  const oy = p.y + Math.sin(p.angle) * (d.gunLen + 6);
  for (let i = 0; i < d.pellets; i++) {
    const off = d.pellets > 1
      ? ((i / (d.pellets - 1) - 0.5) * d.spread * 2 + (Math.random() - 0.5) * 0.08) * spreadMul
      : (Math.random() - 0.5) * d.spread * spreadMul;
    const a = p.angle + off;
    const life = range / speed;
    state.bullets.push({
      x: ox, y: oy,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      life, maxLife: life,
      dmg: d.damage * state.stats.dmg * dmgMul,
      pierce,
      big: power > 0.5,
      hit: [],
      dead: false,
    });
  }
  sfx[d.sound]();
  if (w.mag === 0) startReload(); // rechargement automatique
}

// Chargeur vide : recharge si possible, sinon clic à vide. Renvoie true si on ne peut pas tirer.
function emptyCheck() {
  const w = cur();
  if (w.mag > 0) return false;
  input.clickBuffer = 0;
  if (w.reserve > 0) startReload();
  else { state.cooldown = 0.3; sfx.empty(); }
  return true;
}

function updateTrigger(dt) {
  const m = FIRE_MODES[modeOf()];
  const id = modeOf();
  const w = cur();
  const held = isFiring();
  const press = input.clickBuffer > 0;
  const idle = state.reload <= 0;

  // Rafale en cours : les balles suivantes partent toutes seules.
  if (state.burst.left > 0) {
    state.burst.timer -= dt;
    if (state.burst.timer <= 0) {
      if (!idle || w.mag <= 0) { state.burst.left = 0; return; }
      discharge(m);
      state.burst.left--;
      if (state.burst.left > 0) state.burst.timer = m.gap;
      else state.cooldown = delay(m, m.pause);
    }
    return;
  }

  if (id === 'charge') {
    if (held && idle && w.mag <= 0) {
      if (state.cooldown <= 0) emptyCheck();
    } else if (held && idle) {
      if (state.cooldown <= 0) state.charge = Math.min(m.time, state.charge + dt);
    } else if (state.charge > 0 || press) {
      const ready = state.cooldown <= 0 && idle;
      if (!held && ready && !emptyCheck()) {
        const power = state.charge >= m.min ? state.charge / m.time : 0;   // relâché trop tôt = tir normal
        discharge(m, power);
        state.cooldown = delay(m, power > 0 ? 1.4 : 1);
      }
      if (!held || !idle) state.charge = 0;
    }
    return;
  }

  if (state.cooldown > 0 || !idle) return;
  // semi : un tir par appui · auto / rafale : maintenir (ou appuyer) · l'appui est mémorisé 150 ms
  const wants = id === 'semi' ? press : (held || press);
  if (!wants || emptyCheck()) return;

  discharge(m);
  if (id === 'burst') {
    state.burst.left = Math.min(m.count - 1, cur().mag);
    if (state.burst.left > 0) state.burst.timer = m.gap;
    else state.cooldown = delay(m, m.pause);
  } else {
    state.cooldown = delay(m);
  }
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

  updateTrigger(dt);
}
