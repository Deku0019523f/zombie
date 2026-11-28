// Plan de la ville (données pures) : routes, maisons, épaves, obstacles, arbres.
// Le rendu (world.js) instancie ces éléments ; la simulation (sim.js) utilise `colliders`.
import { WORLD } from './config.js';
import { makeRng, pushOut } from './logic.js';
import { HOUSE_PLANS, planModels, wallBoxes, doorX } from './housePlans.js';
import { zoneAt, VILLAGE_HALF } from './zones.js';

// Dimensions [largeur x, longueur z] des modèles (yaw 0), mesurées dans les fichiers glTF.
const DIM = {
  'vehicles/Vehicle_Pickup': [2.31, 5.18], 'vehicles/Vehicle_Pickup_Armored': [2.4, 5.3],
  'vehicles/Vehicle_Truck': [2.71, 5.26], 'vehicles/Vehicle_Truck_Armored': [2.8, 5.4],
  'vehicles/Vehicle_Sports': [2.1, 4.6], 'vehicles/Vehicle_Sports_Armored': [2.2, 4.7],
  'environment/Container_Red': [5.71, 2.56], 'environment/Container_Green': [5.71, 2.56],
};
const ROAD = 8;             // taille d'une dalle de route
const CAB = { a: -110, b: -104, n: 6 };   // cabane de départ (au cœur de la forêt) : coin (a,b), 6 x 6 m, sur la grille de 2 m (sommets pairs)
const HOUSE_HALF = 4.1;     // marge pour les objets autour d'une maison

export function buildLayout(seed = 1337) {
  const rng = makeRng(seed), H = WORLD.half;
  const items = [];          // { model, x, z, yaw, scale? }
  const houses = [];         // { x, z, yaw, model, hw, hd }
  const colliders = [];
  const trees = [];          // { x, z, s, col }
  const ringTrees = [];
  const rocks = [];          // { x, z, s, col } : rochers à casser à la pioche
  const lootSpots = [];      // { id, kind, x, z, hw, hd } : points de fouille
  const spot = (kind, x, z, hw = 0.4, hd = 0.4) => lootSpots.push({ id: lootSpots.length, kind, x, z, hw, hd });

  // --- routes en croix (traversent tout le territoire) ---
  const RK = Math.floor((H - 4) / ROAD);
  for (let k = -RK; k <= RK; k++) {
    items.push({ model: k === 0 ? 'environment/Street_4Way.gltf' : 'environment/Street_Straight.gltf', x: k * ROAD, z: 0, yaw: k === 0 ? 0 : Math.PI / 2 });
    if (k !== 0) items.push({ model: 'environment/Street_Straight.gltf', x: 0, z: k * ROAD, yaw: 0 });
  }
  const onRoad = (x, z, m = 0) => Math.abs(z) < 4 + m || Math.abs(x) < 4 + m;

  const addBox = (model, x, z, yaw, jitter = 0, h = 1.6) => {
    const d = DIM[model]; if (!d) return null;
    const q = Math.round(yaw / (Math.PI / 2)) % 2 !== 0;   // quart de tour : on échange largeur/longueur
    const hw = (q ? d[1] : d[0]) / 2 - 0.1, hd = (q ? d[0] : d[1]) / 2 - 0.1;
    items.push({ model: model + '.gltf', x, z, yaw: yaw + jitter });
    colliders.push({ x, z, hw, hd, h });
    return { hw, hd };
  };
  const addCircle = (model, x, z, r, yaw = 0, scale = 1) => {
    items.push({ model: model + '.gltf', x, z, yaw, scale });
    if (r > 0) colliders.push({ x, z, r });
  };
  // sentier dégagé entre la cabane et la route principale (pour y rouler)
  const TRK = CAB.a + CAB.n / 2;
  const onTrack = (x, z, r = 0) => Math.abs(x - TRK) < 4 + r && z > CAB.b + CAB.n - 1 && z < 5;
  const free = (x, z, r, roadOk = false) => {
    if (onTrack(x, z, r)) return false;
    if (Math.abs(x) > H - 3 || Math.abs(z) > H - 3) return false;
    if (x > CAB.a - 3 - r && x < CAB.a + CAB.n + 3 + r && z > CAB.b - 3 - r && z < CAB.b + CAB.n + 3 + r) return false;   // la cabane et ses abords restent dégagés
    if (!roadOk && onRoad(x, z, 1)) return false;
    const p = { x, z };
    return pushOut(p, r, colliders) === 0 && !houses.some(h => Math.abs(h.x - x) < h.hw + r + 0.5 && Math.abs(h.z - z) < h.hd + r + 0.5);
  };

  // --- CABANE DE DÉPART (6 x 6 m) : murs statiques + toit + lit + caisse ; la porte est une pièce de la simulation ---
  const { a, b, n } = CAB, cx = a + n / 2, cz = b + n / 2, cp = [];
  const P = 'village/', PL = Math.PI;
  const sideModels = {
    back:  ['Wall_Plaster_Window_Wide_Flat', 'Wall_Plaster_Straight', 'Wall_Plaster_Window_Thin_Round'],
    front: ['Wall_Plaster_Straight', null, 'Wall_Plaster_Window_Wide_Flat'],
    left:  ['Wall_Plaster_Straight', 'Wall_Plaster_Window_Wide_Flat', 'Wall_Plaster_Straight'],
    right: ['Wall_Plaster_Straight', 'Wall_Plaster_Window_Thin_Round', 'Wall_Plaster_Straight'],
  };
  for (let i = 0; i < 3; i++) {
    const o = 1 + 2 * i;
    const add = (side, x, z, yaw, hw, hd) => { const m = sideModels[side][i]; if (!m) return; cp.push({ m: P + m + '.gltf', x, z, yaw }); colliders.push({ x, z, hw, hd, h: 3.1 }); };
    add('back', a + o, b, PL, 1, 0.22); add('front', a + o, b + n, 0, 1, 0.22);
    add('left', a, b + o, -PL / 2, 0.22, 1); add('right', a + n, b + o, PL / 2, 0.22, 1);
  }
  for (const [x, z] of [[a, b], [a + n, b], [a, b + n], [a + n, b + n]]) cp.push({ m: P + 'Corner_Exterior_Wood.gltf', x, z, yaw: 0 });
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) cp.push({ m: P + 'Floor_WoodDark.gltf', x: a + 1 + 2 * i, z: b + 1 + 2 * j, yaw: 0, y: 0.015 });
  cp.push({ m: P + 'Roof_RoundTiles_6x6.gltf', x: cx, z: cz, yaw: 0, y: 3.9, s: [0.74, 1, 0.75] });
  // mobilier « Cozy Interiors » (assets/models/interiors) : lit, table de chevet, armoire, table + chaise, tapis, lampe
  const IN = 'interiors/';
  cp.push({ m: IN + 'Decor/CI_Decor_Rug_LargeRect.glb', x: a + 3, z: b + 3, yaw: 0, y: 0.03 });
  cp.push({ m: IN + 'Bedroom/CI_Bedroom_Bed_Single.glb', x: a + 0.6, z: b + 1.15, yaw: 0 });          // le « lit »
  colliders.push({ x: a + 0.6, z: b + 1.15, hw: 0.45, hd: 1.0, h: 0.8 });
  cp.push({ m: IN + 'Bedroom/CI_Bedroom_BedsideTable_Drawer.glb', x: a + 1.4, z: b + 0.35, yaw: 0 });
  colliders.push({ x: a + 1.4, z: b + 0.35, hw: 0.23, hd: 0.2, h: 0.58 });
  cp.push({ m: IN + 'Bedroom/CI_Bedroom_Wardrobe_Narrow.glb', x: a + 3.2, z: b + 0.35, yaw: 0 });
  colliders.push({ x: a + 3.2, z: b + 0.35, hw: 0.36, hd: 0.3, h: 1.5 });
  cp.push({ m: IN + 'Kitchen/CI_Kitchen_Table.glb', x: a + 5.1, z: b + 4.6, yaw: 0 });
  colliders.push({ x: a + 5.1, z: b + 4.6, hw: 0.7, hd: 0.4, h: 0.75 });
  cp.push({ m: IN + 'Kitchen/CI_Kitchen_Chair.glb', x: a + 5.1, z: b + 3.8, yaw: Math.PI });
  colliders.push({ x: a + 5.1, z: b + 3.8, r: 0.22 });
  cp.push({ m: IN + 'Living/CI_Living_Lamp_Floor.glb', x: a + 0.5, z: b + 5.5, yaw: 0 });
  colliders.push({ x: a + 0.5, z: b + 5.5, r: 0.21 });
  cp.push({ m: P + 'Prop_Crate.gltf', x: a + 5, z: b + 1, yaw: 0.3, s: [0.8, 0.8, 0.8] });   // caisse : 1 conserve + 1 bandage
  colliders.push({ x: a + 5, z: b + 1, hw: 0.45, hd: 0.45, h: 0.9 });
  spot('cabin', a + 5, b + 1, 0.45, 0.45);
  cp.push({ m: 'environment/Chest.gltf', x: a + n + 4, z: b + n - 1, yaw: -PL / 2 });         // coffre à outils devant la cabane : la pioche
  colliders.push({ x: a + n + 4, z: b + n - 1, hw: 0.55, hd: 0.55, h: 0.9 });
  spot('tools', a + n + 4, b + n - 1, 0.55, 0.55);
  const cabin = { a, b, n, cx, cz, lights: [{ x: a + 0.5, y: 1.4, z: b + 5.5 }], pieces: cp, door: { x: a + 3, z: b + n, yaw: 0 }, models: [...new Set(cp.map(q => q.m))] };
  const spawn = { x: cx, z: cz + 0.2, yaw: 0 };

  // --- aides de placement ---
  const V = VILLAGE_HALF, rnd = (lo, hi) => lo + rng() * (hi - lo);
  const scatter = (zone, n, fn, r = 1, roadOk = false) => {
    for (let i = 0, ok = 0; i < n * 8 && ok < n; i++) {
      const x = rnd(-H + 6, H - 6), z = rnd(-H + 6, H - 6);
      if (zoneAt(x, z) !== zone || !free(x, z, r, roadOk)) continue;
      fn(x, z); ok++;
    }
  };

  // --- maisons : 6 modèles bâtis avec Parts/ (voir housePlans.js). phi = rotation ; la façade regarde (sin phi, cos phi). ---
  const placeHouse = (plan, cxw, czw, phi) => {
    const W = plan.W, D = plan.D, q = Math.abs(Math.round(phi / (Math.PI / 2))) % 2 === 1, ex = (q ? D : W) / 2, ez = (q ? W : D) / 2;
    if (Math.abs(cxw) + ex > H - 8 || Math.abs(czw) + ez > H - 8) return false;
    if (cxw + ex > CAB.a - 6 && cxw - ex < CAB.a + CAB.n + 6 && czw + ez > CAB.b - 6 && czw - ez < CAB.b + CAB.n + 6) return false;
    if ((cxw + ex > -5.5 && cxw - ex < 5.5) || (czw + ez > -5.5 && czw - ez < 5.5)) return false;   // jamais sur la route
    if (cxw + ex > TRK - 4 && cxw - ex < TRK + 4 && czw + ez > CAB.b && czw - ez < 6) return false;   // ni sur le sentier de la cabane
    if (houses.some(h => Math.abs(h.x - cxw) < h.ex + ex + 1.5 && Math.abs(h.z - czw) < h.ez + ez + 1.5)) return false;
    const c = Math.cos(phi), sn = Math.sin(phi);
    const T = (lx, lz) => { const u = lx - W / 2, v = lz - D / 2; return [cxw + u * c + v * sn, czw - u * sn + v * c]; };   // repère maison -> monde
    const dx = doorX(plan), door = T(dx, D);
    const h = { x: cxw, z: czw, yaw: phi, plan, hw: W / 2, hd: D / 2, ex, ez, door: { x: door[0], z: door[1] } };
    houses.push(h);
    for (const [bx, bz, hx, hz] of wallBoxes(plan)) { const [wx, wz] = T(bx, bz); colliders.push({ x: wx, z: wz, hw: q ? hz : hx, hd: q ? hx : hz, h: 5 }); }
    for (const [, px, pz, yw, hx, hz] of plan.props) { const [wx, wz] = T(px, pz), qq = Math.abs(Math.sin(yw + phi)) > 0.5; colliders.push({ x: wx, z: wz, hw: qq ? hz : hx, hd: qq ? hx : hz, h: 1.2 }); }
    { const [lx, lz] = T(plan.loot[0], plan.loot[1]); spot('house', lx, lz, 0.6, 0.6); h.crate = { x: lx, z: lz }; colliders.push({ x: lx, z: lz, hw: 0.3, hd: 0.3, h: 0.6 }); }
    const [px, pz] = T(dx + 1.4, D + 0.9);                          // porche : une caisse devant la porte
    items.push({ model: 'village/Prop_Crate.gltf', x: px, z: pz, yaw: rng() * 3, scale: 0.55 });
    spot('house', px, pz, 0.35, 0.35);
    return true;
  };
  const pickPlan = (list) => HOUSE_PLANS[list[Math.floor(rng() * list.length)]];
  // village : deux rues de maisons le long de chaque axe (jamais deux voisines identiques)
  let prev = -1;
  const along = [-62, -50, -38, -26, -14, 14, 26, 38, 50, 62];
  for (const axis of ['x', 'z']) for (const s of [-1, 1]) for (const t of along) {
    if (rng() < 0.2) continue;
    prev = (prev + 1 + Math.floor(rng() * (HOUSE_PLANS.length - 1)) + HOUSE_PLANS.length) % HOUSE_PLANS.length;
    const plan = HOUSE_PLANS[prev];
    if (axis === 'x') placeHouse(plan, t, s * (7.5 + plan.D / 2), s < 0 ? 0 : Math.PI);
    else placeHouse(plan, s * (7.5 + plan.D / 2), t, s < 0 ? Math.PI / 2 : -Math.PI / 2);
  }
  // hors du village : habitations isolées selon la zone (indices : 0 cabane, 1 maisonnette, 2 familiale, 3 ferme, 4 étage, 5 villa)
  const outskirts = { forest: [[0, 1], 5], farm: [[3, 3, 2, 1], 9], industrial: [[2, 3, 4], 4], quarry: [[0, 1, 2], 4] };
  for (const [zone, [list, n]] of Object.entries(outskirts)) {
    for (let i = 0, ok = 0; i < 200 && ok < n; i++) {
      const x = rnd(-H + 14, H - 14), z = rnd(-H + 14, H - 14);
      if (zoneAt(x, z) !== zone || (Math.abs(x) < 16 || Math.abs(z) < 16)) continue;
      if (placeHouse(pickPlan(list), x, z, Math.floor(rng() * 4) * Math.PI / 2)) ok++;
    }
  }
  if (zoneAt(CAB.a, CAB.b) !== 'forest') console.warn('[layout] la cabane devrait être en forêt');

  // --- épaves de véhicules sur les routes (axes alignés pour que la boîte de collision colle) ---
  const cars = ['vehicles/Vehicle_Pickup', 'vehicles/Vehicle_Truck', 'vehicles/Vehicle_Sports', 'vehicles/Vehicle_Pickup_Armored', 'vehicles/Vehicle_Sports_Armored'];
  for (let i = 0; i < 70; i++) {
    const alongX = rng() < 0.5, t = (rng() * 2 - 1) * (H - 14);
    if (Math.abs(t) < 9) continue;                       // laisser le carrefour libre
    const lane = (rng() < 0.5 ? -1 : 1) * (1.4 + rng() * 0.8);
    const x = alongX ? t : lane, z = alongX ? lane : t;
    const yaw = (alongX ? Math.PI / 2 : 0) + (rng() < 0.5 ? 0 : Math.PI);
    if (!free(x, z, 3, true)) continue;
    const bx = addBox(cars[Math.floor(rng() * cars.length)], x, z, yaw, (rng() - 0.5) * 0.12, 1.6);
    if (bx) spot('car', x, z, bx.hw, bx.hd);
  }

  // --- véhicules utilisables (voir vehicles.js) : un pick-up devant la cabane, les autres garés sur les routes ---
  const vehicles = [], vModels = ['vehicles/Vehicle_Pickup.gltf', 'vehicles/Vehicle_Sports.gltf', 'vehicles/Vehicle_Truck.gltf', 'vehicles/Vehicle_Pickup_Armored.gltf', 'vehicles/Vehicle_Sports_Armored.gltf', 'vehicles/Vehicle_Truck_Armored.gltf'];
  const addVehicle = (model, x, z, yaw) => vehicles.push({ id: vehicles.length, model, x, z, yaw });
  addVehicle(vModels[0], TRK, CAB.b + CAB.n + 11, 0);
  for (let i = 0, ok = 0; i < 400 && ok < 22; i++) {
    const alongX = rng() < 0.5, t = (rng() * 2 - 1) * (H - 16);
    if (Math.abs(t) < 12) continue;
    const lane = (rng() < 0.5 ? -1 : 1) * 2;
    const x = alongX ? t : lane, z = alongX ? lane : t, yaw = (alongX ? Math.PI / 2 : 0) + (rng() < 0.5 ? 0 : Math.PI);
    if (!free(x, z, 3.2, true) || vehicles.some(v => Math.hypot(v.x - x, v.z - z) < 14)) continue;
    addVehicle(vModels[1 + Math.floor(rng() * 5)], x, z, yaw); ok++;
  }

  // --- lampadaires le long de l'axe X, dans le village ---
  for (let x = -64; x <= 64; x += 16) { if (Math.abs(x) < 6) continue; addCircle('environment/StreetLights', x, 5.1, 0.25, Math.PI); addCircle('environment/StreetLights', x + 8, -5.1, 0.25, 0); }

  // --- décor propre à chaque zone ---
  const container = (x, z) => { const bx = addBox(rng() < 0.5 ? 'environment/Container_Red' : 'environment/Container_Green', x, z, rng() < 0.5 ? 0 : Math.PI / 2, 0, 2.6); if (bx) spot('container', x, z, bx.hw, bx.hd); };
  const smalls = {
    village:    [['environment/Barrel', 0.4], ['village/Prop_Crate', 0.4], ['environment/TrashBag_1', 0], ['environment/TrashBag_2', 0], ['environment/Pallet', 0], ['environment/CinderBlock', 0.25]],
    industrial: [['environment/Barrel', 0.4], ['environment/Barrel', 0.4], ['environment/PlasticBarrier', 0.5], ['environment/Pallet', 0], ['environment/TrafficCone_1', 0], ['environment/FireHydrant', 0.3], ['environment/Wheels_Stack', 0.5]],
    farm:       [['village/Prop_Crate', 0.4], ['environment/Barrel', 0.4], ['environment/Pallet', 0], ['environment/TrashBag_1', 0]],
    quarry:     [['environment/CinderBlock', 0.25], ['environment/Wheels_Stack', 0.5], ['environment/Barrel', 0.4], ['environment/Pallet', 0]],
    forest:     [['environment/TrashBag_2', 0], ['village/Prop_Crate', 0.4]],
  };
  const smallCount = { village: 40, industrial: 90, farm: 55, quarry: 40, forest: 18 };
  for (const zone of Object.keys(smallCount)) {
    const list = smalls[zone];
    scatter(zone, smallCount[zone], (x, z) => {
      const [m, r] = list[Math.floor(rng() * list.length)];
      addCircle(m, x, z, r, rng() * Math.PI * 2);
      if (m.endsWith('Barrel') && r > 0.3) spot('barrel', x, z, 0.3, 0.3);
      else if (m.includes('TrashBag')) spot('trash', x, z, 0.3, 0.3);
    }, 0.8, zone === 'village');
  }
  scatter('industrial', 22, container, 3.2); scatter('quarry', 4, container, 3.2); scatter('farm', 3, container, 3.2); scatter('village', 2, container, 3.2);
  scatter('industrial', 4, (x, z) => addCircle('environment/WaterTower', x, z, 1.7), 2.5); scatter('farm', 2, (x, z) => addCircle('environment/WaterTower', x, z, 1.7), 2.5);

  // --- arbres (tronc = collision) ---
  const addTree = (x, z, lo = 0.8, hi = 1.5) => { const s = rnd(lo, hi), col = { x, z, r: 0.35 * s }; trees.push({ x, z, s, col }); colliders.push(col); };
  const treeCount = { forest: 520, village: 30, farm: 70, industrial: 28, quarry: 26 };
  for (const zone of Object.keys(treeCount)) scatter(zone, treeCount[zone], (x, z) => addTree(x, z), 0.7);
  // quelques arbres et rochers à portée de la cabane (premiers matériaux)
  const near = (count, rMin, rMax, rad, make) => {
    for (let i = 0, ok = 0; i < 80 && ok < count; i++) {
      const ang = rng() * Math.PI * 2, d = rMin + rng() * (rMax - rMin), x = cx + Math.cos(ang) * d, z = cz + Math.sin(ang) * d;
      const q = { x, z }; if (Math.abs(x) > H - 4 || Math.abs(z) > H - 4 || onTrack(x, z, rad) || pushOut(q, rad, colliders) > 0) continue;
      if (x > a - 2 && x < a + n + 2 && z > b - 2 && z < b + n + 2) continue;
      make(x, z); ok++;
    }
  };
  near(7, 7, 15, 1.0, (x, z) => addTree(x, z, 0.9, 1.5));
  const addRock = (x, z) => { const s = 0.8 + rng() * 0.8, col = { x, z, r: 0.62 * s }; rocks.push({ x, z, s, col }); colliders.push(col); };
  near(3, 8, 16, 1.2, addRock);
  const rockCount = { quarry: 80, forest: 14, industrial: 8, farm: 10, village: 5 };
  for (const zone of Object.keys(rockCount)) scatter(zone, rockCount[zone], addRock, 1.2);
  // couronne d'arbres décoratifs autour de l'enceinte
  for (let i = 0; i < 520; i++) {
    const side = Math.floor(rng() * 4), t = rnd(-H - 16, H + 16), o = H + 2 + rng() * 14;
    const x = side < 2 ? t : (side === 2 ? -o : o), z = side < 2 ? (side === 0 ? -o : o) : t;
    ringTrees.push({ x, z, s: 1 + rng() * 0.9 });
  }
  // enceinte : clôture métallique sur tout le pourtour (instanciée par morceaux de 1,95 m)
  const fence = 'village/Prop_MetalFence_Simple.gltf', step = 1.95;
  for (let x = -H; x <= H; x += step) { items.push({ model: fence, x, z: H, yaw: 0 }, { model: fence, x, z: -H, yaw: Math.PI }); }
  for (let z = -H; z <= H; z += step) { items.push({ model: fence, x: H, z, yaw: Math.PI / 2 }, { model: fence, x: -H, z, yaw: -Math.PI / 2 }); }

  // --- herbe décorative (aucune collision), plus dense en forêt et à la campagne ---
  const grass = [], grassCount = { village: 150, forest: 700, industrial: 80, farm: 650, quarry: 110 };
  for (const zone of Object.keys(grassCount)) {
    for (let i = 0, ok = 0; i < grassCount[zone] * 4 && ok < grassCount[zone]; i++) {
      const x = rnd(-H + 1, H - 1), z = rnd(-H + 1, H - 1);
      if (zoneAt(x, z) !== zone || onRoad(x, z, 0.5) || (Math.abs(x - cabin.cx) < 5 && Math.abs(z - cabin.cz) < 5)) continue;      // pas d'herbe dans la cabane
      if (houses.some(h => Math.abs(h.x - x) < h.ex + 0.5 && Math.abs(h.z - z) < h.ez + 0.5)) continue;
      grass.push({ model: 'vegetation/Grass_' + (1 + Math.floor(rng() * 4)) + '.glb', x, z, yaw: rng() * Math.PI * 2, scale: 0.9 + rng() * 0.8 }); ok++;
    }
  }


  // --- PNJ : camps de gang, postes de police, étals de marchand (rng à part : ne décale pas le reste du plan) ---
  const nrng = makeRng(seed + 777), nr = (lo, hi) => lo + nrng() * (hi - lo);
  const npcs = [], camps = [], CJ = '../nouveau/cenji_urban_props/';
  const addNpc = (type, x, z, yaw, kind) => npcs.push({ id: npcs.length, type, x, z, yaw, kind });
  const prop = (m, x, z, yaw, r = 0, scale = 1) => { items.push({ model: CJ + m + '.glb', x, z, yaw, scale }); if (r > 0) colliders.push({ x, z, r }); };
  const farFromVeh = (x, z, d) => !vehicles.some(v => Math.hypot(v.x - x, v.z - z) < d);
  const findSpot = (zones, r, ok = () => true, tries = 500, roadOk = false) => {
    for (let i = 0; i < tries; i++) {
      const x = nr(-H + 20, H - 20), z = nr(-H + 20, H - 20);
      if (zones.includes(zoneAt(x, z)) && free(x, z, r, roadOk) && farFromVeh(x, z, r + 3) && ok(x, z)) return [x, z];
    }
    return null;
  };
  const farFromCab = (d) => (x, z) => Math.hypot(x - cabin.cx, z - cabin.cz) > d;
  const campFar = (x, z) => camps.every(c => Math.hypot(c.x - x, c.z - z) > 60);
  // camp de gang : enceinte de barricades, fûts, caisses ; 3 pillards au corps à corps, 2 tireurs, 1 chien
  const gangCamp = (zones, far = 0) => {
    const p = findSpot(zones, 9, (x, z) => campFar(x, z) && farFromCab(Math.max(far, 70))(x, z) && Math.hypot(x, z) > 60); if (!p) return;
    const [x, z] = p, a0 = nr(0, 6.28); camps.push({ role: 'gang', x, z });
    for (let k = 0; k < 7; k++) { const a = a0 + k * Math.PI * 2 / 7; if (k === 0) continue; prop('Barricade_Striped', x + Math.sin(a) * 6.5, z + Math.cos(a) * 6.5, a + Math.PI / 2, 0.8); }
    for (let k = 0; k < 3; k++) prop('Oil_Drum', x + nr(-3, 3), z + nr(-3, 3), nr(0, 6), 0.4);
    prop('Crate_Stack', x + 2.5, z - 1.5, nr(0, 6), 0.7); prop('Crate_Stack', x - 2.2, z + 2, nr(0, 6), 0.7); prop('Traffic_Cone_Worn', x + 1, z + 3, 0, 0, 1);
    const spots = [[2, 1], [-2, 2], [0, -3], [3, 3], [-3, -1], [1, 4]].map(([dx, dz]) => [x + dx, z + dz]);
    ['gang_melee', 'gang_melee', 'gang_melee', 'gang_gun', 'gang_gun', 'gang_dog'].forEach((t, k) => addNpc(t, spots[k][0], spots[k][1], nr(0, 6.28)));
  };
  gangCamp(['industrial']); gangCamp(['industrial']); gangCamp(['quarry']); gangCamp(['farm']); gangCamp(['forest'], 55);
  // poste de police sur l'axe est-ouest du village : deux barricades laissant passer un véhicule, cônes, deux agents
  for (const sx of [-1, 1]) {
    for (let t = 20; t <= 66; t += 2) {
      const x = sx * t;
      if (!free(x, 0, 3.6, true) || !free(x + sx * 2.2, 4.9, 1, true) || !free(x + sx * 2.2, -4.9, 1, true) || !farFromVeh(x, 0, 6)) continue;
      camps.push({ role: 'police', x, z: 0 });
      for (const s of [-1, 1]) { prop('Barricade_Striped', x, s * 3.1, Math.PI / 2, 0.8); prop('Traffic_Cone_Clean', x - sx * 2.5, s * 1.7, 0); prop('Traffic_Cone_Clean', x - sx * 4.5, s * 2.2, 0); addNpc('police', x + sx * 2.2, s * 4.9, s < 0 ? 0 : Math.PI); }
      break;
    }
  }
  // étal de marchand : table(s) devant lui, parasol, caisses ; il fait face à `yaw`
  const stall = (x, z, yaw, kind) => {
    const fx = Math.sin(yaw), fz = Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
    camps.push({ role: 'merchant', x, z });
    addNpc('merchant', x, z, yaw, kind);
    prop('Cafe_Table', x + fx * 1.3, z + fz * 1.3, yaw, 0.55); prop('Cafe_Table', x + fx * 1.3 + rx * 1.3, z + fz * 1.3 + rz * 1.3, yaw, 0.55);
    prop('Cafe_Umbrella_Stand', x - rx * 1.3, z - rz * 1.3, 0, 0.4); prop('Crate_Stack', x - fx * 1.4, z - fz * 1.4, yaw, 0.7);
    prop('Sandwich_Board', x + fx * 2.3 - rx * 0.9, z + fz * 2.3 - rz * 0.9, yaw + 0.4, 0.35);
  };
  const stallAt = (zones, kind, ok) => { const p = findSpot(zones, 3.2, ok); if (p) stall(p[0], p[1], Math.floor(nr(0, 4)) * Math.PI / 2, kind); };
  stallAt(['village'], 'general', (x, z) => Math.abs(x) > 12 && Math.abs(z) > 12);
  stallAt(['forest'], 'general', (x, z) => { const d = Math.hypot(x - cabin.cx, z - cabin.cz); return d > 24 && d < 55; });
  stallAt(['farm'], 'farm'); stallAt(['industrial'], 'arms', campFar); stallAt(['quarry'], 'arms', campFar);


  // --- décor naturel Quaternius : buissons, souches, champs de blé / maïs (rng à part) ---
  const grng = makeRng(seed + 4242), gr = (lo, hi) => lo + grng() * (hi - lo);
  const bushes = [], stumps = [], fields = [];
  const gscatter = (zone, count, fn, r) => { for (let i = 0, ok = 0; i < count * 8 && ok < count; i++) { const x = gr(-H + 8, H - 8), z = gr(-H + 8, H - 8); if (zoneAt(x, z) === zone && free(x, z, r)) { fn(x, z); ok++; } } };
  const bushCount = { forest: 120, village: 40, farm: 40, industrial: 10, quarry: 12 };
  for (const zone of Object.keys(bushCount)) gscatter(zone, bushCount[zone], (x, z) => bushes.push({ x, z, s: gr(0.8, 1.4), yaw: gr(0, 6.28), v: Math.floor(gr(0, 3)) }), 0.8);
  const stumpCount = { forest: 40, quarry: 12, farm: 8 };
  for (const zone of Object.keys(stumpCount)) gscatter(zone, stumpCount[zone], (x, z) => { stumps.push({ x, z, s: gr(0.8, 1.2), yaw: gr(0, 6.28), moss: zone === 'forest' }); colliders.push({ x, z, r: 0.5 }); }, 1.0);
  // champs : carrés plantés, un modèle par plante (blé serré, maïs plus espacé)
  for (let f = 0; f < 6; f++) {
    const crop = f % 2 ? 'corn' : 'wheat', side = crop === 'wheat' ? 10 : 11, step = crop === 'wheat' ? 0.75 : 1.2;
    let p = null;
    for (let i = 0; i < 400 && !p; i++) { const x = gr(-H + 20, H - 20), z = gr(-H + 20, H - 20); if (zoneAt(x, z) === 'farm' && Math.abs(x) > 24 && Math.abs(z) > 24 && free(x, z, side * 0.75) && fields.every(q => Math.hypot(q.x - x, q.z - z) > 18)) p = [x, z]; }
    if (!p) continue;
    const plants = [], n2 = Math.floor(side / step);
    for (let i = 0; i < n2; i++) for (let j = 0; j < n2; j++) plants.push({ x: p[0] + (i - (n2 - 1) / 2) * step + gr(-0.12, 0.12), z: p[1] + (j - (n2 - 1) / 2) * step + gr(-0.12, 0.12), s: gr(0.9, 1.3), yaw: gr(0, 6.28) });
    fields.push({ x: p[0], z: p[1], side, crop, plants });
  }

  const models = new Set([...items.map(i => i.model), ...grass.map(g => g.model), ...vehicles.map(v => v.model)]);
  return { half: H, items, houses, colliders, trees, ringTrees, rocks, lootSpots, cabin, spawn, grass, vehicles, npcs, camps, bushes, stumps, fields, models: [...models], houseModels: planModels(), isFree: free, onRoad, rng, zoneAt };
}
