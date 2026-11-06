// Rendu spécifique à la ville : lumière de nuit et lampe torche, météo, décor vivant, coffres, traces du combat, cartes.
// Lecture seule de `state` (aucune logique de jeu). Les fonctions reçoivent le contexte 2D de render.js.
import { state } from './state.js';
import { CITY } from './config.js';
import { sprites } from './sprites.js';
import { WORLD_W, WORLD_H, ZONES, ZONE_ORDER, ZW, ZH, zoneOrigin } from './citymap.js';
import { darkness, dusk, dayNight, todLabel } from './ambient.js';
import { t as tr } from './i18n.js';

function glowAdd(ctx, x, y, r, color, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color.replace('A', a));
  g.addColorStop(1, color.replace('A', 0));
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
}
const onScreen = (o, m = 60) => o.x > state.cam.x - m && o.x < state.cam.x + state.vw + m && o.y > state.cam.y - m && o.y < state.cam.y + state.vh + m;

// ---------- Couche « monde » (sous la caméra) ----------

export function drawTraces(ctx) {
  for (const c of state.casings) {
    if (!onScreen(c, 10)) continue;
    ctx.fillStyle = '#c9a227';
    ctx.fillRect(c.x, c.y, 2, 1);
  }
  for (const k of state.corpses) {
    if (!onScreen(k, 30)) continue;
    const set = sprites.zombie[k.type];
    if (!set) continue;
    const img = set[0].img;
    ctx.save();
    ctx.translate(k.x, k.y);
    ctx.rotate(Math.PI / 2 * (k.fx || 1) + k.rot);
    ctx.globalAlpha = 0.62;
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#000';
    ctx.fillRect(-img.width / 2, -img.height / 2, img.width, img.height);
    ctx.restore();
  }
}

function chestShape(ctx, k, tt) {
  const open = k.open;
  const lid = open ? k.t : 0;
  const x = k.x;
  const y = k.y;
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath();
  ctx.ellipse(x, y + 8, 10, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  const dim = open ? 0.62 : 1;
  ctx.globalAlpha = dim;
  switch (k.variant) {
    case 'trunk':                                  // sac / valise abandonné
      ctx.fillStyle = '#4a5a35';
      ctx.fillRect(x - 9, y - 4, 18, 11);
      ctx.fillStyle = '#34402a';
      ctx.fillRect(x - 9, y + 3, 18, 4);
      ctx.fillStyle = '#c9b27a';
      ctx.fillRect(x - 2, y - 6, 4, 3);
      ctx.fillRect(x - 6, y - 4, 2, 11);
      ctx.fillRect(x + 4, y - 4, 2, 11);
      break;
    case 'locker':                                 // casier métallique
      ctx.fillStyle = '#6b7684';
      ctx.fillRect(x - 6, y - 10, 12, 18);
      ctx.fillStyle = '#8a95a3';
      ctx.fillRect(x - 6, y - 10, 12, 2);
      ctx.fillStyle = '#4c5560';
      ctx.fillRect(x - 4, y - 6, 8, 12);
      ctx.fillStyle = '#d1d5db';
      ctx.fillRect(x + 2, y - 1, 2, 3);
      if (lid > 0) { ctx.fillStyle = '#15191f'; ctx.fillRect(x - 4, y - 6, 8 * lid, 12); }
      break;
    case 'medbox':                                 // caisse de secours
      ctx.fillStyle = '#e5e7eb';
      ctx.fillRect(x - 8, y - 5, 16, 12);
      ctx.fillStyle = '#c0262d';
      ctx.fillRect(x - 2, y - 4, 4, 10);
      ctx.fillRect(x - 5, y - 1, 10, 4);
      ctx.fillStyle = '#9ca3af';
      ctx.fillRect(x - 8, y - 5, 16, 2);
      break;
    case 'crate':                                  // caisse en bois
      ctx.fillStyle = '#7a5430';
      ctx.fillRect(x - 8, y - 6 - lid * 4, 16, 14);
      ctx.fillStyle = '#a07040';
      ctx.fillRect(x - 8, y - 6 - lid * 4, 16, 3);
      ctx.strokeStyle = '#4f3519';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x - 7, y - 5 - lid * 4, 14, 12);
      break;
    default:                                       // coffre
      ctx.fillStyle = '#6b4220';
      ctx.fillRect(x - 9, y - 2, 18, 9);
      ctx.fillStyle = '#8a5a2c';
      ctx.fillRect(x - 9, y - 7 - lid * 4, 18, 6);
      ctx.fillStyle = '#c9a227';
      ctx.fillRect(x - 9, y - 2, 18, 1.5);
      ctx.fillRect(x - 2, y - 3, 4, 4);
      ctx.fillStyle = '#3a2410';
      ctx.fillRect(x - 9, y + 5, 18, 2);
  }
  ctx.globalAlpha = 1;
  if (!open) glowAdd(ctx, x, y, 22, 'rgba(250,204,21,A)', 0.16 + 0.1 * Math.sin(tt * 3 + x));
}

export function drawChests(ctx, tt) {
  const c = state.city;
  if (!c) return;
  for (const k of c.chests) if (onScreen(k, 30)) chestShape(ctx, k, tt);
}

export function drawFires(ctx, tt) {
  const c = state.city;
  if (!c) return;
  for (const f of c.map.fires) {
    if (!onScreen(f, 40)) continue;
    const { x, y } = f;
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath();
    ctx.ellipse(x, y + 9, 10, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4a3320';
    ctx.fillRect(x - 7, y - 8, 14, 18);
    ctx.fillStyle = '#2a1a0d';
    ctx.fillRect(x - 7, y - 8, 14, 3);
    for (let i = 0; i < 4; i++) {
      const k = Math.sin(tt * 13 + i * 2.1 + x);
      const h = 11 + i * 2 + k * 3;
      const w = 10 - i * 2;
      ctx.fillStyle = ['#ff5a1a', '#ff8c1a', '#ffc21a', '#fff0a0'][i];
      ctx.beginPath();
      ctx.moveTo(x - w / 2 + k, y - 8);
      ctx.quadraticCurveTo(x - w / 2 - 1, y - 8 - h * 0.6, x + k * 1.5, y - 8 - h);
      ctx.quadraticCurveTo(x + w / 2 + 1, y - 8 - h * 0.6, x + w / 2 + k, y - 8);
      ctx.fill();
    }
  }
}

// Anneaux de bruit (tirs, explosions) et leurres (alarmes de voiture)
export function drawNoise(ctx, tt) {
  const c = state.city;
  if (!c) return;
  ctx.save();
  for (const r of c.rings) {
    ctx.strokeStyle = `rgba(255,236,150,${Math.max(0, r.life / 0.9) * 0.5})`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  for (const l of c.lures) {
    if (!onScreen(l, 80)) continue;
    const on = Math.floor(tt * 4) % 2 === 0;
    ctx.fillStyle = on ? '#ef4444' : '#f97316';
    ctx.fillRect(l.x - 3, l.y - 14, 6, 3);
    glowAdd(ctx, l.x, l.y, 40, on ? 'rgba(255,60,40,A)' : 'rgba(255,160,40,A)', 0.4);
    ctx.strokeStyle = `rgba(255,120,60,${0.35 + 0.25 * Math.sin(tt * 8)})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(l.x, l.y, 16 + ((tt * 30) % 24), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

// Décor vivant : fumée, papiers, corbeaux
export function drawAmbientFx(ctx, tt) {
  const c = state.city;
  if (!c || !c.fx) return;
  const fx = c.fx;
  for (const s of fx.smoke) {
    if (!onScreen(s, 40)) continue;
    const a = (s.life / s.max) * 0.32;
    ctx.fillStyle = `rgba(70,72,78,${a})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const q of fx.papers) {
    if (!onScreen(q, 10)) continue;
    ctx.save();
    ctx.translate(q.x, q.y);
    ctx.rotate(q.rot);
    ctx.fillStyle = 'rgba(235,235,225,.85)';
    ctx.fillRect(-2, -1.5, 4, 3);
    ctx.restore();
  }
  if (dayNight() < 0.75) {
    for (const b of fx.crows) {
      if (b.st === 'gone' || !onScreen(b, 20)) continue;
      ctx.fillStyle = '#0d0e12';
      if (b.st === 'perch') {
        ctx.fillRect(b.x - 3, b.y - 2, 6, 3);
        ctx.fillRect(b.x + 2, b.y - 4, 2, 2);
        ctx.fillStyle = '#d97706';
        ctx.fillRect(b.x + 4, b.y - 3, 1, 1);
      } else {
        const f = Math.sin(tt * 22 + b.x) > 0 ? -3 : 2;
        ctx.fillRect(b.x - 2, b.y - 1, 5, 2);
        ctx.fillRect(b.x - 5, b.y + f, 4, 1);
        ctx.fillRect(b.x + 2, b.y + f, 4, 1);
      }
    }
  }
}

// ---------- Couche « écran » : éclairage, météo ----------

let lightCv = null;
let rain = null;
let lastT = 0;

function ensureLight(w, h) {
  if (typeof document === 'undefined') return null;
  if (!lightCv) lightCv = document.createElement('canvas');
  if (lightCv.width !== w || lightCv.height !== h) { lightCv.width = w; lightCv.height = h; }
  return lightCv;
}

function hole(g, x, y, r, a = 1) {
  const gr = g.createRadialGradient(x, y, r * 0.15, x, y, r);
  gr.addColorStop(0, `rgba(0,0,0,${a})`);
  gr.addColorStop(0.55, `rgba(0,0,0,${a * 0.5})`);
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr;
  g.fillRect(x - r, y - r, r * 2, r * 2);
}

export function drawLighting(ctx, tt, pxScale) {
  const c = state.city;
  if (!c || !c.wx) return;
  const dt = Math.min(0.1, Math.max(0, tt - lastT));
  lastT = tt;
  const d = darkness();
  const cam = state.cam;
  const cx = Math.round(cam.x);
  const cy = Math.round(cam.y);
  const p = state.player;

  // teinte chaude à l'aube et au crépuscule
  const du = dusk();
  if (du > 0.02) {
    ctx.fillStyle = `rgba(255,120,40,${du * 0.2})`;
    ctx.fillRect(0, 0, state.vw, state.vh);
  }

  if (d > 0.04) {
    const cv = ensureLight(ctx.canvas.width, ctx.canvas.height);
    if (cv) {
      const g = cv.getContext('2d');
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalCompositeOperation = 'source-over';
      g.clearRect(0, 0, cv.width, cv.height);
      g.fillStyle = `rgba(4,8,26,${Math.min(0.9, d * 0.92)})`;
      g.fillRect(0, 0, cv.width, cv.height);
      g.setTransform(pxScale, 0, 0, pxScale, -cx * pxScale, -cy * pxScale);
      g.globalCompositeOperation = 'destination-out';

      // le joueur : halo + lampe torche en cône (surtout utile la nuit)
      hole(g, p.x, p.y, 62, 0.9);
      const R = 215;
      const half = 0.46;
      const gr = g.createRadialGradient(p.x, p.y, 8, p.x, p.y, R);
      gr.addColorStop(0, 'rgba(0,0,0,1)');
      gr.addColorStop(0.7, 'rgba(0,0,0,.75)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(p.x, p.y);
      g.arc(p.x, p.y, R, p.angle - half, p.angle + half);
      g.closePath();
      g.fill();
      if (state.muzzle > 0) hole(g, p.x + Math.cos(p.angle) * 14, p.y + Math.sin(p.angle) * 14, 110, 0.9);

      for (const l of c.map.lamps) if (onScreen(l, 100)) hole(g, l.x + 3, l.y - 15, 92, 0.95);
      for (const f of c.map.fires) if (onScreen(f, 100)) hole(g, f.x, f.y - 6, 74 + Math.sin(tt * 11 + f.x) * 5, 0.95);
      for (const k of c.map.checkpoints) if (onScreen(k, 90)) hole(g, k.x, k.y - 8, 58, 0.9);
      for (const s of c.supplies) if (onScreen(s, 80) && s.cd <= 0) hole(g, s.x, s.y, 44, 0.8);
      for (const k of c.caches) if (!k.taken && onScreen(k, 80)) hole(g, k.x, k.y, 40, 0.8);
      for (const k of c.chests) if (!k.open && onScreen(k, 80)) hole(g, k.x, k.y, 34, 0.7);
      for (const l of c.lures) if (onScreen(l, 100)) hole(g, l.x, l.y, 70, 0.8);
      for (const b of state.blasts) hole(g, b.x, b.y, b.r * 1.7, Math.max(0, 1 - b.t / 0.4));
      for (const z of state.zombies) if (z.burnT > 0 && onScreen(z, 60)) hole(g, z.x, z.y, 46, 0.8);
      for (const o of state.bullets) if (o.fx === 'fire' && onScreen(o, 40)) hole(g, o.x, o.y, 34, 0.7);
      // station-service : l'auvent est éclairé
      const st = zoneOrigin('station');
      if (onScreen({ x: st.ox + 180, y: st.oy + 205 }, 180)) hole(g, st.ox + 180, st.oy + 205, 125, 0.9);
      // hôpital : néons du hall
      const ho = zoneOrigin('hopital');
      if (onScreen({ x: ho.ox + 180, y: ho.oy + 220 }, 200)) { hole(g, ho.ox + 180, ho.oy + 130, 90, 0.5); hole(g, ho.ox + 180, ho.oy + 300, 90, 0.5); }

      g.globalCompositeOperation = 'source-over';
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(cv, 0, 0);
      ctx.restore();
    }
    // lueurs chaudes (ajoutées au-dessus de l'obscurité)
    ctx.save();
    ctx.translate(-cx, -cy);
    for (const l of c.map.lamps) if (onScreen(l, 100)) glowAdd(ctx, l.x + 3, l.y - 15, 56, 'rgba(255,214,120,A)', 0.28 * d);
    for (const f of c.map.fires) if (onScreen(f, 100)) glowAdd(ctx, f.x, f.y - 8, 70, 'rgba(255,130,40,A)', (0.34 + Math.sin(tt * 17 + f.x) * 0.05) * d);
    if (state.muzzle > 0) glowAdd(ctx, p.x + Math.cos(p.angle) * 14, p.y + Math.sin(p.angle) * 14, 60, 'rgba(255,220,150,A)', 0.5);
    // yeux rouges des zombies qui chassent, visibles dans le noir
    if (d > 0.3) {
      for (const z of state.zombies) {
        if (z.dead || !z.aggro || !onScreen(z, 20)) continue;
        ctx.fillStyle = z.type === 'runner' ? '#fff200' : '#ff3b30';
        const ey = z.y - z.r * 0.55;
        ctx.fillRect(z.x - 3, ey, 2, 2);
        ctx.fillRect(z.x + 1, ey, 2, 2);
      }
    }
    ctx.restore();
  }

  // pluie
  const wx = c.wx;
  if (wx.rain > 0.02) {
    if (!rain) rain = Array.from({ length: 150 }, () => ({ x: Math.random() * 400 - 20, y: Math.random() * 700, l: 7 + Math.random() * 8, s: 340 + Math.random() * 160 }));
    ctx.fillStyle = `rgba(50,70,100,${0.1 * wx.rain})`;
    ctx.fillRect(0, 0, state.vw, state.vh);
    ctx.strokeStyle = `rgba(190,210,255,${0.35 * wx.rain})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const n = Math.floor(rain.length * wx.rain);
    for (let i = 0; i < n; i++) {
      const r = rain[i];
      r.y += r.s * dt;
      r.x -= r.s * dt * 0.25;
      if (r.y > state.vh + 10) { r.y = -10; r.x = Math.random() * (state.vw + 60); }
      if (r.x < -20) r.x += state.vw + 40;
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(r.x + r.l * 0.25, r.y - r.l);
    }
    ctx.stroke();
  }
  // brouillard : voile global + nappes qui dérivent, dégagé autour du joueur
  const fog = wx.fog + (c.zone === 'hopital' || c.zone === 'cimetiere' ? 0.18 : 0) * (1 - wx.fog);
  if (fog > 0.02) {
    const sx = p.x - cx;
    const sy = p.y - cy;
    const gr = ctx.createRadialGradient(sx, sy, 70, sx, sy, 270);
    gr.addColorStop(0, 'rgba(150,160,170,0)');
    gr.addColorStop(1, `rgba(150,160,170,${0.42 * fog})`);
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, state.vw, state.vh);
    for (let i = 0; i < 4; i++) {
      const bx = ((tt * (6 + i * 3) + i * 150) % (state.vw + 240)) - 120;
      const by = 80 + i * 150;
      const b = ctx.createRadialGradient(bx, by, 0, bx, by, 120);
      b.addColorStop(0, `rgba(190,198,206,${0.16 * fog})`);
      b.addColorStop(1, 'rgba(190,198,206,0)');
      ctx.fillStyle = b;
      ctx.fillRect(bx - 120, by - 120, 240, 240);
    }
  }
  if (wx.flash > 0.02) {
    ctx.fillStyle = `rgba(235,240,255,${wx.flash * 0.45})`;
    ctx.fillRect(0, 0, state.vw, state.vh);
  }
}

// ---------- Cartes ----------

const cellKnown = (c, x, y) => {
  const gx = Math.floor(x / CITY.cell);
  const gy = Math.floor(y / CITY.cell);
  return c.explored[gy * c.gcols + gx] === 1;
};

function drawMapBody(ctx, x0, y0, S, big) {
  const c = state.city;
  const cs = CITY.cell * S;
  ctx.fillStyle = 'rgba(5,8,13,.85)';
  ctx.fillRect(x0 - 2, y0 - 2, WORLD_W * S + 4, WORLD_H * S + 4);
  for (let gy = 0; gy < c.grows; gy++) {
    for (let gx = 0; gx < c.gcols; gx++) {
      if (!c.explored[gy * c.gcols + gx]) continue;
      ctx.fillStyle = '#3a4656';
      ctx.fillRect(x0 + gx * cs, y0 + gy * cs, cs + 0.6, cs + 0.6);
    }
  }
  for (const id of ZONE_ORDER) {                               // contour des zones
    const z = ZONES[id];
    ctx.strokeStyle = id === c.zone ? 'rgba(255,255,255,.7)' : 'rgba(255,255,255,.12)';
    ctx.lineWidth = id === c.zone ? 1.2 : 0.6;
    ctx.strokeRect(x0 + z.col * ZW * S + 0.5, y0 + z.row * ZH * S + 0.5, ZW * S - 1, ZH * S - 1);
    if (big && (c.maps[id] || cellKnown(c, z.col * ZW + ZW / 2, z.row * ZH + ZH / 2))) {
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(z.icon, x0 + (z.col + 0.5) * ZW * S, y0 + (z.row + 0.5) * ZH * S + 4);
    }
  }
  for (const cp of c.map.checkpoints) {
    if (!(c.maps[cp.id] || cellKnown(c, cp.x, cp.y))) continue;
    ctx.fillStyle = c.cps[cp.id] ? '#22c55e' : '#ef4444';
    const r = big ? 3.5 : 1.6;
    ctx.fillRect(x0 + cp.x * S - r, y0 + cp.y * S - r, r * 2, r * 2);
  }
  for (const k of c.chests) {                                   // coffres : visibles seulement avec la carte de la zone
    if (k.open || !c.maps[k.zone]) continue;
    ctx.fillStyle = '#facc15';
    const r = big ? 3 : 1.4;
    ctx.fillRect(x0 + k.x * S - r, y0 + k.y * S - r, r * 2, r * 2);
  }
  ctx.fillStyle = '#fff';
  const pr = big ? 4 : 2;
  ctx.fillRect(x0 + state.player.x * S - pr, y0 + state.player.y * S - pr, pr * 2, pr * 2);
}

export function drawMinimap(ctx) {
  const c = state.city;
  if (!c || !c.explored) return;
  const S = 0.045;
  const x0 = state.vw - WORLD_W * S - 8;
  const y0 = 50;
  ctx.save();
  ctx.globalAlpha = 0.88;
  drawMapBody(ctx, x0, y0, S, false);
  ctx.strokeStyle = 'rgba(255,255,255,.45)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x0 + state.cam.x * S, y0 + state.cam.y * S, state.vw * S, state.vh * S);
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(255,255,255,.8)';
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'right';
  const w = c.wx.rain > 0.4 ? '🌧' : c.wx.fog > 0.4 ? '🌫' : dayNight() > 0.55 ? '🌙' : '☀️';
  ctx.fillText(`${w} ${todLabel()}`, state.vw - 8, y0 + WORLD_H * S + 11);
  ctx.restore();
}

export function drawBigMap(ctx) {
  const c = state.city;
  if (!c || !state.bigMap) return;
  ctx.save();
  ctx.fillStyle = 'rgba(3,6,12,.86)';
  ctx.fillRect(0, 0, state.vw, state.vh);
  const S = Math.min((state.vw - 24) / WORLD_W, (state.vh - 175) / WORLD_H);
  const x0 = (state.vw - WORLD_W * S) / 2;
  const y0 = 92;
  ctx.fillStyle = '#e5e7eb';
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(tr('mapTitle'), state.vw / 2, 66);
  ctx.font = '10px monospace';
  ctx.fillStyle = '#9ca3af';
  const known = c.chests.filter((k) => !k.open && c.maps[k.zone]).length;
  ctx.fillText(`${todLabel()} · ${known} ${tr('chestsKnown')}`, state.vw / 2, 80);
  drawMapBody(ctx, x0, y0, S, true);
  ctx.fillStyle = '#9ca3af';
  ctx.fillText(tr('mapHint'), state.vw / 2, y0 + WORLD_H * S + 22);
  ctx.restore();
}
