// Plans des maisons (données pures, aucune dépendance three) : bâties avec les modules de assets/sources/medieval_houses/Parts.
// Grille de 1 m, murs de 3 m par étage. Repère de la maison : x de 0 à W, z de 0 (fond) à D (façade). Chaque côté se lit de gauche à droite VU DE L'EXTÉRIEUR.
// Meuble : [modèle (dans assets/models/interiors), x, z, yaw local, demi-largeur x, demi-profondeur z] ; yaw 0 = regarde la façade.
const B = 'Bedroom/CI_Bedroom_', K = 'Kitchen/CI_Kitchen_', L = 'Living/CI_Living_', PI = Math.PI;

// Largeur (m) de chaque module de mur, et ouverture de la porte [début, fin] dans le module quand c'est une porte praticable.
export const WIDTH = { WALL_01: 1, WALL_02: 3, WALL_03: 1, WALL_04: 1, WALL_05: 3, WINDOW_01_Balkon: 3, WINDOW_02_Balkon: 3, WINDOW_03: 3, WINDOW_04: 1, WINDOW_05: 3, WINDOW_06: 3, WINDOW_07: 3,
  DOOR_01: 1, DOOR_02: 1, DOOR_04: 3, DOOR_05: 3, DOOR_06_Balkon: 3 };
export const DOOR_GAP = { DOOR_01: [0.1, 0.9], DOOR_02: [0.1, 0.9], DOOR_04: [1.1, 1.9], DOOR_05: [1.1, 1.9] };

export const HOUSE_PLANS = [
  { name: 'Cabane', W: 3, D: 3, ridge: 'x', loot: [0.5, 2.6],
    floors: [{ front: ['DOOR_04'], right: ['WALL_02'], back: ['WALL_02'], left: ['WINDOW_03'] }],
    props: [[B + 'Bed_Single', 0.6, 1.2, 0, 0.45, 1], [K + 'Table', 2.1, 0.6, 0, 0.7, 0.4]] },
  { name: 'Maisonnette', W: 4, D: 4, ridge: 'x', loot: [3.4, 3.4],
    floors: [{ front: ['DOOR_02', 'WINDOW_03'], right: ['WALL_02', 'WALL_01'], back: ['WALL_01', 'WINDOW_03'], left: ['WALL_01', 'WINDOW_03'] }],
    props: [[B + 'Bed_Single', 0.6, 1.2, 0, 0.45, 1], [B + 'Wardrobe_Narrow', 3.2, 0.4, 0, 0.36, 0.3], [K + 'Table', 2.6, 2.4, 0, 0.7, 0.4], [K + 'Chair', 2.6, 1.7, 0, 0.22, 0.23]] },
  { name: 'Maison familiale', W: 6, D: 4, ridge: 'x', chimney: [4.8, 0.9], loot: [5.5, 3.4],
    floors: [{ front: ['WINDOW_06', 'DOOR_04'], right: ['WINDOW_04', 'WALL_02'], back: ['WALL_05', 'WINDOW_03'], left: ['WALL_02', 'WINDOW_04'] }],
    props: [[L + 'Fireplace_Mantel', 4.8, 0.35, 0, 0.75, 0.25], [L + 'Sofa_Loveseat', 2.2, 1.0, 0, 0.73, 0.45], [L + 'CoffeeTable', 2.2, 2.0, 0, 0.55, 0.3], [B + 'Bed_Double_LOD1', 0.9, 3.0, PI, 0.7, 1]] },
  { name: 'Ferme', W: 8, D: 5, ridge: 'x', chimney: [1.2, 1.0], loot: [7.2, 4.2],
    floors: [{ front: ['DOOR_05', 'WINDOW_05', 'WINDOW_04', 'WALL_03'], right: ['WINDOW_04', 'WALL_02', 'WALL_03'], back: ['WINDOW_03', 'WALL_05', 'WINDOW_04', 'WALL_01'], left: ['WALL_03', 'WALL_02', 'WINDOW_04'] }],
    props: [[L + 'Fireplace_Mantel', 1.2, 0.35, 0, 0.75, 0.25], [K + 'Table', 4.4, 1.4, 0, 0.7, 0.4], [K + 'Chair', 4.4, 2.1, PI, 0.22, 0.23], [B + 'Bed_Double_LOD1', 7.0, 1.0, 0, 0.7, 1], [B + 'Wardrobe_Double', 5.9, 0.4, 0, 0.58, 0.32], [L + 'Bookcase_Low', 2.9, 0.3, 0, 0.6, 0.16]] },
  { name: 'Maison à étage', W: 6, D: 5, ridge: 'x', chimney: [1.2, 1.0], loot: [5.3, 2.0],
    floors: [
      { front: ['DOOR_04', 'WINDOW_06'], right: ['WINDOW_04', 'WALL_02', 'WALL_01'], back: ['WALL_05', 'WINDOW_03'], left: ['WALL_01', 'WALL_02', 'WINDOW_04'] },
      { front: ['WINDOW_02_Balkon', 'WINDOW_07'], right: ['WALL_01', 'WINDOW_03', 'WALL_01'], back: ['WINDOW_03', 'WALL_02'], left: ['WALL_01', 'WINDOW_03', 'WINDOW_04'] }],
    props: [[L + 'Fireplace_Mantel', 1.2, 0.35, 0, 0.75, 0.25], [L + 'Sofa_Loveseat', 3.6, 1.0, 0, 0.73, 0.45], [K + 'Table', 4.6, 3.6, 0, 0.7, 0.4]] },
  { name: 'Villa', W: 9, D: 6, ridge: 'x', chimney: [1.5, 1.0], loot: [8.3, 4.6],
    floors: [
      { front: ['WINDOW_06', 'DOOR_05', 'WINDOW_06'], right: ['WINDOW_03', 'WALL_02'], back: ['WALL_05', 'WINDOW_07', 'WALL_02'], left: ['WALL_02', 'WINDOW_03'] },
      { front: ['WINDOW_01_Balkon', 'DOOR_06_Balkon', 'WINDOW_02_Balkon'], right: ['WALL_05', 'WINDOW_03'], back: ['WINDOW_03', 'WALL_05', 'WINDOW_06'], left: ['WINDOW_03', 'WALL_02'] }],
    props: [[L + 'Fireplace_Mantel', 1.5, 0.35, 0, 0.75, 0.25], [L + 'Sofa_ThreeSeat_LOD1', 3.0, 1.2, 0, 1, 0.45], [L + 'CoffeeTable', 3.0, 2.4, 0, 0.55, 0.3], [K + 'Table', 6.6, 3.5, 0, 0.7, 0.4], [K + 'Chair', 6.6, 2.8, PI, 0.22, 0.23], [L + 'Piano_Upright_LOD1', 7.8, 0.45, 0, 0.74, 0.3], [L + 'Bookcase_Tall_LOD1', 8.6, 2.5, -PI / 2, 0.45, 0.17]] },
];

// Tous les fichiers nécessaires à une liste de plans (pour le chargement).
export function planModels(plans = HOUSE_PLANS) {
  const out = new Set(['village/Floor_WoodDark.gltf', 'village/Prop_Chimney.gltf', 'village/Prop_Crate.gltf']);
  const P = 'sources/medieval_houses/Parts/';
  for (const n of ['ROOF_base', 'ROOF_base_small', 'ROOF_tile_up', '_ROOF_up_quad', '_ROOF_Window_round', '_ROOF_trinagle_left_wood', '_ROOF_trinagle_right_wood', 'ROOF_small_triangle_up']) out.add(P + n + '_1.fbx');
  for (const p of plans) {
    for (const f of p.floors) for (const side of Object.values(f)) for (const t of side) out.add(P + t + '_1.fbx');
    for (const pr of p.props) out.add('interiors/' + pr[0] + '.glb');
  }
  return [...out];
}

// Parois du rez-de-chaussée en boîtes [x, z, demi-x, demi-z] dans le repère de la maison (la porte laisse un passage).
export function wallBoxes(plan, T = 0.12) {
  const { W, D } = plan, f = plan.floors[0], boxes = [];
  const span = (side, u0, u1) => {            // intervalle [u0, u1] mesuré de gauche à droite vu de l'extérieur -> boîte
    if (u1 - u0 < 0.02) return;
    if (side === 'front') boxes.push([(u0 + u1) / 2, D, (u1 - u0) / 2, T]);
    else if (side === 'back') boxes.push([W - (u0 + u1) / 2, 0, (u1 - u0) / 2, T]);
    else if (side === 'right') boxes.push([W, D - (u0 + u1) / 2, T, (u1 - u0) / 2]);
    else boxes.push([0, (u0 + u1) / 2, T, (u1 - u0) / 2]);
  };
  for (const side of ['front', 'right', 'back', 'left']) {
    let u = 0;
    for (const n of f[side]) {
      const w = WIDTH[n], g = DOOR_GAP[n];
      if (g) { span(side, u, u + g[0]); span(side, u + g[1], u + w); } else span(side, u, u + w);
      u += w;
    }
  }
  return boxes;
}
// Abscisse (repère de la maison) du centre de la porte de façade.
export function doorX(plan) {
  let u = 0; for (const n of plan.floors[0].front) { if (DOOR_GAP[n]) return u + (DOOR_GAP[n][0] + DOOR_GAP[n][1]) / 2; u += WIDTH[n]; }
  return plan.W / 2;
}
