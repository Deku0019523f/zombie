// Sprites pixel art générés en code (aucune image à charger).
// Chaque sprite fait 12x16 « pixels » multipliés par `scale` ; dessiné sans lissage → rendu pixel art net.
import { ZOMBIES } from './config.js';

const PALS = {
  walker: { skin: '#7fa85a', skinD: '#5c7f3f', shirt: '#5a6270', shirtD: '#454b57', pants: '#3b4252', shoe: '#1f2430', eye: '#ff3b30', blood: '#8b1a1a', hair: '#2d3b1f' },
  runner: { skin: '#c9d3a2', skinD: '#9aa87a', shirt: '#b3402f', shirtD: '#8a2f22', pants: '#2f3a4f', shoe: '#14181f', eye: '#fff200', blood: '#8b1a1a', hair: '#4a3a2a' },
  tank:   { skin: '#5f7f3a', skinD: '#44602a', shirt: '#46523f', shirtD: '#323b2d', pants: '#2b2b33', shoe: '#111116', eye: '#ff3b30', blood: '#6e1414', hair: '#1f2a15' },
  boss:   { skin: '#a34a4a', skinD: '#7a2f2f', shirt: '#2c2c32', shirtD: '#18181c', pants: '#1c1c22', shoe: '#0d0d10', eye: '#fde047', blood: '#5b0f0f', hair: '#3b0d0d' },
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

function zombieSprite(pal, s, fr) {
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
      const img = zombieSprite(PALS[type], def.scale, fr);
      return { img, flash: flashCopy(img) };
    });
  }
  sprites.player = [0, 1].map((fr) => playerSprite(2, fr));
}
