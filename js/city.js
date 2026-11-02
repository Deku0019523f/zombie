// Mode « Ville » : population de zombies par zone, points de contrôle, ravitaillements, caches d'armes,
// sauvegarde, caméra. La carte (données pures) est dans citymap.js ; le dessin dans cityart.js / render.js.
import { CITY, WEAPONS } from './config.js';
import { state } from './state.js';
import { ZONES, ZONE_ORDER, zoneAt, pickType, zoneOrigin, ZW, ZH, ZONE_MARGIN } from './citymap.js';
import { spawnZombie } from './zombies.js';
import { hitsSolid } from './layout.js';
import { computeStats } from './stats.js';
import { getCity, setCity } from './storage.js';
import { banner, toast } from './ui.js';
import { t } from './i18n.js';
import { sfx } from './audio.js';
import { addFloater } from './effects.js';
import { rand } from './util.js';

const city = () => state.city;

// ---- Sauvegarde ----
export function saveCity() {
  const c = city();
  if (!c) return;
  setCity({
    cp: c.cp, cps: Object.keys(c.cps), perks: state.perks, kills: state.kills, perkAt: c.perkAt, perksTaken: c.perksTaken, won: c.won,
    weapons: Object.fromEntries(Object.keys(WEAPONS).map((id) => [id, !!state.weapons[id].unlocked])),
    taken: c.caches.filter((k) => k.taken).map((k) => k.id),
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

// Coup de feu : les zombies proches se mettent en chasse.
export function alertNoise(x, y) {
  const r2 = CITY.noise * CITY.noise;
  for (const z of state.zombies) if (!z.dead && !z.aggro && (z.x - x) ** 2 + (z.y - y) ** 2 < r2) z.aggro = true;
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
