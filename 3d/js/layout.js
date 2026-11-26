// Plan de la ville (données pures) : routes, maisons, épaves, obstacles, arbres.
// Le rendu (world.js) instancie ces éléments ; la simulation (sim.js) utilise `colliders`.
import { WORLD } from './config.js';
import { makeRng, pushOut } from './logic.js';

// Dimensions [largeur x, longueur z] des modèles (yaw 0), mesurées dans les fichiers glTF.
const DIM = {
  'vehicles/Vehicle_Pickup': [2.31, 5.18], 'vehicles/Vehicle_Pickup_Armored': [2.4, 5.3],
  'vehicles/Vehicle_Truck': [2.71, 5.26], 'vehicles/Vehicle_Truck_Armored': [2.8, 5.4],
  'vehicles/Vehicle_Sports': [2.1, 4.6], 'vehicles/Vehicle_Sports_Armored': [2.2, 4.7],
  'environment/Container_Red': [5.71, 2.56], 'environment/Container_Green': [5.71, 2.56],
};
const ROAD = 8;             // taille d'une dalle de route
const CAB = { a: -32, b: -34, n: 6 };   // cabane de départ : coin (a,b), 6 x 6 m, sur la grille de 2 m (sommets pairs)
const HOUSE_HALF = 4.1;     // maison = 4 x 4 modules de 2 m

export function buildLayout(seed = 1337) {
  const rng = makeRng(seed), H = WORLD.half;
  const items = [];          // { model, x, z, yaw, scale? }
  const houses = [];         // { x, z, yaw }
  const colliders = [];
  const trees = [];          // { x, z, s, col }
  const ringTrees = [];
  const rocks = [];          // { x, z, s, col } : rochers à casser à la pioche
  const lootSpots = [];      // { id, kind, x, z, hw, hd } : points de fouille
  const spot = (kind, x, z, hw = 0.4, hd = 0.4) => lootSpots.push({ id: lootSpots.length, kind, x, z, hw, hd });

  // --- routes en croix ---
  for (let k = -6; k <= 6; k++) {
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
  const free = (x, z, r, roadOk = false) => {
    if (Math.abs(x) > H - 3 || Math.abs(z) > H - 3) return false;
    if (x > CAB.a - 3 - r && x < CAB.a + CAB.n + 3 + r && z > CAB.b - 3 - r && z < CAB.b + CAB.n + 3 + r) return false;   // la cabane et ses abords restent dégagés
    if (!roadOk && onRoad(x, z, 1)) return false;
    const p = { x, z };
    return pushOut(p, r, colliders) === 0 && !houses.some(h => Math.abs(h.x - x) < HOUSE_HALF + r + 0.5 && Math.abs(h.z - z) < HOUSE_HALF + r + 0.5);
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

  // --- maisons de part et d'autre de la route principale (axe X) ---
  const xs = [-50, -38, -26, -14, 14, 26, 38, 50];
  for (const s of [-1, 1]) {
    for (const x of xs) {
      if (rng() < 0.22) continue;
      const z = s * 11, yaw = s > 0 ? Math.PI : 0;     // la façade (+z local) regarde la route
      houses.push({ x, z, yaw });
      colliders.push({ x, z, hw: HOUSE_HALF, hd: HOUSE_HALF, h: 5 });
      const px = x, pz = z - s * 5.3;                         // porche : devant la porte, côté route
      items.push({ model: 'village/Prop_Crate.gltf', x: px, z: pz, yaw: rng() * 3, scale: 0.55 });
      spot('house', px, pz, 0.35, 0.35);
    }
  }

  // --- épaves de véhicules sur les routes (axes alignés pour que la boîte de collision colle) ---
  const cars = ['vehicles/Vehicle_Pickup', 'vehicles/Vehicle_Truck', 'vehicles/Vehicle_Sports', 'vehicles/Vehicle_Pickup_Armored', 'vehicles/Vehicle_Sports_Armored'];
  for (let i = 0; i < 12; i++) {
    const alongX = rng() < 0.5, t = (rng() * 2 - 1) * 44;
    if (Math.abs(t) < 9) continue;                       // laisser le carrefour libre
    const lane = (rng() < 0.5 ? -1 : 1) * (1.4 + rng() * 0.8);
    const x = alongX ? t : lane, z = alongX ? lane : t;
    const yaw = (alongX ? Math.PI / 2 : 0) + (rng() < 0.5 ? 0 : Math.PI);
    if (!free(x, z, 3, true)) continue;
    const bx = addBox(cars[Math.floor(rng() * cars.length)], x, z, yaw, (rng() - 0.5) * 0.12, 1.6);
    if (bx) spot('car', x, z, bx.hw, bx.hd);
  }

  // --- lampadaires le long de l'axe X ---
  for (let x = -48; x <= 48; x += 16) { if (Math.abs(x) < 6) continue; addCircle('environment/StreetLights', x, 5.1, 0.25, Math.PI); addCircle('environment/StreetLights', x + 8, -5.1, 0.25, 0); }

  // --- champs : conteneurs, barils, palettes, cônes, sacs, bornes ---
  for (let i = 0; i < 7; i++) {
    for (let tries = 0; tries < 20; tries++) {
      const x = (rng() * 2 - 1) * (H - 8), z = (rng() * 2 - 1) * (H - 8), yaw = rng() < 0.5 ? 0 : Math.PI / 2;
      if (!free(x, z, 3.2)) continue;
      const bx = addBox(rng() < 0.5 ? 'environment/Container_Red' : 'environment/Container_Green', x, z, yaw, 0, 2.6);
      if (bx) spot('container', x, z, bx.hw, bx.hd);
      break;
    }
  }
  const smalls = [['environment/Barrel', 0.4], ['environment/Barrel', 0.4], ['environment/PlasticBarrier', 0.5], ['environment/Pallet', 0], ['environment/TrashBag_1', 0], ['environment/TrashBag_2', 0], ['environment/TrafficCone_1', 0], ['environment/FireHydrant', 0.3], ['environment/CinderBlock', 0.25], ['environment/Wheels_Stack', 0.5]];
  for (let i = 0; i < 70; i++) {
    const [m, r] = smalls[Math.floor(rng() * smalls.length)];
    const x = (rng() * 2 - 1) * (H - 5), z = (rng() * 2 - 1) * (H - 5);
    if (!free(x, z, r + 0.4, true)) continue;
    addCircle(m, x, z, r, rng() * Math.PI * 2);
    if (m.endsWith('Barrel') && r > 0.3) spot('barrel', x, z, 0.3, 0.3);
    else if (m.includes('TrashBag')) spot('trash', x, z, 0.3, 0.3);
  }
  // château d'eau lointain
  for (const [x, z] of [[-40, -40], [42, 38]]) if (free(x, z, 2)) addCircle('environment/WaterTower', x, z, 1.7);

  // --- arbres (tronc = collision) + couronne décorative hors de l'enceinte ---
  for (let i = 0; i < 90; i++) {
    const x = (rng() * 2 - 1) * (H - 3), z = (rng() * 2 - 1) * (H - 3);
    if (!free(x, z, 0.7)) continue;
    const s = 0.8 + rng() * 0.7, col = { x, z, r: 0.35 * s }; trees.push({ x, z, s, col }); colliders.push(col);
  }
  // quelques arbres et rochers à portée de la cabane (premiers matériaux)
  const near = (list, count, rMin, rMax, rad, make) => {
    for (let i = 0, ok = 0; i < 80 && ok < count; i++) {
      const ang = rng() * Math.PI * 2, d = rMin + rng() * (rMax - rMin), x = cx + Math.cos(ang) * d, z = cz + Math.sin(ang) * d;
      const q = { x, z }; if (Math.abs(x) > H - 4 || Math.abs(z) > H - 4 || pushOut(q, rad, colliders) > 0) continue;
      if (x > a - 2 && x < a + n + 2 && z > b - 2 && z < b + n + 2) continue;
      make(x, z); ok++;
    }
  };
  near(trees, 7, 7, 15, 1.0, (x, z) => { const s = 0.9 + rng() * 0.6, col = { x, z, r: 0.35 * s }; trees.push({ x, z, s, col }); colliders.push(col); });
  const addRock = (x, z) => { const s = 0.8 + rng() * 0.8, col = { x, z, r: 0.62 * s }; rocks.push({ x, z, s, col }); colliders.push(col); };
  near(rocks, 3, 8, 16, 1.2, addRock);
  for (let i = 0, ok = 0; i < 120 && ok < 16; i++) {
    const x = (rng() * 2 - 1) * (H - 6), z = (rng() * 2 - 1) * (H - 6);
    if (!free(x, z, 1.2)) continue; addRock(x, z); ok++;
  }
  for (let i = 0; i < 160; i++) {
    const a = rng() * Math.PI * 2, d = H + 4 + rng() * 14;
    const x = Math.max(-H - 18, Math.min(H + 18, Math.cos(a) * d * 1.05)), z = Math.max(-H - 18, Math.min(H + 18, Math.sin(a) * d * 1.05));
    if (Math.abs(x) < H + 2 && Math.abs(z) < H + 2) continue;
    ringTrees.push({ x, z, s: 1 + rng() * 0.9 });
  }

  // --- herbe décorative (aucune collision) ---
  const grass = [];
  for (let i = 0; i < 260; i++) {
    const x = (rng() * 2 - 1) * (H - 1), z = (rng() * 2 - 1) * (H - 1);
    if (onRoad(x, z, 0.5) || (Math.abs(x - cabin.cx) < 5 && Math.abs(z - cabin.cz) < 5)) continue;      // pas d'herbe dans la cabane
    grass.push({ model: 'vegetation/Grass_' + (1 + Math.floor(rng() * 4)) + '.glb', x, z, yaw: rng() * Math.PI * 2, scale: 0.9 + rng() * 0.8 });
  }

  const models = new Set(items.map(i => i.model));
  return { half: H, items, houses, colliders, trees, ringTrees, rocks, lootSpots, cabin, spawn, grass, models: [...models], isFree: free, onRoad, rng };
}

// Pièces d'une maison 8 x 8 m (coordonnées locales, +z = façade). Utilisé par world.js.
export function housePieces(rng) {
  const P = [], W = 'village/';
  const mods = [-3, -1, 1, 3];
  const pick = (a) => a[Math.floor(rng() * a.length)];
  const doorAt = Math.floor(rng() * 4);
  const wallSet = rng() < 0.6 ? ['Wall_Plaster_Straight', 'Wall_Plaster_Window_Wide_Flat', 'Wall_Plaster_Window_Thin_Round'] : ['Wall_UnevenBrick_Straight', 'Wall_UnevenBrick_Window_Wide_Flat', 'Wall_UnevenBrick_Door_Flat'];
  const door = wallSet[0].includes('Uneven') ? 'Wall_UnevenBrick_Door_Flat' : 'Wall_Plaster_Door_Flat';
  mods.forEach((m, i) => {
    P.push({ m: W + (i === doorAt ? door : pick(wallSet)), x: m, z: 4, yaw: 0 });                      // façade
    P.push({ m: W + pick(wallSet.slice(0, 2)), x: m, z: -4, yaw: Math.PI });                           // arrière
    P.push({ m: W + pick(wallSet.slice(0, 2)), x: 4, z: m, yaw: Math.PI / 2 });                        // côté droit
    P.push({ m: W + pick(wallSet.slice(0, 2)), x: -4, z: m, yaw: -Math.PI / 2 });                      // côté gauche
  });
  for (const [x, z] of [[4, 4], [-4, 4], [4, -4], [-4, -4]]) P.push({ m: W + 'Corner_Exterior_Wood', x, z, yaw: 0 });
  P.push({ m: W + 'Roof_RoundTiles_6x6', x: 0, z: 0, yaw: rng() < 0.5 ? 0 : Math.PI, y: 3.12 + 0.78 });
  return P;
}
