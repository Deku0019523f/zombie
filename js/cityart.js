// Dessin (une seule fois, hors écran) du décor de la ville : sols des zones, rues, bâtiments, véhicules, arbres.
// Les obstacles dessinés sont exactement ceux de la carte (mêmes rectangles) : ce qu'on voit est ce qui bloque.
import { WORLD_W, WORLD_H, ZONE_ORDER, ZW, ZH, ZONE_MARGIN, zoneOrigin } from './citymap.js';
import { CITY } from './config.js';

function rng(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}
const R = (g, col, x, y, w, h) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
function shadow(g, x, y, rx, ry, a = 0.3) {
  g.fillStyle = `rgba(0,0,0,${a})`;
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  g.fill();
}

// ---- Sols ----
function floor(g, id, rnd) {
  const { ox, oy } = zoneOrigin(id);
  const x = ox + ZONE_MARGIN;
  const y = oy + ZONE_MARGIN;
  const w = ZW - ZONE_MARGIN * 2;
  const h = ZH - ZONE_MARGIN * 2;
  R(g, '#6e7378', x - 6, y - 6, w + 12, h + 12);          // trottoir
  const base = { res: '#406b34', centre: '#4b4e54', indus: '#5b5d5f', hopital: '#3a3d43', police: '#3c4047', station: '#35383d', cimetiere: '#30502d', parc: '#47873a', ecole: '#52575d', port: '#686e73', autoroute: '#2c2e33', banlieue: '#436f36' }[id];
  R(g, base, x, y, w, h);
  for (let i = 0; i < 160; i++) {                          // grain
    const px = x + rnd() * w;
    const py = y + rnd() * h;
    const c = ['res', 'banlieue', 'parc', 'cimetiere'].includes(id) ? (rnd() < 0.5 ? 'rgba(80,120,60,.6)' : 'rgba(30,60,25,.6)') : 'rgba(0,0,0,.18)';
    R(g, c, px, py, 2 + rnd() * 3, 2);
  }
  if (id === 'res') {                                      // allée centrale + jardins
    R(g, '#5a5348', ox + 146, y, 68, h);
    for (let yy = y; yy < y + h; yy += 22) R(g, 'rgba(0,0,0,.14)', ox + 146, yy, 68, 2);
    for (const [hx, hy] of [[48, 64], [214, 64], [48, 236], [214, 236], [48, 408]]) {
      R(g, '#4d7c3d', ox + hx - 8, oy + hy - 8, 114, 96);
      R(g, '#6b4a2a', ox + hx - 8, oy + hy - 8, 114, 2);
      R(g, '#6b4a2a', ox + hx - 8, oy + hy + 86, 114, 2);
    }
  } else if (id === 'centre') {
    for (let xx = x; xx < x + w; xx += 16) R(g, 'rgba(0,0,0,.14)', xx, y, 1, h);
    for (let yy = y; yy < y + h; yy += 16) R(g, 'rgba(0,0,0,.14)', x, yy, w, 1);
    R(g, '#2f3237', ox + 145, y, 70, h);                  // avenue
    for (let yy = y + 6; yy < y + h; yy += 30) R(g, 'rgba(230,200,80,.55)', ox + 178, yy, 4, 16);
    R(g, '#2f3237', x, oy + 200, w, 50);                  // rue transversale
    for (let xx = x + 8; xx < x + w; xx += 30) R(g, 'rgba(230,200,80,.55)', xx, oy + 223, 16, 4);
    for (let xx = ox + 48; xx < ox + 140; xx += 12) R(g, 'rgba(255,255,255,.3)', xx, oy + 382, 2, 54);   // places de parking
    for (let xx = ox + 222; xx < ox + 316; xx += 12) R(g, 'rgba(255,255,255,.3)', xx, oy + 382, 2, 54);
  } else if (id === 'indus') {
    for (let i = 0; i < 9; i++) {
      g.fillStyle = 'rgba(15,15,18,.4)';
      g.beginPath();
      g.ellipse(x + rnd() * w, y + rnd() * h, 10 + rnd() * 16, 5 + rnd() * 8, 0, 0, Math.PI * 2);
      g.fill();
    }
    for (let xx = 0; xx < 120; xx += 12) {                 // bandes de danger au sol
      R(g, xx % 24 ? '#15151a' : '#eab308', ox + 40 + xx, oy + 214, 12, 6);
    }
  } else if (id === 'hopital') {
    for (let yy = 52; yy < 388; yy += 20) for (let xx = 62; xx < 298; xx += 20) R(g, (xx + yy) % 40 ? '#d7dee2' : '#c3cdd3', ox + xx, oy + yy, 20, 20);
    R(g, '#2e3137', ox + 34, oy + 400, ZW - 68, 186);       // parking
    R(g, '#b91c1c', ox + 168, oy + 485, 24, 8);             // croix rouge au sol
    R(g, '#b91c1c', ox + 176, oy + 477, 8, 24);
    for (let xx = ox + 46; xx < ox + 320; xx += 22) R(g, 'rgba(255,255,255,.25)', xx, oy + 545, 2, 34);
  } else if (id === 'police') {
    for (let yy = 70; yy < 320; yy += 16) for (let xx = 55; xx < 305; xx += 16) R(g, (xx + yy) % 32 ? '#808c97' : '#76828d', ox + xx, oy + yy, 16, 16);
    R(g, '#2c3036', ox + 34, oy + 330, ZW - 68, 256);
    R(g, 'rgba(250,204,21,.5)', ox + 150, oy + 328, 60, 3);
  } else if (id === 'cimetiere') {
    R(g, '#6a6558', ox + 168, oy + 130, 24, 440);            // allée centrale
    R(g, '#6a6558', ox + 56, oy + 440, 248, 22);             // allée transversale
    for (let yy = oy + 130; yy < oy + 570; yy += 18) R(g, 'rgba(0,0,0,.12)', ox + 168, yy, 24, 1);
    R(g, 'rgba(10,20,10,.25)', ox + 56, oy + 52, 248, 498);  // pelouse sombre
    R(g, '#6a6558', ox + 150, oy + 546, 60, 10);             // seuil du portail
  } else if (id === 'parc') {
    for (const [px, py, pw, ph] of [[170, 40, 20, 150], [170, 290, 20, 290], [50, 300, 260, 18], [60, 180, 50, 14], [250, 180, 50, 14]]) R(g, '#9a8c6c', ox + px, oy + py, pw, ph);
    for (let i = 0; i < 40; i++) R(g, 'rgba(255,230,120,.5)', x + rnd() * w, y + rnd() * h, 2, 2);      // fleurs
    for (let i = 0; i < 25; i++) R(g, 'rgba(255,120,160,.55)', x + rnd() * w, y + rnd() * h, 2, 2);
  } else if (id === 'ecole') {
    R(g, '#4d7c3d', ox + 40, oy + 160, 280, 40);             // pelouse devant l'école
    R(g, '#8a8f96', ox + 160, oy + 150, 40, 70);             // allée
    R(g, '#3d4f6a', ox + 40, oy + 215, 160, 130);            // cour de récré
    for (let i = 0; i < 5; i++) R(g, 'rgba(255,255,255,.4)', ox + 56, oy + 230 + i * 16, 14, 2);
    g.strokeStyle = 'rgba(255,255,255,.4)';
    g.strokeRect(ox + 70, oy + 232, 110, 90);
    for (let xx = ox + 50; xx < ox + 320; xx += 20) R(g, 'rgba(255,255,255,.18)', xx, oy + 455, 10, 3);
  } else if (id === 'port') {
    for (let yy = y; yy < y + h; yy += 40) R(g, 'rgba(0,0,0,.12)', x, yy, w, 1);
    for (let i = 0; i < 20; i++) R(g, 'rgba(234,179,8,.5)', ox + 40 + i * 12, oy + 236, 8, 4);         // bande jaune du quai
    R(g, '#1f4d6b', ox + 296, oy, 64, ZH);                                                             // l'eau (sous les vagues)
    for (let i = 0; i < 24; i++) R(g, 'rgba(255,255,255,.16)', ox + 300 + rnd() * 54, oy + rnd() * ZH, 8, 2);
  } else if (id === 'autoroute') {
    for (const lx of [110, 180, 250]) for (let yy = y + 4; yy < y + h; yy += 36) R(g, 'rgba(235,235,235,.6)', ox + lx - 2, yy, 4, 20);
    R(g, 'rgba(230,200,80,.65)', ox + 54, y, 3, h);
    R(g, 'rgba(230,200,80,.65)', ox + 303, y, 3, h);
    for (let i = 0; i < 18; i++) {                                                                      // traces de freinage
      g.fillStyle = 'rgba(10,10,12,.45)';
      g.fillRect(ox + 70 + rnd() * 220, oy + 60 + rnd() * 460, 2, 20 + rnd() * 40);
    }
  } else if (id === 'banlieue') {
    R(g, '#5a5348', ox + 146, y, 68, h);
    for (let yy = y; yy < y + h; yy += 22) R(g, 'rgba(0,0,0,.14)', ox + 146, yy, 68, 2);
    for (const [hx, hy] of [[48, 60], [214, 60], [48, 230], [214, 230], [48, 400], [214, 400]]) {
      R(g, '#4f8040', ox + hx - 8, oy + hy - 8, 114, 96);
      R(g, '#e5e7eb', ox + hx - 8, oy + hy - 8, 114, 2);
      R(g, '#e5e7eb', ox + hx - 8, oy + hy + 86, 114, 2);
    }
  } else if (id === 'station') {
    R(g, 'rgba(0,0,0,.22)', ox + 80, oy + 145, 200, 120);   // ombre de l'auvent
    R(g, '#c0262d', ox + 80, oy + 145, 200, 5);
    R(g, '#e5e7eb', ox + 80, oy + 150, 200, 3);
    R(g, '#c0262d', ox + 80, oy + 260, 200, 5);
    for (const px of [92, 268]) R(g, '#9ca3af', ox + px, oy + 146, 6, 118);
    for (let xx = ox + 50; xx < ox + 320; xx += 20) R(g, 'rgba(255,255,255,.18)', xx, oy + 440, 10, 3);
  }
}

// ---- Bâtiments ----
const ROOF = [['#8a3b2e', '#6b2a20'], ['#3b5a8a', '#2a4266'], ['#7a6a3a', '#5c4f2a'], ['#6a3b6a', '#4b2a4b'], ['#4a7a5a', '#335540']];
const TOWER = ['#7b8088', '#6a7078', '#8a8478', '#5d646e'];
const CONT = ['#b0432f', '#2f6aa8', '#c9a227', '#3f8a4f'];

function windows(g, x, y, w, rows, cols, col = '#1b2833') {
  const cw = w / cols;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) R(g, col, x + c * cw + 3, y + r * 9, cw - 6, 5);
}

function building(g, s) {
  const { x, y, w, h } = s;
  shadow(g, x + w / 2 + 4, y + h + 2, w * 0.55, 6, 0.3);
  if (s.kind === 'house') {
    const [a, b] = ROOF[s.pal % ROOF.length];
    R(g, '#d9cdb4', x, y + h - 22, w, 22);                 // façade
    R(g, a, x, y, w, h - 20);
    R(g, b, x, y + (h - 20) / 2 - 1, w, 3);                // faîtage
    R(g, 'rgba(0,0,0,.18)', x, y + h - 22, w, 3);
    windows(g, x + 6, y + h - 17, w - 40, 1, 2, '#3b4b5c');
    R(g, '#5b3a1e', x + w - 26, y + h - 17, 14, 17);       // porte
  } else if (s.kind === 'tower' || s.kind === 'shop') {
    const roof = s.kind === 'tower' ? TOWER[s.pal % 4] : '#4a4f57';
    R(g, roof, x, y, w, h);
    R(g, 'rgba(255,255,255,.1)', x, y, w, 3);
    R(g, 'rgba(0,0,0,.28)', x, y + h - 26, w, 26);          // façade sombre
    windows(g, x + 2, y + h - 22, w - 4, 2, Math.floor(w / 14));
    if (s.kind === 'tower') {
      R(g, '#3d4249', x + 12, y + 14, 22, 16);
      R(g, '#3d4249', x + w - 38, y + 40, 22, 16);
      R(g, '#2b2f35', x + 16, y + 18, 14, 8);
    } else {                                                // magasin : auvent rayé
      for (let i = 0; i < w; i += 10) R(g, (i / 10) % 2 ? '#f3f4f6' : ['#c0262d', '#2563a8', '#2f7d3c'][s.pal % 3], x + i, y + h - 34, 10, 10);
      R(g, '#0f1319', x + w / 2 - 10, y + h - 20, 20, 20);
    }
  } else if (s.kind === 'warehouse') {
    R(g, '#6e7a85', x, y, w, h);
    for (let i = 4; i < w; i += 8) R(g, 'rgba(0,0,0,.2)', x + i, y, 2, h - 18);
    R(g, '#3a4048', x, y + h - 18, w, 18);
    R(g, '#c9a227', x + w / 2 - 20, y + h - 16, 40, 16);
    for (let i = 0; i < 40; i += 8) R(g, i % 16 ? '#15151a' : '#c9a227', x + w / 2 - 20 + i, y + h - 16, 8, 3);
  } else if (s.kind === 'factory') {
    R(g, '#4b4f55', x, y, w, h);
    R(g, 'rgba(255,255,255,.08)', x, y, w, 3);
    R(g, '#2d3036', x, y + h - 24, w, 24);
    windows(g, x + 2, y + h - 20, w - 4, 2, 6, '#e8b04a');
    shadow(g, x + 70, y + 10, 18, 7, 0.35);                 // cheminée
    R(g, '#8b3b2b', x + 62, y - 18, 16, 40);
    R(g, '#1a1a1a', x + 62, y - 18, 16, 4);
    R(g, '#a0a4aa', x + 8, y + 40, 6, 90);                  // tuyaux
    R(g, '#a0a4aa', x + 20, y + 40, 6, 70);
  } else if (s.kind === 'container') {
    R(g, CONT[s.pal % 4], x, y, w, h);
    for (let i = 4; i < w; i += 6) R(g, 'rgba(0,0,0,.25)', x + i, y + 2, 2, h - 4);
    R(g, 'rgba(255,255,255,.18)', x, y, w, 2);
  } else if (s.kind === 'crypt') {
    R(g, '#8b8f94', x, y + 14, w, h - 14);
    R(g, '#6d7176', x - 4, y + 8, w + 8, 10);
    R(g, '#a5a9ae', x + 20, y, w - 40, 12);
    R(g, '#1a1d21', x + w / 2 - 9, y + h - 28, 18, 28);
    R(g, 'rgba(255,255,255,.14)', x, y + 14, w, 2);
    R(g, '#6d7176', x + w / 2 - 1, y - 6, 2, 8);
    R(g, '#6d7176', x + w / 2 - 4, y - 3, 8, 2);
  } else if (s.kind === 'grave') {
    const col = ['#8f9499', '#767b82', '#a3a8ad'][(s.pal || 0) % 3];
    R(g, 'rgba(0,0,0,.28)', x + 1, y + h - 3, w, 4);
    R(g, col, x + 2, y, w - 4, h);
    R(g, 'rgba(255,255,255,.25)', x + 2, y, w - 4, 2);
    R(g, 'rgba(0,0,0,.3)', x + 4, y + 3, w - 8, 1);
    R(g, '#3d5a30', x + 1, y + h - 1, w - 2, 3);
  } else if (s.kind === 'pond') {
    R(g, '#6b6f58', x - 4, y - 3, w + 8, h + 6);
    R(g, '#2d6f8f', x, y, w, h);
    R(g, '#3f86a8', x + 6, y + 6, w - 40, 8);
    R(g, 'rgba(255,255,255,.2)', x + 10, y + 26, 30, 2);
    R(g, 'rgba(255,255,255,.2)', x + w - 50, y + 50, 26, 2);
    R(g, '#3f7a3a', x + 30, y + 40, 12, 7);
    R(g, '#3f7a3a', x + 90, y + 20, 10, 6);
  } else if (s.kind === 'bench') {
    R(g, 'rgba(0,0,0,.25)', x, y + h - 2, w, 3);
    R(g, '#7a5a3a', x, y, w, h);
    R(g, '#a07a50', x, y, w, 2);
    R(g, '#3a3f47', x + 2, y + h - 2, 3, 3);
    R(g, '#3a3f47', x + w - 5, y + h - 2, 3, 3);
  } else if (s.kind === 'school') {
    R(g, '#a1503a', x, y, w, h);
    R(g, '#7e3c2b', x, y, w, 10);
    R(g, 'rgba(255,255,255,.12)', x, y, w, 2);
    R(g, 'rgba(0,0,0,.25)', x, y + h - 30, w, 30);
    for (let i = 10; i < w - 20; i += 24) { R(g, '#1b2833', x + i, y + h - 24, 14, 10); R(g, '#1b2833', x + i, y + 22, 14, 10); }
    R(g, '#d4c9a0', x + w / 2 - 14, y + h - 22, 28, 22);
    R(g, '#2b2f35', x + w / 2 - 8, y + h - 18, 16, 18);
    R(g, '#e5e7eb', x + w / 2 - 1, y - 20, 2, 22);
    R(g, '#c0262d', x + w / 2 + 1, y - 20, 10, 6);
  } else if (s.kind === 'gym') {
    R(g, '#6a7f95', x, y, w, h);
    for (let i = 4; i < w; i += 8) R(g, 'rgba(0,0,0,.18)', x + i, y, 2, h - 14);
    R(g, '#3d4a58', x, y + h - 14, w, 14);
    R(g, '#2b2f35', x + w / 2 - 12, y + h - 12, 24, 12);
  } else if (s.kind === 'bus') {
    R(g, 'rgba(0,0,0,.3)', x + 2, y + h - 2, w, 5);
    R(g, s.pal ? '#e0a31a' : '#f2b611', x, y, w, h);
    R(g, 'rgba(255,255,255,.25)', x, y, w, 3);
    for (let i = 6; i < w - 12; i += 14) R(g, '#1b2833', x + i, y + 6, 10, 9);
    R(g, '#1b2833', x + w - 10, y + 6, 8, 12);
    R(g, '#111', x + 12, y + h - 2, 12, 4);
    R(g, '#111', x + w - 30, y + h - 2, 12, 4);
    R(g, '#1a1a1a', x, y + h / 2, w, 2);
  } else if (s.kind === 'slide') {
    R(g, '#c0262d', x, y, w, 6);
    R(g, '#2563a8', x, y + 6, 6, h - 6);
    R(g, '#e5c13a', x + 8, y + 8, w - 10, h - 12);
    R(g, 'rgba(0,0,0,.25)', x, y + h - 3, w, 3);
  } else if (s.kind === 'water') {
    // l'eau est peinte par le sol du port ; ici seulement l'écume du quai
    R(g, 'rgba(255,255,255,.22)', x, y, 3, h);
    R(g, '#4a4f55', x - 6, y, 6, h);
  } else if (s.kind === 'cranepost') {
    R(g, '#eab308', x, y, w, h);
    R(g, '#a07a05', x, y, 3, h);
    R(g, '#15151a', x + 4, y + 4, w - 8, 3);
    if (s.beam) {
      R(g, 'rgba(0,0,0,.2)', x + 6, y + h, s.beam, 5);
      R(g, '#eab308', x, y - 12, s.beam + w, 6);
      for (let i = 0; i < s.beam; i += 10) R(g, '#a07a05', x + i, y - 12, 2, 6);
      R(g, '#55595f', x + s.beam / 2, y - 6, 2, 22);
    } else R(g, '#eab308', x, y - 12, w, 12);
  } else if (s.kind === 'guard') {
    R(g, '#9ca3af', x, y, w, h);
    R(g, 'rgba(255,255,255,.4)', x, y, 2, h);
    for (let yy = 0; yy < h; yy += 18) R(g, '#555a62', x - 1, y + yy, w + 2, 2);
  } else if (s.kind === 'pool') {
    R(g, '#d6d9dc', x - 5, y - 5, w + 10, h + 10);
    R(g, '#38a6c8', x, y, w, h);
    R(g, 'rgba(255,255,255,.3)', x + 6, y + 6, w - 20, 2);
    R(g, 'rgba(255,255,255,.2)', x + 10, y + h - 10, 14, 2);
  } else if (s.kind === 'wall' && s.pal === 'fence') {
    R(g, '#2a2d33', x, y, w, h);
    if (w > h) for (let i = 0; i < w; i += 7) R(g, '#4a4f58', x + i, y - 4, 2, h + 6);
    else for (let i = 0; i < h; i += 7) R(g, '#4a4f58', x - 3, y + i, h > 0 ? w + 5 : 2, 2);
  } else if (s.kind === 'wall') {
    const hosp = s.pal === 'hosp';
    R(g, hosp ? '#e6ebee' : '#59616b', x, y, w, h);
    R(g, hosp ? '#a9b4bc' : '#363c45', x, y + h - 3, w, 3);
    R(g, 'rgba(255,255,255,.35)', x, y, w, 2);
  } else if (s.kind === 'shed') {
    R(g, '#6b5a43', x, y, w, h);
    R(g, '#4e3f2d', x, y, w, 8);
    R(g, 'rgba(0,0,0,.2)', x, y + h - 4, w, 4);
  } else if (s.kind === 'bed') {
    R(g, '#e5e7eb', x, y, w, h);
    R(g, '#9fb3c8', x, y + 5, w, h - 5);
    R(g, '#f8fafc', x + 1, y + 1, 8, 5);
  } else if (s.kind === 'desk') {
    R(g, '#7a5a3a', x, y, w, h);
    R(g, '#a07a50', x, y, w, 3);
    R(g, '#1f2933', x + 6, y + 4, 10, 6);
  } else if (s.kind === 'cells') {
    R(g, '#3a3f47', x, y, w, h);
    for (let i = 0; i < w; i += 6) R(g, '#9aa3ad', x + i, y - 6, 2, 16);
  } else if (s.kind === 'pump') {
    R(g, '#c0262d', x, y, w, h);
    R(g, '#e5e7eb', x + 2, y + 3, w - 4, 8);
    R(g, '#111', x + 3, y + 5, w - 6, 4);
    R(g, 'rgba(0,0,0,.3)', x, y + h - 3, w, 3);
  } else if (s.kind === 'truck') {
    R(g, '#c8ccd2', x, y, w - 28, h);
    R(g, 'rgba(0,0,0,.18)', x, y + h - 8, w - 28, 8);
    for (let i = 10; i < w - 28; i += 18) R(g, 'rgba(0,0,0,.22)', x + i, y, 2, h);
    R(g, '#c0262d', x + w - 28, y + 3, 28, h - 6);
    R(g, '#9fb4c8', x + w - 12, y + 6, 8, h - 12);
    R(g, '#111', x + 8, y + h - 2, 10, 4);
    R(g, '#111', x + w - 24, y + h - 2, 10, 4);
  } else if (s.kind === 'barricade') {
    R(g, '#8a6a3f', x, y, w, h);
    for (let i = 0; i < w; i += 14) R(g, 'rgba(0,0,0,.3)', x + i, y, 2, h);
    R(g, '#a07a50', x, y, w, 3);
    R(g, '#c9b27a', x + 2, y - 4, 14, 6);                   // sacs de sable
    R(g, '#c9b27a', x + w - 18, y - 4, 14, 6);
  } else if (s.kind === 'crate') {
    R(g, '#7a5430', x, y, w, h);
    R(g, '#a07040', x, y, w, 3);
    g.strokeStyle = '#4f3519';
    g.lineWidth = 2;
    g.strokeRect(x + 2, y + 2, w - 4, h - 4);
  }
}

function car(g, s) {
  const cx = s.x + s.w / 2;
  const cy = s.y + s.h / 2;
  const body = { car: ['#7d2b27', '#2f5d8a', '#c9a227', '#3b7a4a', '#5d5f66'], ambulance: ['#f1f5f9'], police: ['#d6dce2'] }[s.kind][s.pal % (s.kind === 'car' ? 5 : 1)];
  g.save();
  g.translate(cx, cy);
  if (s.vert) g.rotate(Math.PI / 2);
  shadow(g, 2, 5, 33, 13, 0.32);
  [[-22, -17], [14, -17], [-22, 11], [14, 11]].forEach(([wx, wy]) => R(g, '#0d0d10', wx, wy, 10, 6));
  R(g, body, -30, -13, 60, 26);
  R(g, 'rgba(255,255,255,.14)', -30, -13, 60, 3);
  R(g, 'rgba(0,0,0,.25)', -30, 10, 60, 3);
  R(g, 'rgba(0,0,0,.2)', -14, -11, 28, 22);
  R(g, '#1b2833', -12, -9, 9, 18);
  R(g, '#1b2833', 6, -9, 7, 18);
  R(g, '#f5e6a6', 28, -11, 2, 5);
  R(g, '#f5e6a6', 28, 6, 2, 5);
  R(g, '#7a1010', -30, -11, 2, 5);
  R(g, '#7a1010', -30, 6, 2, 5);
  if (s.kind === 'police') { R(g, '#14161b', -3, -13, 7, 26); R(g, '#2563eb', -9, -6, 5, 5); R(g, '#dc2626', -9, 1, 5, 5); }
  else if (s.kind === 'ambulance') { R(g, '#dc2626', -9, -3, 14, 6); R(g, '#dc2626', -5, -7, 6, 14); }
  else { R(g, 'rgba(60,30,20,.5)', -24, -8, 6, 4); R(g, 'rgba(0,0,0,.35)', 8, -6, 5, 2); }
  g.restore();
}

function tree(g, s) {
  const cx = s.x + s.w / 2;
  const cy = s.y + s.h / 2;
  shadow(g, cx + 3, cy + 6, 16, 6, 0.3);
  R(g, '#4a331c', cx - 3, cy - 4, 6, 12);
  for (const [dx, dy, r, c] of [[0, -16, 15, '#2f6b2a'], [-9, -9, 11, '#3a7a32'], [9, -9, 11, '#2a5f26'], [0, -22, 9, '#47903c']]) {
    g.fillStyle = c;
    g.beginPath();
    g.arc(cx + dx, cy + dy, r, 0, Math.PI * 2);
    g.fill();
  }
}

function lamp(g, l) {
  shadow(g, l.x + 2, l.y + 3, 5, 2, 0.3);
  R(g, '#3b3f45', l.x - 1, l.y - 18, 2, 21);
  R(g, '#3b3f45', l.x - 1, l.y - 19, 7, 2);
  R(g, '#f5e6a6', l.x + 3, l.y - 17, 4, 2);
}

export function buildCityBackground(map) {
  const c = document.createElement('canvas');
  c.width = WORLD_W;
  c.height = WORLD_H;
  const g = c.getContext('2d');
  const rnd = rng(4242);

  R(g, '#2b2e33', 0, 0, WORLD_W, WORLD_H);                  // asphalte
  for (let i = 0; i < 900; i++) R(g, 'rgba(0,0,0,.2)', rnd() * WORLD_W, rnd() * WORLD_H, 2 + rnd() * 3, 2);
  for (const id of ZONE_ORDER) floor(g, id, rnd);

  // marquages des rues (lignes jaunes + passages piétons aux carrefours)
  const vx = [];
  const hy = [];
  for (let c = 1; c < CITY.cols; c++) vx.push(ZW * c);
  for (let r = 1; r < CITY.rows; r++) hy.push(ZH * r);
  for (const x of vx) for (let y = 4; y < WORLD_H; y += 28) R(g, 'rgba(220,190,70,.55)', x - 2, y, 4, 16);
  for (const y of hy) for (let x = 4; x < WORLD_W; x += 28) R(g, 'rgba(220,190,70,.55)', x, y - 2, 16, 4);
  for (const x of vx) for (const y of hy) for (let i = -30; i <= 30; i += 8) { R(g, 'rgba(235,235,235,.5)', x + i - 2, y - 44, 4, 14); R(g, 'rgba(235,235,235,.5)', x + i - 2, y + 30, 4, 14); }
  // sang séché, gravats
  for (let i = 0; i < 40; i++) {
    g.fillStyle = 'rgba(90,14,14,.33)';
    g.beginPath();
    g.ellipse(rnd() * WORLD_W, 60 + rnd() * (WORLD_H - 60), 3 + rnd() * 10, 2 + rnd() * 5, rnd() * 3, 0, Math.PI * 2);
    g.fill();
  }

  const order = { tree: 3, car: 1, ambulance: 1, police: 1 };
  const sorted = map.solids.slice().sort((a, b) => ((order[a.kind] || 0) - (order[b.kind] || 0)) || (a.y - b.y));
  for (const s of sorted) {
    if (s.kind === 'car' || s.kind === 'ambulance' || s.kind === 'police') car(g, s);
    else if (s.kind === 'tree') tree(g, s);
    else building(g, s);
  }
  for (const l of map.lamps) lamp(g, l);                      // réverbères (la lumière de nuit est dessinée par render.js)

  // noms des zones, peints au sol
  g.font = 'bold 15px monospace';
  g.textAlign = 'center';
  g.fillStyle = 'rgba(255,255,255,.16)';
  for (const [id, lx, ly, txt] of [['hopital', 180, 570, 'URGENCES'], ['police', 180, 560, 'POLICE'], ['station', 180, 560, 'STATION'], ['indus', 180, 580, 'INDUSTRIE'], ['centre', 180, 585, 'CENTRE'], ['res', 180, 590, 'QUARTIER'], ['cimetiere', 180, 595, 'CIMETIÈRE'], ['parc', 180, 598, 'PARC'], ['ecole', 180, 585, 'ÉCOLE'], ['port', 150, 590, 'PORT'], ['autoroute', 180, 598, 'A-13'], ['banlieue', 180, 598, 'BANLIEUE']]) {
    const { ox, oy } = zoneOrigin(id);
    g.fillText(txt, ox + lx, oy + ly);
  }

  const vg = g.createRadialGradient(WORLD_W / 2, WORLD_H / 2, WORLD_H * 0.35, WORLD_W / 2, WORLD_H / 2, WORLD_W * 0.75);   // bords du monde assombris
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,.45)');
  g.fillStyle = vg;
  g.fillRect(0, 0, WORLD_W, WORLD_H);
  return c;
}
