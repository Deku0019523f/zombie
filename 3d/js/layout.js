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
const HOUSE_HALF = 4.1;     // maison = 4 x 4 modules de 2 m

export function buildLayout(seed = 1337) {
  const rng = makeRng(seed), H = WORLD.half;
  const items = [];          // { model, x, z, yaw, scale? }
  const houses = [];         // { x, z, yaw }
  const colliders = [];
  const trees = [];          // { x, z, s }
  const ringTrees = [];

  // --- routes en croix ---
  for (let k = -6; k <= 6; k++) {
    items.push({ model: k === 0 ? 'environment/Street_4Way.gltf' : 'environment/Street_Straight.gltf', x: k * ROAD, z: 0, yaw: k === 0 ? 0 : Math.PI / 2 });
    if (k !== 0) items.push({ model: 'environment/Street_Straight.gltf', x: 0, z: k * ROAD, yaw: 0 });
  }
  const onRoad = (x, z, m = 0) => Math.abs(z) < 4 + m || Math.abs(x) < 4 + m;

  const addBox = (model, x, z, yaw, jitter = 0) => {
    const d = DIM[model]; if (!d) return;
    const q = Math.round(yaw / (Math.PI / 2)) % 2 !== 0;   // quart de tour : on échange largeur/longueur
    const hw = (q ? d[1] : d[0]) / 2 - 0.1, hd = (q ? d[0] : d[1]) / 2 - 0.1;
    items.push({ model: model + '.gltf', x, z, yaw: yaw + jitter });
    colliders.push({ x, z, hw, hd });
  };
  const addCircle = (model, x, z, r, yaw = 0, scale = 1) => {
    items.push({ model: model + '.gltf', x, z, yaw, scale });
    if (r > 0) colliders.push({ x, z, r });
  };
  const free = (x, z, r, roadOk = false) => {
    if (Math.abs(x) > H - 3 || Math.abs(z) > H - 3) return false;
    if (!roadOk && onRoad(x, z, 1)) return false;
    const p = { x, z };
    return pushOut(p, r, colliders) === 0 && !houses.some(h => Math.abs(h.x - x) < HOUSE_HALF + r + 0.5 && Math.abs(h.z - z) < HOUSE_HALF + r + 0.5);
  };

  // --- maisons de part et d'autre de la route principale (axe X) ---
  const xs = [-50, -38, -26, -14, 14, 26, 38, 50];
  for (const s of [-1, 1]) {
    for (const x of xs) {
      if (rng() < 0.22) continue;
      const z = s * 11, yaw = s > 0 ? Math.PI : 0;     // la façade (+z local) regarde la route
      houses.push({ x, z, yaw });
      colliders.push({ x, z, hw: HOUSE_HALF, hd: HOUSE_HALF });
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
    addBox(cars[Math.floor(rng() * cars.length)], x, z, yaw, (rng() - 0.5) * 0.12);
  }

  // --- lampadaires le long de l'axe X ---
  for (let x = -48; x <= 48; x += 16) { if (Math.abs(x) < 6) continue; addCircle('environment/StreetLights', x, 5.1, 0.25, Math.PI); addCircle('environment/StreetLights', x + 8, -5.1, 0.25, 0); }

  // --- champs : conteneurs, barils, palettes, cônes, sacs, bornes ---
  for (let i = 0; i < 7; i++) {
    for (let tries = 0; tries < 20; tries++) {
      const x = (rng() * 2 - 1) * (H - 8), z = (rng() * 2 - 1) * (H - 8), yaw = rng() < 0.5 ? 0 : Math.PI / 2;
      if (!free(x, z, 3.2)) continue;
      addBox(rng() < 0.5 ? 'environment/Container_Red' : 'environment/Container_Green', x, z, yaw); break;
    }
  }
  const smalls = [['environment/Barrel', 0.4], ['environment/Barrel', 0.4], ['environment/PlasticBarrier', 0.5], ['environment/Pallet', 0], ['environment/TrashBag_1', 0], ['environment/TrashBag_2', 0], ['environment/TrafficCone_1', 0], ['environment/FireHydrant', 0.3], ['environment/CinderBlock', 0.25], ['environment/Wheels_Stack', 0.5]];
  for (let i = 0; i < 70; i++) {
    const [m, r] = smalls[Math.floor(rng() * smalls.length)];
    const x = (rng() * 2 - 1) * (H - 5), z = (rng() * 2 - 1) * (H - 5);
    if (!free(x, z, r + 0.4, true)) continue;
    addCircle(m, x, z, r, rng() * Math.PI * 2);
  }
  // château d'eau lointain
  for (const [x, z] of [[-40, -40], [42, 38]]) if (free(x, z, 2)) addCircle('environment/WaterTower', x, z, 1.7);

  // --- arbres (tronc = collision) + couronne décorative hors de l'enceinte ---
  for (let i = 0; i < 90; i++) {
    const x = (rng() * 2 - 1) * (H - 3), z = (rng() * 2 - 1) * (H - 3);
    if (!free(x, z, 0.7)) continue;
    const s = 0.8 + rng() * 0.7; trees.push({ x, z, s }); colliders.push({ x, z, r: 0.35 * s });
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
    if (onRoad(x, z, 0.5)) continue;
    grass.push({ model: 'vegetation/Grass_' + (1 + Math.floor(rng() * 4)) + '.glb', x, z, yaw: rng() * Math.PI * 2, scale: 0.9 + rng() * 0.8 });
  }

  const models = new Set(items.map(i => i.model));
  return { half: H, items, houses, colliders, trees, ringTrees, grass, models: [...models], isFree: free, onRoad, rng };
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
