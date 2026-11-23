// Chargement des modèles glTF/GLB, partage des matériaux (Lambert, léger pour mobile), instanciation.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { MODELS } from './config.js';

const cache = new Map();
const mats = new Map();
const loader = new GLTFLoader();

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
        const g = await loader.loadAsync(MODELS + n);
        g.scene.traverse(o => {
          if (!o.isMesh) return;
          o.material = Array.isArray(o.material) ? o.material.map(share) : share(o.material);
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
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 8).translate(0, h / 2, 0), new THREE.MeshLambertMaterial({ color }));
  return { object: m, clips: [] };
}
