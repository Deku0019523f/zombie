// Chargement des modèles glTF/GLB, partage des matériaux (Lambert, léger pour mobile), instanciation.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { MODELS } from './config.js';

const cache = new Map();
const mats = new Map();
const loader = new GLTFLoader();
const fbxMgr = new THREE.LoadingManager();      // les FBX cherchent leur atlas à côté d'eux : on les renvoie vers le vrai fichier (sinon 404)
fbxMgr.setURLModifier(u => /House_texture_atlas\.png$/i.test(u) ? MODELS + '../sources/medieval_houses/Texture/House_texture_atlas.png' : u);
const fbxLoader = new FBXLoader(fbxMgr);

// Modèles FBX de assets/sources/… (exportés en centimètres, sans texture liée) : mis à l'échelle en mètres, centrés en x/z, posés sur y = 0.
// Les maisons médiévales n'ont qu'un seul matériau : l'atlas de couleurs 64x64 (Texture/House_texture_atlas.png), en NearestFilter.
let atlas = null;
function houseMat(m) {
  if (!atlas) {
    atlas = new THREE.TextureLoader().load(MODELS + '../sources/medieval_houses/Texture/House_texture_atlas.png');
    atlas.magFilter = atlas.minFilter = THREE.NearestFilter; atlas.generateMipmaps = false; atlas.colorSpace = THREE.SRGBColorSpace;
  }
  return share(Object.assign(new THREE.MeshLambertMaterial({ map: atlas }), { name: 'MedievalAtlas' }));
}
async function loadFbx(n) {
  const o = await fbxLoader.loadAsync(MODELS + '../' + encodeURI(n));
  const doors = []; o.traverse(m => { if (m.isMesh && /^DOOR/i.test(m.name)) doors.push(m); }); doors.forEach(m => m.parent.remove(m));   // la porte pleine est retirée : le passage reste ouvert
  o.scale.multiplyScalar(0.01); o.updateMatrixWorld(true);
  o.traverse(m => { if (m.isMesh) m.material = Array.isArray(m.material) ? m.material.map(houseMat) : houseMat(m.material); });
  const b = new THREE.Box3().setFromObject(o);
  o.position.x -= (b.min.x + b.max.x) / 2; o.position.z -= (b.min.z + b.max.z) / 2; o.position.y -= b.min.y;
  const w = new THREE.Group(); w.add(o);
  return { scene: w, animations: [] };
}

// Pack d'armes de mêlée (assets/sources/melee_weapons) : UN seul FBX de 28 armes (cm, longueur sur l'axe y) + sa couleur de base.
// Un nom « fichier.fbx#War_Pick » désigne une seule arme du pack : on la détache, on cuit sa position dans sa géométrie.
let packP = null, packTex = null;
async function loadPart(n) {
  const [file, part] = n.split('#');
  packP = packP || fbxLoader.loadAsync(MODELS + '../' + encodeURI(file)).then(o => { o.updateMatrixWorld(true); return o; });
  const pack = await packP;
  let src = null; pack.traverse(m => { if (m.isMesh && m.name === part) src = m; });
  if (!src) throw new Error('arme absente du pack : ' + part);
  if (!packTex) {
    packTex = new THREE.TextureLoader().load(MODELS + '../sources/melee_weapons/Melee_Survival_Weapons_BaseColor_1k.jpg');
    packTex.colorSpace = THREE.SRGBColorSpace;
  }
  const g = src.geometry.clone(); g.applyMatrix4(src.matrixWorld);
  const mesh = new THREE.Mesh(g, share(Object.assign(new THREE.MeshLambertMaterial({ map: packTex }), { name: 'MeleePack' })));
  const w = new THREE.Group(); w.add(mesh);
  return { scene: w, animations: [] };
}

// Meubles « Cozy Interiors » (assets/models/interiors) : un seul matériau, les couleurs viennent d'une palette PNG 8x8.
// Palette obligatoirement en NearestFilter et sans mipmaps ; cellules 41-43 = lampes (émissif), cellule 40 = verre.
let palette = null;
const palMats = new Map();
function paletteMat(m) {
  if (!palette) {
    palette = new THREE.TextureLoader().load(MODELS + 'interiors/Palettes/CI_Theme_Walnut.png');
    palette.magFilter = palette.minFilter = THREE.NearestFilter; palette.generateMipmaps = false; palette.colorSpace = THREE.SRGBColorSpace;
  }
  const key = m.name; let r = palMats.get(key);
  if (!r) {
    r = /Emissive/i.test(m.name) ? new THREE.MeshBasicMaterial({ map: palette }) : new THREE.MeshLambertMaterial({ map: palette, side: THREE.DoubleSide });
    if (/Glass/i.test(m.name)) { r.transparent = true; r.opacity = 0.35; }
    r.name = m.name; palMats.set(key, r);
  }
  return r;
}

// Un seul matériau Lambert par couple (nom, texture, couleur) : indispensable pour fusionner la ville en quelques draw calls.
function share(m) {
  const img = m.map && m.map.image;
  const key = [m.name, img ? (img.width || 0) + 'x' + (img.height || 0) : '', m.color ? m.color.getHexString() : '', m.side, m.transparent ? 1 : 0, m.alphaTest, m.vertexColors ? 1 : 0].join('|');
  let s = mats.get(key);
  if (!s) {
    s = new THREE.MeshLambertMaterial({ map: m.map || null, color: m.color ? m.color.clone() : 0xffffff, side: m.side, transparent: m.transparent, opacity: m.opacity, alphaTest: m.alphaTest, vertexColors: !!m.vertexColors });
    s.name = m.name; mats.set(key, s);
  }
  return s;
}

export async function loadAll(names, onProgress) {
  const queue = [...new Set(names)].filter(n => !cache.has(n));
  const total = Math.max(1, queue.length); let i = 0, done = 0;
  const failed = [];
  async function worker() {
    while (i < queue.length) {
      const n = queue[i++];
      try {
        const g = n.includes('#') ? await loadPart(n) : n.startsWith('sources/') ? await loadFbx(n) : await loader.loadAsync(MODELS + n);
        g.scene.traverse(o => {
          if (!o.isMesh) return;
          const f = n.startsWith('interiors/') ? paletteMat : share;
          o.material = Array.isArray(o.material) ? o.material.map(f) : f(o.material);
          o.frustumCulled = !o.isSkinnedMesh;     // la boîte englobante d'un mesh animé est celle de la pose de repos
        });
        cache.set(n, g);
      } catch (e) { failed.push(n); console.warn('[assets] modèle introuvable :', n, e && e.message); }
      done++; if (onProgress) onProgress(done / total, n);
    }
  }
  await Promise.all([worker(), worker(), worker(), worker()]);
  return failed;
}

export const has = (n) => cache.has(n);

// Renvoie { object, clips } (copie indépendante, squelette cloné) ou null si le modèle manque.
export function instance(n) {
  const g = cache.get(n);
  if (!g) return null;
  return { object: cloneSkinned(g.scene), clips: g.animations };
}

// Forme de secours si un fichier manque : le jeu reste jouable.
export function placeholder(color = 0xff00ff, h = 1.7, r = 0.35) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 8).translate(0, h / 2, 0), new THREE.MeshLambertMaterial({ color: 0xff00ff }));
  return { object: m, clips: [] };
}
