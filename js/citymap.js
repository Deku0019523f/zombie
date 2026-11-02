// Carte de la ville : données pures (aucun accès au canvas, au DOM ni à `state`).
// 6 zones en grille 3 x 2 ; chaque zone fait 360 x 620 et garde 34 px de rue sur son pourtour.
import { CITY } from './config.js';

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
  hopital: { id: 'hopital', col: 1, row: 0, icon: '🏥', density: 14, danger: 5, types: [['walker', 35], ['runner', 20], ['spitter', 15], ['tank', 12], ['charger', 8], ['summoner', 5], ['exploder', 5]] },
  station: { id: 'station', col: 2, row: 0, icon: '⛽', density: 6,  danger: 2, types: [['walker', 55], ['runner', 25], ['exploder', 15], ['spitter', 5]] },
};
export const ZONE_ORDER = ['res', 'centre', 'police', 'indus', 'hopital', 'station'];

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
  const rect = (x, y, w, h) => ({ x, y, w, h });

  // Fabrique les fonctions de pose pour une zone (coordonnées locales -> monde).
  const zone = (id) => {
    const { ox, oy } = zoneOrigin(id);
    const add = (kind, x, y, w, h, extra = {}) => solids.push({ kind, x: ox + x, y: oy + y, w, h, hit: rect(ox + x, oy + y, w, h), ...extra });
    return {
      ox, oy, add,
      car: (x, y, vert = false, pal = 0, kind = 'car') => (vert ? add(kind, x, y, 30, 60, { vert: true, pal }) : add(kind, x, y, 60, 30, { vert: false, pal })),
      crate: (x, y, s = 24) => add('crate', x, y, s, s),
      tree: (x, y) => add('tree', x - 6, y - 6, 12, 12),
      cp: (x, y) => checkpoints.push({ id, x: ox + x, y: oy + y }),
      barrel: (x, y) => barrels.push({ x: ox + x, y: oy + y, r: 9, hp: 3, dead: false, flash: 0 }),
      supply: (x, y, kind) => supplies.push({ id: `${id}${supplies.length}`, x: ox + x, y: oy + y, kind }),
      cache: (x, y, weapon) => caches.push({ id: weapon, x: ox + x, y: oy + y, weapon }),
    };
  };

  // --- Quartier résidentiel : maisons, jardins, voitures abandonnées (départ du joueur) ---
  {
    const z = zone('res');
    [[48, 64, 0], [214, 64, 1], [48, 236, 2], [214, 236, 3], [48, 408, 4]].forEach(([x, y, p]) => z.add('house', x, y, 98, 70, { pal: p }));
    z.add('shed', 240, 432, 44, 30);
    z.car(150, 80, true, 0);
    z.car(182, 300, true, 2);
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
    z.car(184, 450, true, 4);
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

  const start = checkpoints.find((c) => c.id === 'res');
  return { solids, barrels, checkpoints, supplies, caches, start: { x: start.x, y: start.y } };
}
