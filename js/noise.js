// Bruit et discrétion (mode Ville) : portée des tirs, anneaux de bruit, repérage, alarmes de voiture, hordes endormies.
// Module feuille côté logique : n'importe que state / config / audio / ui, pour pouvoir être appelé de partout sans cycle.
import { state } from './state.js';
import { CITY } from './config.js';
import { sfx } from './audio.js';
import { banner } from './ui.js';
import { t } from './i18n.js';
import { emit } from './soundq.js';
import { dayNight, rainAmount } from './ambient.js';

const city = () => (state.mode === 'city' ? state.city : null);

// Distance à laquelle un zombie au repos repère le joueur : réduite à l'arrêt, la nuit et sous la pluie, accrue en esquive.
export function stealthRadius() {
  const S = CITY.stealth;
  let r = CITY.aggro;
  if (state.dash && state.dash.t > 0) r *= S.dash;
  else if (!state.player.moving) r *= S.still;
  r *= 1 - (1 - S.night) * dayNight();
  r *= 1 - (1 - S.rain) * rainAmount();
  return r;
}

export function wakeHorde(id, quiet = false) {
  const c = city();
  if (!c) return;
  const h = c.hordes[id] || (c.hordes[id] = { awake: false });
  if (h.awake) return;
  h.awake = true;
  for (const z of state.zombies) if (!z.dead && z.horde === id) z.aggro = true;
  if (!quiet) {
    banner(t('hordeWake'), 'obj', 2200);
    sfx.horde();
    state.shake = Math.max(state.shake, 4);
  }
}

// Bruit : les zombies proches se mettent en chasse, les hordes endormies se réveillent, un anneau visible s'étend.
export function alertNoise(x, y, radius = CITY.noise) {
  const c = city();
  const r = radius * (1 - 0.2 * rainAmount());       // la pluie étouffe un peu les bruits
  const r2 = r * r;
  for (const z of state.zombies) {
    if (z.dead || z.aggro) continue;
    if ((z.x - x) ** 2 + (z.y - y) ** 2 < r2) {
      if (z.horde && r < 200) continue;                // une horde ne se réveille qu'à un bruit fort
      z.aggro = true;
      if (z.horde) wakeHorde(z.horde);
    }
  }
  if (c && r > 90 && c.rings.length < 8) c.rings.push({ x, y, r: 0, max: r, life: 0.9 });
}

export function shotNoise(weaponId) {
  const c = city();
  if (!c) return false;
  const p = state.player;
  if (state.silencer > 0) {
    state.silencer--;
    alertNoise(p.x, p.y, CITY.noiseSilenced);
    sfx.silenced();
    if (state.silencer === 0) banner(t('silencerEmpty'), 'obj', 1400);
    return true;                                      // tir silencieux : le bruit normal de l'arme est remplacé
  }
  alertNoise(p.x, p.y, CITY.noiseWeapon[weaponId] ?? CITY.noise);
  sfx.echo(weaponId === 'shotgun' ? 0.12 : 0.08);
  return false;
}

export function boomNoise(x, y) {
  if (!city()) return;
  alertNoise(x, y, CITY.noiseBoom);
}

// Alarme de voiture : attire les zombies alentour vers la voiture pendant quelques secondes.
export function triggerAlarm(car) {
  const c = city();
  if (!c || car.alarmed) return;
  car.alarmed = true;
  const x = car.x + car.w / 2;
  const y = car.y + car.h / 2;
  c.lures.push({ x, y, t: CITY.alarmTime, car });
  alertNoise(x, y, 300);
  emit('alarmStart', x, y);
}

export function updateNoise(dt) {
  const c = city();
  if (!c) return;
  for (const r of c.rings) {
    r.life -= dt;
    r.r += (r.max - r.r) * Math.min(1, dt * 5);
  }
  if (c.rings.some((r) => r.life <= 0)) c.rings = c.rings.filter((r) => r.life > 0);
  for (const l of c.lures) l.t -= dt;
  if (c.lures.some((l) => l.t <= 0)) c.lures = c.lures.filter((l) => l.t > 0);

  // piège : s'approcher d'une voiture « à alarme » peut la déclencher (une seule fois par voiture)
  const p = state.player;
  for (const s of c.map.solids) {
    if (!s.alarm || s.alarmed || s.checked) continue;
    const cx = Math.max(s.x, Math.min(p.x, s.x + s.w));
    const cy = Math.max(s.y, Math.min(p.y, s.y + s.h));
    if (Math.hypot(p.x - cx, p.y - cy) < 22) {
      s.checked = true;
      if (Math.random() < CITY.alarmChance) triggerAlarm(s);
    }
  }
}

// Leurre actif le plus proche d'une position (pour les zombies au repos)
export function nearestLure(x, y) {
  const c = city();
  if (!c || !c.lures.length) return null;
  let best = null;
  let bd = CITY.lureRange;
  for (const l of c.lures) {
    const d = Math.hypot(l.x - x, l.y - y);
    if (d < bd) { bd = d; best = l; }
  }
  return best;
}
