// Écran de chargement : précharge l'illustration (et les sprites optionnels), puis se retire.
import { $ } from './dom.js';
import { t } from './i18n.js';
import { loadExternalSprites } from './sprites.js';

const MIN_MS = 1600; // durée minimale pour que l'illustration reste visible

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null); // une ressource absente ne bloque jamais le jeu
    img.src = src;
  });
}

export async function runLoader(assets = []) {
  const box = $('loader');
  const fill = $('loaderFill');
  const label = $('loaderText');
  label.textContent = t('loading');
  const start = performance.now();
  const list = ['assets/cover.jpg', ...assets];
  let done = 0;
  const total = list.length + 1;
  const set = (p) => { fill.style.width = `${Math.round(p * 100)}%`; };
  const results = await Promise.all([loadExternalSprites(), ...list.map((src) => loadImage(src).then((img) => {
    done++;
    set(done / total * 0.8);
    return img;
  }))]);
  // Petite animation jusqu'à la durée minimale.
  await new Promise((resolve) => {
    const tick = () => {
      const k = Math.min((performance.now() - start) / MIN_MS, 1);
      set(0.8 + 0.2 * k);
      if (k < 1) requestAnimationFrame(tick); else resolve();
    };
    tick();
  });
  label.textContent = t('loadingGo');
  box.classList.add('done');
  setTimeout(() => box.remove(), 600);
  return results;
}
