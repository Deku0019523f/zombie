// Mode « Ville » : population de zombies par zone, points de contrôle, ravitaillements, caches d'armes,
// sauvegarde, caméra. La carte (données pures) est dans citymap.js ; le dessin dans cityart.js / render.js.
import { CITY, WEAPONS } from './config.js';
import { state } from './state.js';
import { ZONES, ZONE_ORDER, zoneAt, pickType, zoneOrigin, rollChests, ZW, ZH, ZONE_MARGIN } from './citymap.js';
import { spawnZombie } from './zombies.js';
import { hitsSolid } from './layout.js';
import { computeStats } from './stats.js';
import { getCity, setCity } from './storage.js';
import { banner, toast } from './ui.js';
import { alertNoise, updateNoise } from './noise.js';
import { updateAmbient } from './ambient.js';
import { emit } from './soundq.js';
import { t } from './i18n.js';
import { sfx } from './audio.js';
import { addFloater } from './effects.js';
import { rand } from './util.js';

export { alertNoise };

const city = () => state.city;

// Carte explorée : une chaîne de 0/1 (une case = CITY.cell px), compacte et facile à sauvegarder.
const encodeExplored = (a) => { let o = ''; for (let i = 0; i < a.length; i++) o += a[i] ? '1' : '0'; return o; };
function decodeExplored(str, a) {
  if (typeof str !== 'string') return;
  for (let i = 0; i < a.length && i < str.length; i++) a[i] = str[i] === '1' ? 1 : 0;
}

// ---- Sauvegarde ----
export function saveCity() {
  const c = city();
  if (!c) return;
  setCity({
    cp: c.cp, cps: Object.keys(c.cps), perks: state.perks, kills: state.kills, perkAt: c.perkAt, perksTaken: c.perksTaken, won: c.won,
    weapons: Object.fromEntries(Object.keys(WEAPONS).map((id) => [id, !!state.weapons[id].unlocked])),
    taken: c.caches.filter((k) => k.taken).map((k) => k.id),
    seed: c.seed, opened: c.chests.filter((k) => k.open).map((k) => k.id), maps: Object.keys(c.maps),
    explored: encodeExplored(c.explored), silencer: state.silencer, tod: c.tod,
  });
}

export const hasCitySave = () => !!getCity();
export const citySaveInfo = () => { const s = getCity(); return s ? { cps: (s.cps || []).length, total: ZONE_ORDER.length } : null; };

// Applique la sauvegarde (après resetState(true)). Renvoie true s'il y en avait une.
export function restoreCity() {
  const c = city();
  const s = getCity();
  state.wave = 1;
  c.perkAt = state.kills + CITY.perkFirst;
  if (!s) { c.cps.res = true; return false; }
  state.perks = { ...(s.perks || {}) };
  state.stats = computeStats(state.perks);
  for (const [id, on] of Object.entries(s.weapons || {})) if (on && state.weapons[id]) state.weapons[id].unlocked = true;
  for (const id of s.cps || []) c.cps[id] = true;
  c.cps.res = true;
  for (const k of c.caches) if ((s.taken || []).includes(k.id)) k.taken = true;
  c.cp = c.cps[s.cp] ? s.cp : 'res';
  c.perksTaken = s.perksTaken || 0;
  c.won = !!s.won;
  if (s.seed && s.seed !== c.seed) {                    // mêmes coffres qu'avant (la graine est sauvegardée)
    c.seed = s.seed;
    c.chests = rollChests(c.seed, c.map).map((k) => ({ ...k, open: false, t: 0 }));
  }
  for (const k of c.chests) if ((s.opened || []).includes(k.id)) { k.open = true; k.t = 1; }
  for (const id of s.maps || []) c.maps[id] = true;
  decodeExplored(s.explored, c.explored);
  state.silencer = s.silencer || 0;
  if (typeof s.tod === 'number') c.tod = s.tod;
  state.kills = s.kills || 0;
  c.perkAt = Math.max(s.perkAt || 0, state.kills + 1);
  const cp = c.map.checkpoints.find((k) => k.id === c.cp);
  state.player.x = cp.x;
  state.player.y = cp.y;
  return true;
}

// ---- Population ----
const countIn = (id) => state.zombies.reduce((n, z) => n + (!z.dead && zoneAt(z.x, z.y).id === id ? 1 : 0), 0);

function offscreen(x, y) {
  const cx = state.cam.x + state.vw / 2;
  const cy = state.cam.y + state.vh / 2;
  return Math.abs(x - cx) > state.vw / 2 + 24 || Math.abs(y - cy) > state.vh / 2 + 24;
}

function place(x, y, zone) {
  const z = spawnZombie(pickType(zone), { x, y });
  z.hx = x;
  z.hy = y;
  return z;
}

// Remplit les zones au démarrage (zombies au repos, dispersés).
function fillCity() {
  const p = state.player;
  for (const id of ZONE_ORDER) {
    const zone = ZONES[id];
    const { ox, oy } = zoneOrigin(id);
    const n = Math.round(zone.density * CITY.fill);
    for (let i = 0, ok = 0; i < 80 && ok < n; i++) {
      const x = ox + rand(ZONE_MARGIN, ZW - ZONE_MARGIN);
      const y = oy + rand(ZONE_MARGIN, ZH - ZONE_MARGIN);
      if (hitsSolid(state.solids, x, y, 16) || Math.hypot(x - p.x, y - p.y) < 230) continue;
      place(x, y, zone);
      ok++;
    }
  }
  // hordes endormies : un groupe serré qui ne se réveille qu'au bruit (tir fort, explosion, alarme) ou si on le frôle
  for (const h of city().map.hordes) {
    city().hordes[h.id] = { awake: false };
    const zone = ZONES[h.zone];
    for (let i = 0, ok = 0; i < 60 && ok < h.n; i++) {
      const a = rand(0, Math.PI * 2);
      const d = rand(0, 46);
      const x = h.x + Math.cos(a) * d;
      const y = h.y + Math.sin(a) * d;
      if (hitsSolid(state.solids, x, y, 14)) continue;
      const z = place(x, y, zone);
      z.horde = h.id;
      ok++;
    }
  }
}

function trySpawn() {
  const p = state.player;
  for (let i = 0; i < 14; i++) {
    const a = rand(0, Math.PI * 2);
    const d = rand(CITY.spawnRing[0], CITY.spawnRing[1]);
    const x = p.x + Math.cos(a) * d;
    const y = p.y + Math.sin(a) * d;
    if (x < 20 || y < 50 || x > state.w - 20 || y > state.h - 20 || !offscreen(x, y) || hitsSolid(state.solids, x, y, 16)) continue;
    const zone = zoneAt(x, y);
    if (countIn(zone.id) >= zone.density) continue;
    place(x, y, zone);
    return true;
  }
  return false;
}

// ---- Points de contrôle, ravitaillements, caches ----
function activate(cp) {
  const c = city();
  const first = !c.cps[cp.id];
  c.cps[cp.id] = true;
  c.cp = cp.id;
  const p = state.player;
  p.hp = Math.min(state.stats.maxHp, p.hp + state.stats.maxHp * CITY.cpHeal);
  for (const [id, d] of Object.entries(WEAPONS)) {
    const w = state.weapons[id];
    if (w.unlocked && w.reserve !== Infinity) w.reserve = Math.min(Math.round(d.maxReserve * state.stats.ammo), w.reserve + d.pickup);
  }
  if (first) {
    banner(t('cpBanner', Object.keys(c.cps).length, ZONE_ORDER.length), 'good');
    sfx.rescue();
    state.coins += 3 * state.stats.coin;
  } else toast(t('cpAgain'), 1400);
  saveCity();
  if (!c.won && ZONE_ORDER.every((id) => c.cps[id])) {
    c.won = true;
    state.score += 1000;
    state.coins += CITY.winBonus * state.stats.coin;
    setTimeout(() => banner(t('cityFree'), 'good', 3200), 1800);
    saveCity();
  }
}

function giveSupply(s) {
  const p = state.player;
  if (s.kind !== 'ammo') p.hp = Math.min(state.stats.maxHp, p.hp + 30);
  if (s.kind !== 'health') {
    for (const [id, d] of Object.entries(WEAPONS)) {
      const w = state.weapons[id];
      if (w.unlocked && w.reserve !== Infinity) w.reserve = Math.min(Math.round(d.maxReserve * state.stats.ammo), w.reserve + d.pickup);
    }
  }
  s.cd = CITY.supplyCd;
  addFloater(s.x, s.y - 14, t(`supply_${s.kind}`), '#86efac', 10);
  sfx.pickup();
}

function takeCache(k) {
  k.taken = true;
  const d = WEAPONS[k.weapon];
  const w = state.weapons[k.weapon];
  if (!w.unlocked) {
    w.unlocked = true;
    w.mag = d.mag;
    w.reserve = d.startReserve ?? w.reserve;
    banner(t(`cache_${k.weapon}`), 'good');
  } else {
    w.reserve = Math.min(Math.round(d.maxReserve * state.stats.ammo), w.reserve + d.pickup * 2);
    toast(t('cacheAmmo'), 1600);
  }
  sfx.rescue();
  saveCity();
}

// ---- Coffres aléatoires, cartes, exploration ----
const chestLabel = { ammo: '🔫', health: '❤️', coins: '🪙', grenade: '💣', map: '🗺️', silencer: '🔇', perk: '⭐' };

function revealZone(id) {
  const c = city();
  const { ox, oy } = zoneOrigin(id);
  const S = CITY.cell;
  for (let gy = Math.floor(oy / S); gy < Math.ceil((oy + ZH) / S); gy++) {
    for (let gx = Math.floor(ox / S); gx < Math.ceil((ox + ZW) / S); gx++) {
      if (gx >= 0 && gy >= 0 && gx < c.gcols && gy < c.grows) c.explored[gy * c.gcols + gx] = 1;
    }
  }
  c.maps[id] = true;
}

export const zoneExplored = (id) => {
  const c = city();
  const { ox, oy } = zoneOrigin(id);
  const S = CITY.cell;
  let n = 0;
  let tot = 0;
  for (let gy = Math.floor(oy / S); gy < Math.ceil((oy + ZH) / S); gy++) {
    for (let gx = Math.floor(ox / S); gx < Math.ceil((ox + ZW) / S); gx++) {
      if (gx < c.gcols && gy < c.grows) { tot++; n += c.explored[gy * c.gcols + gx]; }
    }
  }
  return tot ? n / tot : 0;
};

function updateExplore(dt) {
  const c = city();
  c.exploreT -= dt;
  if (c.exploreT > 0) return;
  c.exploreT = 0.25;
  const p = state.player;
  const S = CITY.cell;
  const R = CITY.exploreR;
  const x0 = Math.max(0, Math.floor((p.x - R) / S));
  const x1 = Math.min(c.gcols - 1, Math.floor((p.x + R) / S));
  const y0 = Math.max(0, Math.floor((p.y - R) / S));
  const y1 = Math.min(c.grows - 1, Math.floor((p.y + R) / S));
  for (let gy = y0; gy <= y1; gy++) {
    for (let gx = x0; gx <= x1; gx++) {
      if (Math.hypot((gx + 0.5) * S - p.x, (gy + 0.5) * S - p.y) < R) c.explored[gy * c.gcols + gx] = 1;
    }
  }
}

// Une carte révèle une zone encore inconnue (de préférence une zone qui contient des coffres fermés) et leurs emplacements.
function pickMapZone() {
  const c = city();
  const cand = ZONE_ORDER.filter((id) => !c.maps[id] && id !== c.zone);
  if (!cand.length) return null;
  const withChests = cand.filter((id) => c.chests.some((k) => k.zone === id && !k.open));
  const pool = withChests.length ? withChests : cand;
  return pool[Math.floor(Math.random() * pool.length)];
}

function openChest(k) {
  const c = city();
  const p = state.player;
  k.open = true;
  k.t = 0;
  let msg = '';
  switch (k.loot) {
    case 'ammo':
      for (const [id, d] of Object.entries(WEAPONS)) {
        const w = state.weapons[id];
        if (w.unlocked && w.reserve !== Infinity) w.reserve = Math.min(Math.round(d.maxReserve * state.stats.ammo), w.reserve + Math.ceil(d.pickup * 1.5));
      }
      msg = t('chest_ammo');
      break;
    case 'health':
      p.hp = Math.min(state.stats.maxHp, p.hp + state.stats.maxHp * 0.4);
      msg = t('chest_health');
      break;
    case 'coins': {
      const n = Math.round(rand(8, 16) * state.stats.coin);
      state.coins += n;
      msg = t('chest_coins', n);
      break;
    }
    case 'grenade':
      state.grenadeCd = 0;
      msg = t('chest_grenade');
      break;
    case 'silencer':
      state.silencer += CITY.silencerShots;
      msg = t('chest_silencer', state.silencer);
      break;
    case 'perk':
      state.pendingPerk = true;
      msg = t('chest_perk');
      break;
    case 'map': {
      const id = pickMapZone();
      if (id) {
        revealZone(id);
        msg = t('chest_map', t(`zone_${id}`));
      } else {
        state.coins += 10 * state.stats.coin;
        msg = t('chest_coins', 10);
      }
      break;
    }
    default:
  }
  addFloater(k.x, k.y - 16, `${chestLabel[k.loot]} ${msg}`, '#fde047', 10);
  toast(`${chestLabel[k.loot]} ${msg}`, 2200);
  emit(k.loot === 'map' ? 'mapFound' : 'chest', k.x, k.y);
  if (k.loot === 'map') sfx.paper();
  else if (k.loot === 'silencer') sfx.silencer();
  else sfx.chest();
  saveCity();
}

// ---- Boucle ----
export function updateCity(dt) {
  const c = city();
  if (!c) return;
  const p = state.player;
  if (!c.filled) { c.filled = true; fillCity(); }

  const zone = zoneAt(p.x, p.y);
  if (zone.id !== c.zone) {
    c.zone = zone.id;
    state.wave = Math.min(12, zone.danger + Math.floor(state.kills / 60));
    banner(t(`zone_${zone.id}`), 'obj', 1500);
  }

  c.spawnT -= dt;
  if (c.spawnT <= 0) {
    c.spawnT = rand(CITY.spawnEvery[0], CITY.spawnEvery[1]);
    trySpawn();
  }

  for (const cp of c.map.checkpoints) {
    if (Math.hypot(p.x - cp.x, p.y - cp.y) < 26 && (c.cp !== cp.id || !c.cps[cp.id])) activate(cp);
  }
  for (const s of c.supplies) {
    if (s.cd > 0) s.cd -= dt;
    else if (Math.hypot(p.x - s.x, p.y - s.y) < 22) giveSupply(s);
  }
  for (const k of c.caches) {
    if (!k.taken && Math.hypot(p.x - k.x, p.y - k.y) < 24) takeCache(k);
  }
  for (const k of c.chests) {
    if (k.open) k.t = Math.min(1, k.t + dt * 3);
    else if (Math.hypot(p.x - k.x, p.y - k.y) < CITY.chestR) openChest(k);
  }
  updateExplore(dt);
  updateNoise(dt);
  updateAmbient(dt);

  // amélioration tous les N kills, quand aucun zombie n'est collé au joueur
  if (state.kills >= c.perkAt && !state.pendingPerk && !state.zombies.some((z) => !z.dead && Math.hypot(z.x - p.x, z.y - p.y) < 140)) {
    c.perksTaken++;
    c.perkAt = state.kills + CITY.perkFirst + CITY.perkStep * c.perksTaken;
    state.pendingPerk = true;
  }
}

// Caméra : suit le joueur (un peu plus bas que le centre pour laisser voir devant), bornée au monde.
export function updateCamera(dt, snap = false) {
  const p = state.player;
  const cam = state.cam;
  const mx = Math.max(0, state.w - state.vw);
  const my = Math.max(0, state.h - state.vh);
  const tx = Math.max(0, Math.min(mx, p.x - state.vw / 2));
  const ty = Math.max(0, Math.min(my, p.y - state.vh * 0.55));
  const k = snap ? 1 : Math.min(1, dt * CITY.camLerp);
  cam.x += (tx - cam.x) * k;
  cam.y += (ty - cam.y) * k;
}
