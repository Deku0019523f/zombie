// Carte de la ville : données pures (aucun accès au canvas, au DOM ni à `state`).
// 6 zones en grille 3 x 2 ; chaque zone fait 360 x 620 et garde 34 px de rue sur son pourtour.
import { CITY } from './config.js';
import { hitsSolid } from './layout.js';

export const ZW = CITY.zw;
export const ZH = CITY.zh;
export const WORLD_W = ZW * CITY.cols;
export const WORLD_H = ZH * CITY.rows;
export const ZONE_MARGIN = 34;

// density = zombies visés dans la zone · danger = difficulté de base · types = [type, poids]
export const ZONES = {
  res:     { id: 'res',     col: 0, row: 1, icon: '🏘️', density: 5,  danger: 1, types: [['walker', 70], ['runner', 25], ['spitter', 5]] },
  centre:  { id: 'centre',  col: 1, row: 1, icon: '🏙️', density: 8,  danger: 2, types: [['walker', 50], ['runner', 25], ['spitter', 15], ['exploder', 10]] },
  police:  { id: 'police',  col: 2, row: 1, icon: '🚓', density: 6,  danger: 2, types: [['walker', 55], ['runner', 15], ['exploder', 15], ['tank', 8], ['spitter', 7]] },
  indus:   { id: 'indus',   col: 0, row: 0, icon: '🏭', density: 8,  danger: 3, types: [['walker', 40], ['tank', 20], ['exploder', 15], ['runner', 15], ['charger', 10]] },
  hopital: { id: 'hopital', col: 1, row: 0, icon: '🏥', density: 14, danger: 5, types: [['walker', 35], ['runner', 20], ['spitter', 15], ['tank', 12], ['charger', 8], ['summoner', 5], ['exploder', 5], ['crawler', 14]] },
  station: { id: 'station', col: 2, row: 0, icon: '⛽', density: 6,  danger: 2, types: [['walker', 55], ['runner', 25], ['exploder', 15], ['spitter', 5]] },
  // --- v3.1 : zones agrandies ---
  cimetiere: { id: 'cimetiere', col: 0, row: 2, icon: '🪦', density: 9,  danger: 3, types: [['walker', 45], ['crawler', 25], ['runner', 15], ['spitter', 10], ['tank', 5]] },
  parc:      { id: 'parc',      col: 1, row: 2, icon: '🌳', density: 6,  danger: 2, types: [['walker', 60], ['runner', 25], ['crawler', 8], ['spitter', 7]] },
  ecole:     { id: 'ecole',     col: 2, row: 2, icon: '🏫', density: 8,  danger: 3, types: [['walker', 45], ['runner', 30], ['exploder', 10], ['charger', 8], ['spitter', 7]] },
  port:      { id: 'port',      col: 3, row: 0, icon: '⚓', density: 10, danger: 4, types: [['walker', 35], ['tank', 20], ['charger', 15], ['exploder', 15], ['runner', 10], ['summoner', 5]] },
  autoroute: { id: 'autoroute', col: 3, row: 1, icon: '🛣️', density: 9,  danger: 3, types: [['walker', 40], ['runner', 35], ['exploder', 15], ['spitter', 10]] },
  banlieue:  { id: 'banlieue',  col: 3, row: 2, icon: '🏡', density: 6,  danger: 2, types: [['walker', 60], ['runner', 25], ['crawler', 5], ['spitter', 10]] },
};
export const ZONE_ORDER = ['res', 'centre', 'police', 'indus', 'hopital', 'station', 'cimetiere', 'parc', 'ecole', 'port', 'autoroute', 'banlieue'];

// Intérieurs (rectangles locaux à la zone) : sons étouffés, réverbération, pas sur carrelage.
export const INDOOR = {
  hopital: [{ x: 62, y: 52, w: 236, h: 336 }],
  police: [{ x: 55, y: 70, w: 250, h: 250 }],
};
// Revêtement du sol par zone (pour les bruits de pas) : asphalt | grass | gravel | tile
export const SURFACE = { res: 'grass', centre: 'asphalt', police: 'asphalt', indus: 'gravel', hopital: 'asphalt', station: 'asphalt', cimetiere: 'grass', parc: 'grass', ecole: 'asphalt', port: 'gravel', autoroute: 'asphalt', banlieue: 'grass' };
export function surfaceAt(x, y) {
  const z = zoneAt(x, y);
  const { ox, oy } = zoneOrigin(z.id);
  const lx = x - ox;
  const ly = y - oy;
  for (const r of INDOOR[z.id] || []) if (lx > r.x && lx < r.x + r.w && ly > r.y && ly < r.y + r.h) return 'tile';
  // les rues entre les zones restent de l'asphalte
  if (lx < ZONE_MARGIN || lx > ZW - ZONE_MARGIN || ly < ZONE_MARGIN || ly > ZH - ZONE_MARGIN) return 'asphalt';
  if (z.id === 'res' && lx > 146 && lx < 214) return 'asphalt';
  return SURFACE[z.id] || 'asphalt';
}
export function isIndoor(x, y) {
  const z = zoneAt(x, y);
  const { ox, oy } = zoneOrigin(z.id);
  const lx = x - ox;
  const ly = y - oy;
  return (INDOOR[z.id] || []).some((r) => lx > r.x && lx < r.x + r.w && ly > r.y && ly < r.y + r.h);
}

export function zoneAt(x, y) {
  const c = Math.max(0, Math.min(CITY.cols - 1, Math.floor(x / ZW)));
  const r = Math.max(0, Math.min(CITY.rows - 1, Math.floor(y / ZH)));
  for (const id of ZONE_ORDER) if (ZONES[id].col === c && ZONES[id].row === r) return ZONES[id];
  return ZONES.res;
}
export const zoneOrigin = (id) => ({ ox: ZONES[id].col * ZW, oy: ZONES[id].row * ZH });

export function pickType(zone) {
  const total = zone.types.reduce((a, [, w]) => a + w, 0);
  let r = Math.random() * total;
  for (const [type, w] of zone.types) {
    r -= w;
    if (r <= 0) return type;
  }
  return 'walker';
}

// Construit la carte : obstacles solides, barils explosifs, points de contrôle, ravitaillements, caches d'armes.
// Un obstacle : { kind, x, y, w, h, hit: {x,y,w,h}, pal?, rot? }
export function buildCityMap() {
  const solids = [];
  const barrels = [];
  const checkpoints = [];
  const supplies = [];
  const caches = [];
  const fires = [];
  const hordes = [];
  const rect = (x, y, w, h) => ({ x, y, w, h });

  // Fabrique les fonctions de pose pour une zone (coordonnées locales -> monde).
  const zone = (id) => {
    const { ox, oy } = zoneOrigin(id);
    const add = (kind, x, y, w, h, extra = {}) => solids.push({ kind, x: ox + x, y: oy + y, w, h, hit: rect(ox + x, oy + y, w, h), ...extra });
    return {
      ox, oy, add,
      car: (x, y, vert = false, pal = 0, kind = 'car', extra = {}) => (vert ? add(kind, x, y, 30, 60, { vert: true, pal, ...extra }) : add(kind, x, y, 60, 30, { vert: false, pal, ...extra })),
      crate: (x, y, s = 24) => add('crate', x, y, s, s),
      tree: (x, y) => add('tree', x - 6, y - 6, 12, 12),
      cp: (x, y) => checkpoints.push({ id, x: ox + x, y: oy + y }),
      barrel: (x, y) => barrels.push({ x: ox + x, y: oy + y, r: 9, hp: 3, dead: false, flash: 0 }),
      supply: (x, y, kind) => supplies.push({ id: `${id}${supplies.length}`, x: ox + x, y: oy + y, kind }),
      fire: (x, y) => fires.push({ x: ox + x, y: oy + y }),
      horde: (x, y, n) => hordes.push({ id: `${id}${hordes.length}`, zone: id, x: ox + x, y: oy + y, n }),
      cache: (x, y, weapon) => caches.push({ id: weapon, x: ox + x, y: oy + y, weapon }),
    };
  };

  // --- Quartier résidentiel : maisons, jardins, voitures abandonnées (départ du joueur) ---
  {
    const z = zone('res');
    [[48, 64, 0], [214, 64, 1], [48, 236, 2], [214, 236, 3], [48, 408, 4]].forEach(([x, y, p]) => z.add('house', x, y, 98, 70, { pal: p }));
    z.add('shed', 240, 432, 44, 30);
    z.car(150, 80, true, 0);
    z.car(182, 300, true, 2, 'car', { alarm: true });
    z.car(58, 170, false, 1);
    z.add('barricade', 220, 182, 70, 14);
    z.crate(60, 340, 26);
    z.crate(90, 352, 20);
    z.car(222, 340, false, 3);
    z.add('barricade', 54, 505, 62, 14);
    [[100, 205], [262, 215], [110, 380], [270, 390], [250, 520], [70, 548]].forEach(([x, y]) => z.tree(x, y));
    z.cp(180, 540);
  }
  // --- Centre-ville : immeubles, magasins, avenue et parkings ---
  {
    const z = zone('centre');
    z.add('tower', 40, 50, 105, 150, { pal: 0 });
    z.add('tower', 215, 50, 105, 150, { pal: 1 });
    z.add('tower', 40, 250, 105, 130, { pal: 2 });
    z.add('tower', 215, 250, 105, 130, { pal: 3 });
    z.add('shop', 40, 440, 105, 110, { pal: 0 });
    z.add('shop', 215, 440, 105, 110, { pal: 1 });
    z.car(150, 80, true, 1);
    z.car(184, 450, true, 4, 'car', { alarm: true });
    z.add('barricade', 150, 395, 40, 14);
    z.car(60, 396, false, 3);
    z.car(244, 396, false, 0);
    z.cp(180, 225);
  }
  // --- Zone industrielle : entrepôts, usine, conteneurs, barils explosifs ---
  {
    const z = zone('indus');
    z.add('warehouse', 40, 50, 150, 110);
    z.add('warehouse', 40, 330, 150, 130);
    z.add('factory', 220, 60, 100, 190);
    z.add('container', 225, 300, 56, 24, { pal: 0 });
    z.add('container', 225, 330, 56, 24, { pal: 1 });
    z.add('container', 225, 360, 56, 24, { pal: 2 });
    z.add('container', 258, 430, 56, 24, { pal: 3 });
    z.crate(60, 182, 26);
    z.crate(92, 192, 22);
    z.barrel(298, 285);
    z.barrel(302, 312);
    z.barrel(150, 300);
    z.cache(110, 252, 'smg');
    z.fire(205, 288);
    z.fire(36, 255);
    z.cp(120, 525);
  }
  // --- Hôpital : bâtiment à murs percés de portes, lits, ambulances (zone dangereuse) ---
  {
    const z = zone('hopital');
    const W = (x, y, w, h) => z.add('wall', x, y, w, h, { pal: 'hosp' });
    W(50, 40, 260, 12);                       // haut
    W(50, 40, 12, 230); W(50, 330, 12, 70);   // gauche (porte 270-330)
    W(298, 40, 12, 150); W(298, 250, 12, 150); // droite (porte 190-250)
    W(50, 388, 100, 12); W(210, 388, 100, 12); // bas (entrée 150-210)
    W(62, 180, 88, 10); W(210, 180, 88, 10);  // cloison (porte centrale)
    [[75, 70], [115, 70], [215, 70], [255, 70], [75, 120], [115, 120], [215, 120], [255, 120]].forEach(([x, y]) => z.add('bed', x, y, 26, 14));
    z.add('desk', 150, 330, 60, 16);
    z.add('desk', 80, 235, 44, 16);
    z.add('desk', 236, 235, 44, 16);
    z.car(60, 450, true, 0, 'ambulance');
    z.car(120, 450, true, 0, 'ambulance');
    z.car(250, 470, false, 0, 'ambulance');
    z.add('barricade', 150, 440, 60, 14);
    z.supply(180, 100, 'health');
    z.supply(180, 262, 'health');
    z.horde(180, 310, 11);
    z.cp(180, 520);
  }
  // --- Commissariat : enceinte fermée, armes et munitions ---
  {
    const z = zone('police');
    const W = (x, y, w, h) => z.add('wall', x, y, w, h, { pal: 'police' });
    W(45, 60, 270, 10);
    W(45, 60, 10, 270); W(305, 60, 10, 270);
    W(45, 320, 105, 10); W(210, 320, 105, 10);   // portail 150-210
    z.add('desk', 75, 130, 60, 18);
    z.add('desk', 165, 130, 60, 18);
    z.add('desk', 90, 230, 60, 18);
    z.add('cells', 235, 160, 60, 10);
    z.add('cells', 235, 215, 60, 10);
    z.car(50, 395, false, 0, 'police');
    z.car(240, 420, false, 0, 'police');
    z.add('barricade', 110, 360, 80, 14);
    z.cache(280, 100, 'shotgun');
    z.supply(180, 100, 'ammo');
    z.cp(180, 470);
  }
  // --- Station-service : pompes, camion-citerne, ravitaillement ---
  {
    const z = zone('station');
    [[120, 175], [150, 175], [214, 175], [244, 175]].forEach(([x, y]) => z.add('pump', x, y, 14, 26));
    z.add('shop', 60, 300, 130, 80, { pal: 2 });
    z.add('truck', 210, 320, 100, 34);
    z.crate(270, 425, 26);
    z.car(60, 500, true, 2);
    z.barrel(290, 205);
    z.barrel(296, 228);
    z.barrel(40, 215);
    z.supply(189, 160, 'both');
    z.supply(189, 232, 'both');
    z.cp(180, 470);
  }

  // --- Cimetière : enceinte grillagée, tombes, mausolée ; des rampants sortent de terre ---
  {
    const z = zone('cimetiere');
    const F = (x, y, w, h) => z.add('wall', x, y, w, h, { pal: 'fence' });
    F(50, 46, 260, 6);
    F(50, 46, 6, 510); F(304, 46, 6, 510);
    F(50, 550, 100, 6); F(210, 550, 100, 6);        // portail 150-210
    z.add('crypt', 135, 72, 90, 62);
    for (let r = 0; r < 5; r++) {
      for (const x of [74, 100, 126, 232, 258, 284]) z.add('grave', x, 170 + r * 54 + (x % 2 ? 0 : 0), 14, 10, { pal: (r + x) % 3 });
    }
    z.tree(84, 100);
    z.tree(280, 112);
    z.tree(76, 470);
    z.tree(286, 478);
    z.add('shed', 240, 500, 44, 30);
    z.horde(180, 330, 9);
    z.fire(95, 520);
    z.supply(180, 440, 'health');
    z.cp(180, 520);
  }
  // --- Parc : étang, arbres, bancs, kiosque ---
  {
    const z = zone('parc');
    z.add('pond', 105, 190, 150, 90);
    [[70, 90], [140, 120], [230, 100], [290, 150], [70, 220], [300, 290], [60, 340], [150, 360], [250, 380], [310, 440], [90, 450], [200, 470]].forEach(([x, y]) => z.tree(x, y));
    z.add('bench', 130, 310, 36, 10);
    z.add('bench', 200, 310, 36, 10);
    z.add('bench', 60, 140, 10, 36);
    z.add('shop', 40, 480, 90, 70, { pal: 1 });       // kiosque / cafétéria
    z.add('barricade', 220, 400, 70, 14);
    z.car(250, 520, false, 3, 'car', { alarm: true });
    z.supply(180, 400, 'both');
    z.cp(180, 560);
  }
  // --- École : bâtiment, gymnase, bus scolaires, cour de récréation ---
  {
    const z = zone('ecole');
    z.add('school', 60, 56, 240, 96, { pal: 0 });
    z.add('gym', 220, 220, 100, 80);
    z.add('bus', 50, 330, 100, 32);
    z.add('bus', 50, 380, 100, 32, { pal: 1 });
    z.add('slide', 100, 220, 40, 22);
    z.add('slide', 160, 250, 40, 22);
    z.add('barricade', 190, 340, 90, 14);
    z.crate(290, 390, 24);
    z.tree(90, 190);
    z.tree(300, 190);
    z.tree(290, 470);
    z.car(80, 470, false, 4);
    z.supply(180, 190, 'health');
    z.horde(160, 430, 7);
    z.cp(180, 530);
  }
  // --- Port : conteneurs, grue, quai (eau à l'est), barils ---
  {
    const z = zone('port');
    z.add('water', 300, 0, 60, ZH);
    z.add('warehouse', 40, 50, 140, 100);
    z.add('cranepost', 60, 190, 16, 16, { beam: 176 });
    z.add('cranepost', 220, 190, 16, 16);
    [[50, 250, 0], [50, 280, 1], [50, 310, 2], [112, 250, 3], [112, 280, 0], [190, 380, 1], [190, 410, 2], [250, 380, 3], [250, 410, 0], [112, 440, 1], [50, 440, 2]].forEach(([x, y, p]) => z.add('container', x, y, 56, 24, { pal: p }));
    z.crate(200, 130, 26);
    z.crate(230, 140, 22);
    z.barrel(180, 230);
    z.barrel(270, 340);
    z.barrel(150, 520);
    z.fire(90, 360);
    z.fire(280, 120);
    z.supply(175, 320, 'ammo');
    z.horde(130, 350, 9);
    z.cp(180, 540);
  }
  // --- Autoroute : embouteillage figé, glissières, camion renversé ---
  {
    const z = zone('autoroute');
    z.add('guard', 44, 40, 8, 250);
    z.add('guard', 44, 340, 8, 240);
    z.add('guard', 308, 40, 8, 250);
    z.add('guard', 308, 340, 8, 240);
    z.car(70, 70, true, 0);
    z.car(110, 130, true, 2, 'car', { alarm: true });
    z.car(70, 200, true, 1);
    z.car(150, 160, true, 4);
    z.car(230, 80, true, 3);
    z.car(270, 160, true, 0, 'car', { alarm: true });
    z.add('truck', 120, 270, 100, 34);
    z.car(240, 330, true, 2);
    z.car(80, 380, true, 1);
    z.car(170, 400, true, 4, 'car', { alarm: true });
    z.car(270, 450, true, 3);
    z.car(110, 500, true, 0);
    z.add('barricade', 150, 550, 70, 14);
    z.barrel(200, 215);
    z.fire(62, 320);
    z.supply(180, 330, 'both');
    z.cp(255, 565);
  }
  // --- Banlieue : pavillons, piscines, jardins ---
  {
    const z = zone('banlieue');
    [[48, 60, 1], [214, 60, 2], [48, 230, 3], [214, 230, 0], [48, 400, 4], [214, 400, 1]].forEach(([x, y, p]) => z.add('house', x, y, 98, 70, { pal: p }));
    z.add('pool', 58, 316, 70, 38);
    z.add('pool', 224, 486, 70, 38);
    z.car(150, 90, true, 2);
    z.car(176, 330, true, 0, 'car', { alarm: true });
    z.car(150, 470, true, 3);
    z.add('barricade', 215, 160, 70, 14);
    z.add('barricade', 56, 500, 60, 14);
    [[110, 200], [270, 210], [120, 380], [290, 380], [250, 560], [70, 560]].forEach(([x, y]) => z.tree(x, y));
    z.supply(180, 200, 'health');
    z.cp(180, 560);
  }

  // --- Réverbères le long des rues (décor + lumière de nuit) ---
  const lamps = [];
  for (let c = 1; c < CITY.cols; c++) for (let y = 70; y < WORLD_H; y += 150) lamps.push({ x: c * ZW - 22, y }, { x: c * ZW + 22, y: y + 75 });
  for (let r = 1; r < CITY.rows; r++) for (let x = 90; x < WORLD_W; x += 160) lamps.push({ x, y: r * ZH - 22 }, { x: x + 80, y: r * ZH + 22 });
  for (const id of ['res', 'centre', 'station', 'police', 'ecole', 'banlieue', 'parc']) {
    const { ox, oy } = zoneOrigin(id);
    lamps.push({ x: ox + 30, y: oy + 300 }, { x: ox + 330, y: oy + 300 });
  }

  const start = checkpoints.find((c) => c.id === 'res');
  return { solids, barrels, checkpoints, supplies, caches, lamps, fires, hordes, start: { x: start.x, y: start.y } };
}

// ---- Coffres aléatoires ----
// Générés à partir d'une graine (sauvegardée) : la même partie retrouve les mêmes coffres.
function rng(seed) {
  let s = Math.abs(Math.floor(seed)) % 2147483647;
  if (s <= 0) s = 1234567;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}
const CHEST_VARIANT = { res: 'trunk', banlieue: 'trunk', autoroute: 'trunk', police: 'locker', hopital: 'medbox', ecole: 'locker', indus: 'crate', port: 'crate', station: 'crate', centre: 'chest', parc: 'chest', cimetiere: 'chest' };

export function rollChests(seed, map) {
  const rnd = rng(seed);
  const chests = [];
  const fixed = [...map.checkpoints, ...map.supplies, ...map.caches];
  for (const id of ZONE_ORDER) {
    const zone = ZONES[id];
    const { ox, oy } = zoneOrigin(id);
    const n = zone.danger >= 3 ? CITY.chestsDanger : CITY.chests;
    let placed = 0;
    for (let tries = 0; tries < 400 && placed < n; tries++) {
      const x = ox + ZONE_MARGIN + 16 + rnd() * (ZW - ZONE_MARGIN * 2 - 32);
      const y = oy + ZONE_MARGIN + 16 + rnd() * (ZH - ZONE_MARGIN * 2 - 32);
      if (hitsSolid(map.solids, x, y, 18)) continue;
      if (fixed.some((f) => Math.hypot(f.x - x, f.y - y) < 46)) continue;
      if (chests.some((c) => Math.hypot(c.x - x, c.y - y) < 70)) continue;
      chests.push({ id: `${id}${placed}`, zone: id, x: Math.round(x), y: Math.round(y), variant: CHEST_VARIANT[id] || 'chest', loot: rollLoot(rnd) });
      placed++;
    }
  }
  // au moins quelques cartes dans la ville, sinon la mécanique ne sert à rien
  let maps = chests.filter((c) => c.loot === 'map').length;
  for (let guard = 0; maps < 5 && guard < 200; guard++) {
    const c = chests[Math.floor(rnd() * chests.length)];
    if (c.loot !== 'map' && c.loot !== 'perk') { c.loot = 'map'; maps++; }
  }
  return chests;
}

function rollLoot(rnd) {
  const total = CITY.chestLoot.reduce((a, [, w]) => a + w, 0);
  let r = rnd() * total;
  for (const [k, w] of CITY.chestLoot) {
    r -= w;
    if (r <= 0) return k;
  }
  return 'ammo';
}
