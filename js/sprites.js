// Sprites pixel art générés en code (aucune image à charger).
// Chaque sprite fait 12x16 « pixels » multipliés par `scale` ; dessiné sans lissage → rendu pixel art net.
import { ZOMBIES } from './config.js';

const PALS = {
  walker: { skin: '#7fa85a', skinD: '#5c7f3f', shirt: '#5a6270', shirtD: '#454b57', pants: '#3b4252', shoe: '#1f2430', eye: '#ff3b30', blood: '#8b1a1a', hair: '#2d3b1f' },
  runner: { skin: '#c9d3a2', skinD: '#9aa87a', shirt: '#b3402f', shirtD: '#8a2f22', pants: '#2f3a4f', shoe: '#14181f', eye: '#fff200', blood: '#8b1a1a', hair: '#4a3a2a' },
  tank:   { skin: '#5f7f3a', skinD: '#44602a', shirt: '#46523f', shirtD: '#323b2d', pants: '#2b2b33', shoe: '#111116', eye: '#ff3b30', blood: '#6e1414', hair: '#1f2a15' },
  boss:   { skin: '#a34a4a', skinD: '#7a2f2f', shirt: '#2c2c32', shirtD: '#18181c', pants: '#1c1c22', shoe: '#0d0d10', eye: '#fde047', blood: '#5b0f0f', hair: '#3b0d0d' },
  spitter:  { skin: '#b5c93a', skinD: '#8a9c24', shirt: '#4a5d2a', shirtD: '#364520', pants: '#2c3320', shoe: '#14180d', eye: '#f6ff6a', blood: '#6a8a10', hair: '#3a4a12' },
  exploder: { skin: '#e0a040', skinD: '#b87a20', shirt: '#c2602a', shirtD: '#8f4318', pants: '#4a3320', shoe: '#1f140a', eye: '#fff200', blood: '#7a1a0a', hair: '#5a3510' },
  charger:  { skin: '#8a8f96', skinD: '#5f646b', shirt: '#4b5563', shirtD: '#2f3742', pants: '#262b33', shoe: '#101216', eye: '#ff2a2a', blood: '#701818', hair: '#2a2d33' },
};

function makeCanvas(w, h) {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function pen(g, s) {
  g.imageSmoothingEnabled = false;
  return (x, y, w, h, col) => {
    g.fillStyle = col;
    g.fillRect(x * s, y * s, w * s, h * s);
  };
}

// Détails propres à chaque type de zombie spécial (dessinés par-dessus le corps de base).
function extras(px, type, pal) {
  if (type === 'spitter') {
    px(4, 5, 4, 2, '#d8f53a');        // poche d'acide dans la gorge
    px(5, 4, 2, 2, '#1a2a05');        // bouche grande ouverte
    px(5, 6, 1, 2, '#c6f135');        // bave
    px(1, 7, 1, 1, '#d8f53a');
    px(10, 9, 1, 1, '#d8f53a');
  } else if (type === 'exploder') {
    px(1, 6, 10, 6, pal.shirt);       // ventre gonflé
    px(1, 6, 1, 6, pal.shirtD);
    px(10, 6, 1, 6, pal.shirtD);
    px(3, 7, 2, 2, '#ffd23f');        // pustules incandescentes
    px(7, 8, 2, 2, '#ffd23f');
    px(5, 10, 2, 1, '#ff5a1a');
    px(4, 7, 1, 1, '#fff2a0');
    px(8, 8, 1, 1, '#fff2a0');
  } else if (type === 'charger') {
    px(2, 0, 1, 2, '#e5e7eb');        // cornes
    px(9, 0, 1, 2, '#e5e7eb');
    px(1, 5, 3, 2, '#6b7280');        // épaulières
    px(8, 5, 3, 2, '#6b7280');
    px(4, 7, 4, 3, '#4b5563');        // plastron
    px(5, 8, 2, 1, '#9ca3af');
  }
}

function zombieSprite(pal, s, fr, type) {
  const c = makeCanvas(12 * s, 16 * s);
  const px = pen(c.getContext('2d'), s);
  const a = fr ? 1 : 0;
  // jambes (alternance de marche)
  px(3, 11, 2, 4 + a, pal.pants);
  px(7, 11, 2, 5 - a, pal.pants);
  px(2, 15 + a - 1, 3, 1, pal.shoe);
  px(7, 16 - a - 1, 3, 1, pal.shoe);
  // torse
  px(2, 6, 8, 6, pal.shirt);
  px(2, 6, 1, 6, pal.shirtD);
  px(9, 6, 1, 6, pal.shirtD);
  px(3, 11, 2, 1, pal.shirtD);
  px(5, 8, 2, 2, pal.blood);
  px(7, 10, 1, 1, pal.blood);
  // bras tendus vers l'avant
  px(0, 5 + a, 2, 4, pal.skin);
  px(0, 8 + a, 2, 1, pal.skinD);
  px(10, 6 - a, 2, 4, pal.skin);
  px(10, 9 - a, 2, 1, pal.skinD);
  px(1, 5 + a, 1, 1, pal.shirt);
  px(10, 6 - a, 1, 1, pal.shirt);
  // tête
  px(5, 6, 2, 1, pal.skinD);
  px(3, 0, 6, 6, pal.skin);
  px(3, 5, 6, 1, pal.skinD);
  px(3, 0, 6, 1, pal.hair);
  px(3, 1, 1, 1, pal.hair);
  px(8, 0, 1, 2, pal.hair);
  px(4, 2, 1, 1, pal.eye);
  px(7, 2, 1, 1, pal.eye);
  px(5, 4, 2, 1, pal.blood);
  px(4, 3, 1, 1, pal.skinD);
  extras(px, type, pal);
  return c;
}

function playerSprite(s, fr) {
  const c = makeCanvas(12 * s, 16 * s);
  const px = pen(c.getContext('2d'), s);
  const a = fr ? 1 : 0;
  const skin = '#e0b48a';
  // jambes + bottes
  px(3, 11, 2, 4 + a, '#3b4a5a');
  px(7, 11, 2, 5 - a, '#3b4a5a');
  px(2, 15 + a - 1, 3, 1, '#16181d');
  px(7, 16 - a - 1, 3, 1, '#16181d');
  // gilet
  px(2, 6, 8, 6, '#3f5d3c');
  px(2, 6, 8, 1, '#2c432a');
  px(4, 6, 1, 5, '#2c432a');
  px(7, 6, 1, 5, '#2c432a');
  px(2, 10, 8, 1, '#262626');
  px(5, 8, 2, 1, '#8a8f6a');
  // bras
  px(0, 6, 2, 4, '#3f5d3c');
  px(10, 6, 2, 4, '#3f5d3c');
  px(0, 9, 2, 1, skin);
  px(10, 9, 2, 1, skin);
  // tête + casquette
  px(3, 2, 6, 4, skin);
  px(3, 0, 6, 2, '#2c432a');
  px(2, 2, 8, 1, '#1d2e1c');
  px(4, 3, 1, 1, '#161616');
  px(7, 3, 1, 1, '#161616');
  px(5, 5, 2, 1, '#b07a5a');
  return c;
}

function flashCopy(src) {
  const c = makeCanvas(src.width, src.height);
  const g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = 'rgba(255,255,255,0.85)';
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

export const sprites = { zombie: {}, player: [] };

export function buildSprites() {
  for (const [type, def] of Object.entries(ZOMBIES)) {
    sprites.zombie[type] = [0, 1].map((fr) => {
      const img = zombieSprite(PALS[type], def.scale, fr, type);
      return { img, flash: flashCopy(img) };
    });
  }
  sprites.player = [0, 1].map((fr) => playerSprite(2, fr));
}

// ---- Sprites externes (ex. personnages générés avec Meshy AI, rendus en planches PNG) ----
// assets/sprites/manifest.json : { "frames": 2, "files": { "player": "player.png", "walker": "walker.png", ... } }
// Chaque PNG est une bande horizontale de N images de même taille (cycle de marche, fond transparent).
// Les images sont redimensionnées à la taille des sprites pixel art : rien d'autre à régler.
function loadImg(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function cutFrames(sheet, n, w, h) {
  const fw = Math.floor(sheet.width / n);
  const picks = [0, Math.floor(n / 2)];           // 2 images suffisent pour le cycle de marche
  // Recadrage automatique : boîte englobante (union des images) pour que la silhouette remplisse la hauteur du sprite.
  const tmp = makeCanvas(sheet.width, sheet.height);
  const tg = tmp.getContext('2d', { willReadFrequently: true });
  tg.drawImage(sheet, 0, 0);
  let x0 = fw, x1 = 0, y0 = sheet.height, y1 = 0;
  for (const i of picks) {
    const d = tg.getImageData(i * fw, 0, fw, sheet.height).data;
    for (let y = 0; y < sheet.height; y++) {
      for (let x = 0; x < fw; x++) {
        if (d[(y * fw + x) * 4 + 3] > 24) {
          if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
    }
  }
  if (x1 <= x0 || y1 <= y0) { x0 = 0; x1 = fw - 1; y0 = 0; y1 = sheet.height - 1; }
  const bw = x1 - x0 + 1;
  const bh = y1 - y0 + 1;
  const k = h / bh;
  const ow = Math.max(2, Math.round(bw * k));
  return picks.map((i) => {
    const c = makeCanvas(ow, h);
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.drawImage(sheet, i * fw + x0, y0, bw, bh, 0, 0, ow, h);
    return c;
  });
}

export async function loadExternalSprites() {
  if (typeof fetch === 'undefined' || typeof Image === 'undefined') return 0;
  let manifest;
  try {
    const r = await fetch('assets/sprites/manifest.json', { cache: 'no-cache' });
    if (!r.ok) return 0;
    manifest = await r.json();
  } catch { return 0; }
  const n = Math.max(1, manifest.frames | 0 || 2);
  let count = 0;
  for (const [name, file] of Object.entries(manifest.files || {})) {
    const sheet = await loadImg(`assets/sprites/${file}`);
    if (!sheet) continue;
    if (name === 'player') {
      sprites.player = cutFrames(sheet, n, 24, 32);
      count++;
    } else if (ZOMBIES[name]) {
      const sc = ZOMBIES[name].scale;
      sprites.zombie[name] = cutFrames(sheet, n, 12 * sc, 16 * sc).map((img) => ({ img, flash: flashCopy(img) }));
      count++;
    }
  }
  return count;
}
