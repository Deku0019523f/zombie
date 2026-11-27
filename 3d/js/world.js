// Construction du décor : sol par zones, routes, maisons modulaires, accessoires, arbres, enceinte.
// La géométrie statique est FUSIONNÉE par matériau (quelques draw calls au lieu de centaines) et découpée en tuiles chargées à l'approche du joueur.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { instance } from './assets.js';
import { buildHouseMesh } from './housebuild.js';
import { WORLD } from './config.js';
import { groundColor } from './zones.js';

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

  // --- sol : une seule grande dalle, teintée par zone (couleurs de sommet fondues aux frontières, voir zones.js) ---
  const gt = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#d6d6d6'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { const v = 150 + Math.random() * 100; g.fillStyle = `rgba(${v},${v},${v},0.35)`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  });
  gt.wrapS = gt.wrapT = THREE.RepeatWrapping;
  const GS = 2 * (H + 40);
  gt.repeat.set(GS / 6, GS / 6);
  const gg = new THREE.PlaneGeometry(GS, GS, 112, 112), gp = gg.attributes.position, gc = new Float32Array(gp.count * 3), tmp = [0, 0, 0];
  for (let i = 0; i < gp.count; i++) { groundColor(gp.getX(i), -gp.getY(i), tmp); gc[i * 3] = tmp[0]; gc[i * 3 + 1] = tmp[1]; gc[i * 3 + 2] = tmp[2]; }
  gg.setAttribute('color', new THREE.BufferAttribute(gc, 3));
  const ground = new THREE.Mesh(gg, new THREE.MeshLambertMaterial({ map: gt, vertexColors: true }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.01; scene.add(ground);

  // --- pièces statiques ---
  const place = (name, x, z, yaw, scale = 1, y = 0, parent = null) => {
    const inst = instance(name); if (!inst) return null;
    const o = inst.object; o.position.set(x, y, z); o.rotation.y = yaw; if (Array.isArray(scale)) o.scale.set(...scale); else if (scale !== 1) o.scale.setScalar(scale);
    parent.add(o); return o;
  };
  // pignons : le toit du pack village est ouvert aux deux bouts (triangle vide) ; on bouche chaque bout avec un triangle d'enduit
  const gableM = new THREE.MeshLambertMaterial({ color: 0xc4b89c, side: THREE.DoubleSide });
  const gablesAt = (parent, cx, cz, halfD, halfW, y0, y1) => {
    for (const k of [-1, 1]) {
      const sh = new THREE.Shape([new THREE.Vector2(-halfW, 0), new THREE.Vector2(halfW, 0), new THREE.Vector2(0.06, y1 - y0), new THREE.Vector2(-0.06, y1 - y0)]);
      const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), gableM); m.position.set(cx, y0, cz + k * halfD); parent.add(m);
    }
  };
  // la cabane de départ reste toujours chargée
  const cabinRoot = new THREE.Group();
  for (const q of layout.cabin.pieces) place(q.m, q.x, q.z, q.yaw, q.s || 1, q.y || 0, cabinRoot);
  gablesAt(cabinRoot, layout.cabin.cx, layout.cabin.cz, 2.8, 2.65, 3.1, 8.2);
  scene.add(batch(cabinRoot));
  for (const l of layout.cabin.lights || []) { const pl = new THREE.PointLight(0xffb866, 1.3, 7, 1.6); pl.position.set(l.x, l.y, l.z); scene.add(pl); }   // lampe de la cabane

  // --- CHARGEMENT PROGRESSIF : le décor statique est découpé en tuiles (WORLD.chunk m) construites à l'approche du joueur et libérées au loin ---
  const C = WORLD.chunk, NC = Math.ceil(2 * H / C), LOAD = 2, KEEP = 3;
  const cidx = (v) => Math.max(0, Math.min(NC - 1, Math.floor((v + H) / C)));
  const buckets = new Map(), bucket = (x, z) => { const k = cidx(x) + ',' + cidx(z); let b = buckets.get(k); if (!b) buckets.set(k, b = { items: [], houses: [], grass: [] }); return b; };
  for (const it of layout.items) bucket(it.x, it.z).items.push(it);
  for (const h of layout.houses) bucket(h.x, h.z).houses.push(h);
  for (const g of layout.grass) bucket(g.x, g.z).grass.push(g);
  const loaded = new Map();                                            // clé -> groupe fusionné
  const buildChunk = (k) => {
    const b = buckets.get(k); if (!b || loaded.has(k)) return;
    const root = new THREE.Group();
    for (const it of b.items) place(it.model, it.x, it.z, it.yaw, it.scale || 1, 0, root);
    for (const g of b.grass) place(g.model, g.x, g.z, g.yaw, g.scale, 0, root);
    for (const h of b.houses) {                                         // maisons bâties avec les modules Parts (voir housebuild.js), tournées de h.yaw autour de leur centre
      const g = buildHouseMesh(h.plan), pivot = new THREE.Group();
      g.position.set(-h.plan.W / 2, 0, -h.plan.D / 2); pivot.add(g); pivot.rotation.y = h.yaw; pivot.position.set(h.x, 0, h.z); root.add(pivot);
    }
    const out = batch(root); scene.add(out); loaded.set(k, out);
  };
  const dropChunk = (k) => { const o = loaded.get(k); if (!o) return; scene.remove(o); o.traverse(m => m.geometry && m.geometry.dispose()); loaded.delete(k); };
  const wanted = (px, pz, R) => { const ci = cidx(px), cj = cidx(pz), out = []; for (let i = ci - R; i <= ci + R; i++) for (let j = cj - R; j <= cj + R; j++) if (i >= 0 && j >= 0 && i < NC && j < NC && buckets.has(i + ',' + j)) out.push([Math.max(Math.abs(i - ci), Math.abs(j - cj)) + Math.hypot(i - ci, j - cj) * 0.01, i + ',' + j]); return out.sort((p, q) => p[0] - q[0]); };
  // prime : construit tout de suite le voisinage (au chargement) ; update : une tuile par image + libération des tuiles lointaines
  const prime = (px, pz, R = 1) => { for (const [, k] of wanted(px, pz, R)) buildChunk(k); };
  const update = (px, pz) => {
    const ci = cidx(px), cj = cidx(pz), here = ci + ',' + cj;
    if (buckets.has(here) && !loaded.has(here)) buildChunk(here);
    else { const nxt = wanted(px, pz, LOAD).find(([, k]) => !loaded.has(k)); if (nxt) buildChunk(nxt[1]); }
    for (const k of [...loaded.keys()]) { const [i, j] = k.split(',').map(Number); if (Math.max(Math.abs(i - ci), Math.abs(j - cj)) > KEEP) dropChunk(k); }
  };
  const chunksLoaded = () => loaded.size;
  // pilotage autonome : la caméra (via onBeforeRender) indique où se trouve le joueur, une boucle dédiée charge / libère les tuiles
  const cam = [layout.spawn.x, layout.spawn.z];
  const probe = new THREE.Mesh(new THREE.PlaneGeometry(0.01, 0.01), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));
  probe.position.y = -50; probe.frustumCulled = false; probe.onBeforeRender = (r, sc, c) => { cam[0] = c.position.x; cam[1] = c.position.z; };
  scene.add(probe);
  prime(cam[0], cam[1], 1);
  const tick = () => { update(cam[0], cam[1]); requestAnimationFrame(tick); };
  requestAnimationFrame(tick);

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
    d.position.set(t.x, 0, t.z); d.rotation.set(0, i * 1.7, 0); d.scale.set(t.s * 1.25, t.s * 0.16, t.s * 1.25); d.updateMatrix();
    trunks.setMatrixAt(i, d.matrix); canopies.setMatrixAt(i, zero); trunks.instanceMatrix.needsUpdate = canopies.instanceMatrix.needsUpdate = true;
  };

  const restoreTree = (i) => {
    const t = all[i]; if (!t) return;
    d.position.set(t.x, 0, t.z); d.rotation.set(0, i * 1.7, 0); d.scale.setScalar(t.s);   // rotation x/z remise à 0 : `d` sert aussi aux rochers (3 axes), sinon les arbres restent penchés
    d.updateMatrix();
    trunks.setMatrixAt(i, d.matrix); canopies.setMatrixAt(i, d.matrix); trunks.instanceMatrix.needsUpdate = canopies.instanceMatrix.needsUpdate = true;
  };

  // --- rochers (instanciés) : à casser à la pioche ---
  const rockM = new THREE.MeshLambertMaterial({ color: 0x8a8a84, flatShading: true });
  const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), rockM, Math.max(1, layout.rocks.length));
  layout.rocks.forEach((r, i) => { d.position.set(r.x, r.s * 0.38, r.z); d.rotation.set(i * 0.7, i * 2.1, i * 0.4); d.scale.set(r.s * 0.95, r.s * 0.7, r.s * 0.85); d.updateMatrix(); rocks.setMatrixAt(i, d.matrix); });
  rocks.frustumCulled = false; scene.add(rocks);
  const restoreRock = (i) => { const r = layout.rocks[i]; if (!r) return; d.position.set(r.x, r.s * 0.38, r.z); d.rotation.set(i * 0.7, i * 2.1, i * 0.4); d.scale.set(r.s * 0.95, r.s * 0.7, r.s * 0.85); d.updateMatrix(); rocks.setMatrixAt(i, d.matrix); rocks.instanceMatrix.needsUpdate = true; };
  const removeRock = (i) => { rocks.setMatrixAt(i, zero); rocks.instanceMatrix.needsUpdate = true; };

  return { ground, setDaylight, fellTree, removeRock, restoreTree, restoreRock, prime, update, chunksLoaded };
}
