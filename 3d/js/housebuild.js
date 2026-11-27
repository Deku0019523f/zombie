// Construit le visuel d'une maison (plan de housePlans.js) à partir des modules FBX de assets/sources/medieval_houses/Parts.
// Repère de la maison : x de 0 à W, z de 0 (fond) à D (façade) ; chaque module regarde vers +z.
import * as THREE from 'three';
import { instance } from './assets.js';
import { WIDTH } from './housePlans.js';

const PARTS = 'sources/medieval_houses/Parts/';
const part = (n) => { const i = instance(PARTS + n + '_1.fbx'); return i && i.object; };
const put = (parent, obj, x, y, z, yaw = 0) => { if (!obj) return null; obj.position.set(x, y, z); obj.rotation.y = yaw; parent.add(obj); return obj; };

// Une porte = cadre + battant. Le battant (îlots de triangles inclus dans le rectangle de la porte) est détaché pour pouvoir s'ouvrir.
const DOORRECT = { DOOR_01: [10, 90], DOOR_02: [10, 90], DOOR_04: [110, 190], DOOR_05: [105, 195] };
const splits = {};
function splitDoor(name) {
  if (splits[name]) return splits[name];
  const a = part(name); if (!a) return null;
  let mesh; a.traverse(m => { if (m.isMesh) mesh = m; });
  const g = mesh.geometry, p = g.attributes.position, N = p.count, idx = g.index ? Array.from(g.index.array) : Array.from({ length: N }, (_, i) => i);
  const key = i => Math.round(p.getX(i) * 10) + ',' + Math.round(p.getY(i) * 10) + ',' + Math.round(p.getZ(i) * 10);
  const par = {}, find = k => { while (par[k] !== k) { par[k] = par[par[k]]; k = par[k]; } return k; };
  for (let i = 0; i < N; i++) { const k = key(i); if (!(k in par)) par[k] = k; }
  for (let t = 0; t < idx.length; t += 3) { const r = find(key(idx[t])); par[find(key(idx[t + 1]))] = r; par[find(key(idx[t + 2]))] = r; }
  const comp = {};
  for (let t = 0; t < idx.length; t += 3) {
    const c = comp[find(key(idx[t]))] = comp[find(key(idx[t]))] || { t: [], x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 };
    c.t.push(t); for (let k = 0; k < 3; k++) { const i = idx[t + k]; c.x0 = Math.min(c.x0, p.getX(i)); c.x1 = Math.max(c.x1, p.getX(i)); c.y0 = Math.min(c.y0, p.getY(i)); c.y1 = Math.max(c.y1, p.getY(i)); }
  }
  const [r0, r1] = DOORRECT[name], A = [], B = [];
  for (const c of Object.values(comp)) (c.x0 >= r0 - 1 && c.x1 <= r1 + 1 && c.y0 >= -1 && c.y1 <= 201 ? B : A).push(...c.t);
  const geo = (tris) => { const q = g.clone(); q.setIndex(tris.flatMap(t => [idx[t], idx[t + 1], idx[t + 2]])); return q; };
  return (splits[name] = { gf: geo(A), gl: geo(B), hinge: r0 / 100 });
}
const withGeo = (name, geom) => { const o = part(name); o.traverse(m => { if (m.isMesh) m.geometry = geom; }); return o; };

export function buildHouseMesh(plan) {
  const { W, D } = plan, root = new THREE.Group();
  const S = { front: [(u) => [u, D, 0]], right: [(u) => [W, D - u, Math.PI / 2]], back: [(u) => [W - u, 0, Math.PI]], left: [(u) => [0, u, -Math.PI / 2]] };
  plan.floors.forEach((f, k) => {
    for (const side of ['front', 'right', 'back', 'left']) {
      let u = 0;
      for (const n of f[side]) {
        const [x, z, yaw] = S[side][0](u), y = 3 * k;
        if (DOORRECT[n]) {
          const s = splitDoor(n), g = new THREE.Group(); put(root, g, x, y, z, yaw);
          if (s) {
            g.add(withGeo(n, s.gf));
            const leaf = withGeo(n, s.gl), piv = new THREE.Group(); leaf.position.x = -s.hinge; piv.add(leaf); piv.position.x = s.hinge; piv.rotation.y = 1.45; g.add(piv);   // battant ouvert vers l'intérieur
          }
        } else put(root, part(n), x, y, z, yaw);
        u += WIDTH[n];
      }
    }
  });
  const top = 3 * plan.floors.length;
  // sol de chaque étage et plafond (dalles « Floor_WoodDark » du pack village, 2 m réduites à 1 m, une par case)
  const tile = (x, y, z, flip) => { const i = instance('village/Floor_WoodDark.gltf'); if (!i) return; const o = i.object; o.scale.setScalar(0.5); o.position.set(x, y, z); if (flip) o.rotation.x = Math.PI; root.add(o); };
  for (let k = 0; k < plan.floors.length; k++) for (let i = 0; i < W; i++) for (let j = 0; j < D; j++) { tile(i + 0.5, 3 * k + 0.03, j + 0.5, false); tile(i + 0.5, 3 * k + 2.92, j + 0.5, true); }
  roofOf(plan, top, root);
  for (const [m, x, z, yaw] of plan.props) { const i = instance('interiors/' + m + '.glb'); if (i) put(root, i.object, x, 0.03, z, yaw); }
  const cr = instance('village/Prop_Crate.gltf'); if (cr) { cr.object.scale.setScalar(0.55); put(root, cr.object, plan.loot[0], 0.03, plan.loot[1], 0.4); }
  if (plan.chimney) { const c = instance('village/Prop_Chimney.gltf'); if (c) put(root, c.object, plan.chimney[0], top + D / 2 - 1.2, plan.chimney[1], 0); }
  return root;
}

// Toit à deux pans (pente 45°) : pièces ROOF_base de 1 m empilées, faîtage, et pignons remplis de carrés / triangles de bois.
function roofOf(plan, y0, out) {
  const L = plan.W, Dd = plan.D, H = Dd / 2, full = Math.floor(H), half = H - full > 0.1;
  for (let i = 0; i < L; i++) {
    for (let k = 0; k < full; k++) { put(out, part('ROOF_base'), i, y0 + k, Dd - k, 0); put(out, part('ROOF_base'), i + 1, y0 + k, k, Math.PI); }
    if (half) { put(out, part('ROOF_base_small'), i, y0 + full, Dd - full, 0); put(out, part('ROOF_base_small'), i + 1, y0 + full, full, Math.PI); }
    put(out, part('ROOF_tile_up'), i - 0.07, y0 + H - 0.02, Dd / 2, 0);
  }
  for (const end of [0, 1]) {
    const yaw = end ? Math.PI / 2 : -Math.PI / 2, at = (s) => end ? [L, Dd - s] : [0, s];
    for (let c = 0; c < Dd - 0.01; c++) {
      const [px, pz] = at(c), asc = c + 1 <= H + 0.01, desc = c >= H - 0.01, sq = asc ? c : desc ? Dd - c - 1 : full;
      for (let k = 0; k < sq; k++) put(out, part(!asc && !desc && k === sq - 1 ? '_ROOF_Window_round' : '_ROOF_up_quad'), px, y0 + k, pz, yaw);
      if (!asc && !desc) put(out, part('ROOF_small_triangle_up'), px, y0 + sq, pz, yaw);
      else if (asc) put(out, part('_ROOF_trinagle_left_wood'), px, y0 + sq, pz, yaw);
      else { const [qx, qz] = at(c + 1); put(out, part('_ROOF_trinagle_right_wood'), qx, y0 + sq, qz, yaw); }
    }
  }
}
