// Construction du décor : sol, routes, maisons modulaires, accessoires, arbres, enceinte.
// Toute la géométrie statique est FUSIONNÉE par matériau (quelques draw calls au lieu de centaines).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { instance } from './assets.js';
import { housePieces } from './layout.js';
import { WORLD } from './config.js';

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function batch(root) {
  root.updateMatrixWorld(true);
  const byMat = new Map();
  root.traverse(o => {
    if (!o.isMesh || Array.isArray(o.material)) return;
    let g = o.geometry.clone(); g.applyMatrix4(o.matrixWorld);
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (g.index) g = g.toNonIndexed();
    if (!byMat.has(o.material)) byMat.set(o.material, []);
    byMat.get(o.material).push(g);
  });
  const out = new THREE.Group();
  for (const [m, list] of byMat) {
    const merged = mergeGeometries(list, false);
    if (!merged) { console.warn('[world] fusion impossible pour', m.name); continue; }
    const mesh = new THREE.Mesh(merged, m); mesh.frustumCulled = false; out.add(mesh);
    list.forEach(g => g.dispose());
  }
  return out;
}

export function buildWorld(scene, layout) {
  const H = layout.half;

  // --- ciel, brume, lumières : pilotés par setDaylight() (1 = plein jour, 0.06 = nuit noire) ---
  const SKY = { day: ['#6f8aa6', '#b9c4bd', '#c9c7b0'], night: ['#03060d', '#0a111d', '#0e141b'], dusk: '#d9805a' };
  const skyCanvas = document.createElement('canvas'); skyCanvas.width = 8; skyCanvas.height = 256;
  const skyTex = new THREE.CanvasTexture(skyCanvas); skyTex.colorSpace = THREE.SRGBColorSpace;
  scene.background = skyTex;
  scene.fog = new THREE.Fog(0xb9c2b4, WORLD.fogNear, WORLD.fogFar);
  const hemi = new THREE.HemisphereLight(0xdfe8ff, 0x5a5646, 1.05); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe7c2, 1.25); sun.position.set(-30, 55, 25); scene.add(sun);
  const cA = new THREE.Color(), cB = new THREE.Color(), dusk = new THREE.Color(SKY.dusk);
  let lastL = -1;
  const setDaylight = (l) => {
    if (Math.abs(l - lastL) < 0.008) return; lastL = l;
    const warm = Math.max(0, 1 - Math.abs(l - 0.5) * 2.4) * 0.55;           // lueur orangée à l'aube / au crépuscule
    const g = skyCanvas.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256), cols = [];
    [0, 1, 2].forEach(k => { cA.set(SKY.night[k]); cB.set(SKY.day[k]); const c = cA.clone().lerp(cB, (l - 0.06) / 0.94); if (k > 0) c.lerp(dusk, warm * (k === 1 ? 1 : 0.7)); cols.push(c); gr.addColorStop([0, 0.55, 1][k], '#' + c.getHexString()); });
    g.fillStyle = gr; g.fillRect(0, 0, 8, 256); skyTex.needsUpdate = true;
    scene.fog.color.copy(cols[1]); scene.fog.near = 10 + (WORLD.fogNear - 10) * l; scene.fog.far = 42 + (WORLD.fogFar - 42) * l;
    hemi.intensity = 0.22 + 0.83 * l; sun.intensity = 0.05 + 1.2 * l;
    sun.color.set(0xffe7c2).lerp(new THREE.Color(0xff9a5a), warm);
    hemi.color.set(0x7d8fc0).lerp(new THREE.Color(0xdfe8ff), l);
  };
  setDaylight(1);

  // --- sol ---
  const gt = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#6c7a48'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { const v = 90 + Math.random() * 60; g.fillStyle = `rgba(${v - 20},${v + 10},${v - 50},0.35)`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  });
  gt.wrapS = gt.wrapT = THREE.RepeatWrapping; gt.repeat.set(70, 70);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(420, 420), new THREE.MeshLambertMaterial({ map: gt }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.01; scene.add(ground);

  // --- pièces statiques ---
  const root = new THREE.Group();
  const place = (name, x, z, yaw, scale = 1, y = 0, parent = root) => {
    const inst = instance(name); if (!inst) return null;
    const o = inst.object; o.position.set(x, y, z); o.rotation.y = yaw; if (Array.isArray(scale)) o.scale.set(...scale); else if (scale !== 1) o.scale.setScalar(scale);
    parent.add(o); return o;
  };
  for (const it of layout.items) place(it.model, it.x, it.z, it.yaw, it.scale || 1);
  for (const q of layout.cabin.pieces) place(q.m, q.x, q.z, q.yaw, q.s || 1, q.y || 0);        // la cabane de départ
  for (const l of layout.cabin.lights || []) { const pl = new THREE.PointLight(0xffb866, 1.3, 7, 1.6); pl.position.set(l.x, l.y, l.z); scene.add(pl); }   // lampe de la cabane
  for (const h of layout.houses) {
    const g = new THREE.Group(); g.position.set(h.x, 0, h.z); g.rotation.y = h.yaw; root.add(g);
    for (const p of housePieces(layout.rng)) place(p.m + '.gltf', p.x, p.z, p.yaw, 1, p.y || 0, g);
  }
  const fence = 'village/Prop_MetalFence_Simple.gltf', step = 1.95;
  for (let x = -H; x <= H; x += step) { place(fence, x, H, 0); place(fence, x, -H, Math.PI); }
  for (let z = -H; z <= H; z += step) { place(fence, H, z, Math.PI / 2); place(fence, -H, z, -Math.PI / 2); }
  for (const g of layout.grass) place(g.model, g.x, g.z, g.yaw, g.scale);
  scene.add(batch(root));

  // --- arbres (instanciés) : tronc + deux cônes. layout.trees d'abord, puis les arbres de l'enceinte. ---
  const trunkG = new THREE.CylinderGeometry(0.12, 0.2, 2.4, 6).translate(0, 1.2, 0);
  const canopyG = mergeGeometries([new THREE.ConeGeometry(1.3, 2.8, 7).translate(0, 3.2, 0), new THREE.ConeGeometry(0.95, 2.2, 7).translate(0, 4.6, 0)]);
  const all = layout.trees.concat(layout.ringTrees);
  const trunks = new THREE.InstancedMesh(trunkG, new THREE.MeshLambertMaterial({ color: 0x5b4330 }), all.length);
  const canopies = new THREE.InstancedMesh(canopyG, new THREE.MeshLambertMaterial({ color: 0x3f5f34 }), all.length);
  const d = new THREE.Object3D(), zero = new THREE.Matrix4().makeScale(0, 0, 0);
  all.forEach((t, i) => { d.position.set(t.x, 0, t.z); d.rotation.y = i * 1.7; d.scale.setScalar(t.s); d.updateMatrix(); trunks.setMatrixAt(i, d.matrix); canopies.setMatrixAt(i, d.matrix); });
  trunks.frustumCulled = canopies.frustumCulled = false;
  scene.add(trunks, canopies);
  // arbre abattu : la couronne disparaît, il reste une souche
  const fellTree = (i) => {
    const t = all[i]; if (!t) return;
    d.position.set(t.x, 0, t.z); d.rotation.y = i * 1.7; d.scale.set(t.s * 1.25, t.s * 0.16, t.s * 1.25); d.updateMatrix();
    trunks.setMatrixAt(i, d.matrix); canopies.setMatrixAt(i, zero); trunks.instanceMatrix.needsUpdate = canopies.instanceMatrix.needsUpdate = true;
  };

  const restoreTree = (i) => {
    const t = all[i]; if (!t) return;
    d.position.set(t.x, 0, t.z); d.rotation.y = i * 1.7; d.scale.setScalar(t.s); d.updateMatrix();
    trunks.setMatrixAt(i, d.matrix); canopies.setMatrixAt(i, d.matrix); trunks.instanceMatrix.needsUpdate = canopies.instanceMatrix.needsUpdate = true;
  };

  // --- rochers (instanciés) : à casser à la pioche ---
  const rockM = new THREE.MeshLambertMaterial({ color: 0x8a8a84, flatShading: true });
  const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), rockM, Math.max(1, layout.rocks.length));
  layout.rocks.forEach((r, i) => { d.position.set(r.x, r.s * 0.38, r.z); d.rotation.set(i * 0.7, i * 2.1, i * 0.4); d.scale.set(r.s * 0.95, r.s * 0.7, r.s * 0.85); d.updateMatrix(); rocks.setMatrixAt(i, d.matrix); });
  rocks.frustumCulled = false; scene.add(rocks);
  const restoreRock = (i) => { const r = layout.rocks[i]; if (!r) return; d.position.set(r.x, r.s * 0.38, r.z); d.rotation.set(i * 0.7, i * 2.1, i * 0.4); d.scale.set(r.s * 0.95, r.s * 0.7, r.s * 0.85); d.updateMatrix(); rocks.setMatrixAt(i, d.matrix); rocks.instanceMatrix.needsUpdate = true; };
  const removeRock = (i) => { rocks.setMatrixAt(i, zero); rocks.instanceMatrix.needsUpdate = true; };

  return { ground, setDaylight, fellTree, removeRock, restoreTree, restoreRock };
}
