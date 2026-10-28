// Rendu canvas : décor pixel art, sprites, balles, particules, effets de lumière.
// Aucune logique de jeu ici : on lit uniquement `state`.
import { state } from './state.js';
import { WEAPONS, LOGICAL_WIDTH } from './config.js';
import { sprites, buildSprites } from './sprites.js';
import { stage, canvas } from './dom.js';
import { PICKUP_SIZE } from './pickups.js';

const ctx = canvas.getContext('2d');
let pxScale = 1;
let bg = null;
let decor = { barrel: { x: 308, y: 140 }, police: { x: 290, y: 560, rot: -0.12 } };

function rng(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const R = (g, col, x, y, w, h) => { g.fillStyle = col; g.fillRect(x, y, w, h); };

function shadow(g, x, y, rx, ry, a = 0.32) {
  g.fillStyle = `rgba(0,0,0,${a})`;
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  g.fill();
}

// ---------- Décor statique (dessiné une seule fois dans un canvas hors écran) ----------

function drawCar(g, x, y, rot, body, roof, police) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  shadow(g, 3, 6, 40, 15, 0.35);
  // roues
  [[-24, -15], [18, -15], [-24, 11], [18, 11]].forEach(([wx, wy]) => R(g, '#0d0d10', wx, wy, 11, 6));
  // carrosserie
  R(g, body, -36, -13, 72, 26);
  R(g, 'rgba(255,255,255,0.12)', -36, -13, 72, 3);
  R(g, 'rgba(0,0,0,0.25)', -36, 10, 72, 3);
  // capot + coffre
  R(g, 'rgba(0,0,0,0.18)', 18, -11, 16, 22);
  R(g, 'rgba(0,0,0,0.18)', -34, -11, 12, 22);
  // habitacle
  R(g, roof, -20, -11, 36, 22);
  R(g, '#1b2833', -17, -9, 11, 18);
  R(g, '#1b2833', 6, -9, 8, 18);
  R(g, 'rgba(255,255,255,0.12)', -17, -9, 3, 18);
  // phares
  R(g, '#f5e6a6', 34, -11, 2, 5);
  R(g, '#f5e6a6', 34, 6, 2, 5);
  R(g, '#7a1010', -36, -11, 2, 5);
  R(g, '#7a1010', -36, 6, 2, 5);
  if (police) {
    R(g, '#14161b', -4, -13, 8, 26);        // bande noire
    R(g, '#2b2f38', -10, -7, 7, 14);        // rampe lumineuse
    R(g, '#c0c6cc', 4, -13, 2, 26);
  } else {
    // carrosserie rouillée / impacts
    R(g, 'rgba(60,30,20,0.55)', -30, -8, 6, 4);
    R(g, 'rgba(60,30,20,0.55)', 22, 3, 8, 5);
    R(g, 'rgba(0,0,0,0.4)', 8, -6, 5, 2);
  }
  g.restore();
}

function drawFence(g, x0, y0, x1, y1) {
  // grillage
  g.strokeStyle = 'rgba(190,195,200,0.22)';
  g.lineWidth = 1;
  g.beginPath();
  for (let i = -(y1 - y0); i < x1 - x0; i += 8) {
    g.moveTo(x0 + i, y0);
    g.lineTo(x0 + i + (y1 - y0), y1);
    g.moveTo(x0 + i + (y1 - y0), y0);
    g.lineTo(x0 + i, y1);
  }
  g.save();
  g.beginPath();
  g.rect(x0, y0, x1 - x0, y1 - y0);
  g.clip();
  g.stroke();
  g.restore();
  // poteaux + rails
  R(g, '#6b7078', x0, y0 - 2, x1 - x0, 3);
  R(g, '#6b7078', x0, y1 - 2, x1 - x0, 3);
  for (let x = x0; x <= x1; x += 32) {
    shadow(g, x + 2, y1 + 3, 4, 2, 0.3);
    R(g, '#868b93', x - 1, y0 - 4, 3, y1 - y0 + 6);
  }
}

function drawSign(g, x, y) {
  R(g, '#3b3027', x - 1, y + 10, 2, 10);
  R(g, '#d97a1d', x - 22, y - 8, 44, 19);
  R(g, '#8a4a0c', x - 22, y - 8, 44, 2);
  R(g, '#8a4a0c', x - 22, y + 9, 44, 2);
  g.fillStyle = '#2a1608';
  g.font = 'bold 8px monospace';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('KEEP', x, y - 1);
  g.fillText('OUT', x, y + 6);
}

function drawCrate(g, x, y, s) {
  shadow(g, x + s / 2 + 2, y + s + 1, s * 0.6, 4, 0.3);
  R(g, '#7a5430', x, y, s, s);
  R(g, '#a07040', x, y, s, 3);
  R(g, '#4f3519', x, y + s - 3, s, 3);
  g.strokeStyle = '#4f3519';
  g.lineWidth = 2;
  g.strokeRect(x + 2, y + 2, s - 4, s - 4);
  g.beginPath();
  g.moveTo(x + 2, y + 2);
  g.lineTo(x + s - 2, y + s - 2);
  g.stroke();
}

function drawBarrel(g, x, y) {
  shadow(g, x, y + 11, 11, 4, 0.4);
  R(g, '#5d3519', x - 8, y - 10, 16, 21);
  R(g, '#7b4a25', x - 8, y - 10, 5, 21);
  R(g, '#2a1a0d', x - 8, y - 4, 16, 2);
  R(g, '#2a1a0d', x - 8, y + 4, 16, 2);
  R(g, '#1a0d05', x - 8, y - 10, 16, 3);
}

function buildBackground() {
  const W = state.w;
  const H = state.h;
  bg = document.createElement('canvas');
  bg.width = W;
  bg.height = H;
  const g = bg.getContext('2d');
  const rnd = rng(1337);

  // pavés sombres
  R(g, '#1e221f', 0, 0, W, H);
  for (let y = 0, row = 0; y < H; y += 14, row++) {
    for (let x = -(row % 2) * 9; x < W; x += 18) {
      const v = Math.floor(rnd() * 22);
      R(g, `rgb(${46 + v},${52 + v},${48 + v})`, x + 1, y + 1, 16, 12);
      R(g, 'rgba(255,255,255,0.05)', x + 1, y + 1, 16, 1);
      if (rnd() < 0.12) R(g, 'rgba(0,0,0,0.25)', x + 1, y + 1, 16, 12);
    }
  }
  // bande de route + marquage usé
  R(g, 'rgba(10,12,14,0.55)', 0, H * 0.46, W, 70);
  for (let x = 6; x < W; x += 34) R(g, 'rgba(200,170,60,0.35)', x, H * 0.46 + 33, 18, 3);
  // flaques d'huile, herbe, gravats
  for (let i = 0; i < 16; i++) {
    g.fillStyle = 'rgba(8,10,10,0.35)';
    g.beginPath();
    g.ellipse(rnd() * W, rnd() * H, 8 + rnd() * 18, 4 + rnd() * 8, 0, 0, Math.PI * 2);
    g.fill();
  }
  for (let i = 0; i < 110; i++) {
    const x = Math.floor(rnd() * W);
    const y = Math.floor(rnd() * H);
    R(g, rnd() < 0.5 ? 'rgba(70,90,45,0.7)' : 'rgba(25,28,26,0.9)', x, y, 2 + Math.floor(rnd() * 3), 2);
  }
  // vieilles taches de sang
  for (let i = 0; i < 8; i++) {
    g.fillStyle = 'rgba(90,14,14,0.35)';
    g.beginPath();
    g.ellipse(rnd() * W, 60 + rnd() * (H - 60), 3 + rnd() * 9, 2 + rnd() * 5, rnd() * 3, 0, Math.PI * 2);
    g.fill();
  }

  // décor
  drawFence(g, W - 100, 44, W + 4, 112);
  drawSign(g, W - 42, 78);
  drawCar(g, 70, 86, -0.28, '#7d2b27', '#5a1f1c', false);
  drawBarrel(g, W - 52, 146);
  drawCrate(g, W - 38, 156, 22);
  drawCrate(g, 122, H - 150, 26);
  drawCrate(g, 146, H - 130, 20);
  drawCrate(g, 20, 150, 22);
  decor = {
    barrel: { x: W - 52, y: 146 - 10 },
    police: { x: 196, y: H - 56, rot: -0.1 },
  };
  drawCar(g, decor.police.x, decor.police.y, decor.police.rot, '#d6dce2', '#aab2ba', true);

  // vignette
  const grd = g.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.78);
  grd.addColorStop(0, 'rgba(0,0,0,0)');
  grd.addColorStop(1, 'rgba(0,0,0,0.5)');
  g.fillStyle = grd;
  g.fillRect(0, 0, W, H);
}

export function resizeCanvas() {
  const cw = stage.clientWidth || LOGICAL_WIDTH;
  const ch = stage.clientHeight || 640;
  const dpr = Math.min((typeof window !== 'undefined' && window.devicePixelRatio) || 1, 2);
  const scale = cw / LOGICAL_WIDTH;
  state.w = LOGICAL_WIDTH;
  state.h = Math.max(300, Math.round(ch / scale));
  canvas.width = Math.round(cw * dpr);
  canvas.height = Math.round(ch * dpr);
  pxScale = canvas.width / LOGICAL_WIDTH;
  ctx.imageSmoothingEnabled = false;
  buildBackground();
}

export function initRender() {
  buildSprites();
  resizeCanvas();
}

// ---------- Éléments animés ----------

function glow(x, y, r, color, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color.replace('A', a));
  g.addColorStop(1, color.replace('A', 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

function drawFire(t) {
  const { x, y } = decor.barrel;
  ctx.save();
  glow(x, y - 6, 46, 'rgba(255,140,40,A)', 0.32 + Math.sin(t * 17) * 0.05);
  for (let i = 0; i < 4; i++) {
    const k = Math.sin(t * 13 + i * 2.1);
    const h = 11 + i * 2 + k * 3;
    const w = 11 - i * 2;
    ctx.fillStyle = ['#ff5a1a', '#ff8c1a', '#ffc21a', '#fff0a0'][i];
    ctx.beginPath();
    ctx.moveTo(x - w / 2 + k, y);
    ctx.quadraticCurveTo(x - w / 2 - 1, y - h * 0.6, x + k * 1.5, y - h);
    ctx.quadraticCurveTo(x + w / 2 + 1, y - h * 0.6, x + w / 2 + k, y);
    ctx.fill();
  }
  ctx.restore();
}

function drawPoliceLights(t) {
  const { x, y, rot } = decor.police;
  const blue = Math.floor(t * 4) % 2 === 0;
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  const at = (ox, oy) => [x + ox * c - oy * s, y + ox * s + oy * c];
  const [rx, ry] = at(-7, -4);
  const [bx, by] = at(-7, 4);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glow(rx, ry, 30, 'rgba(255,40,40,A)', blue ? 0.08 : 0.55);
  glow(bx, by, 30, 'rgba(50,110,255,A)', blue ? 0.55 : 0.08);
  ctx.restore();
  ctx.fillStyle = blue ? '#7a1818' : '#ff3b3b';
  ctx.fillRect(rx - 2, ry - 2, 4, 4);
  ctx.fillStyle = blue ? '#4aa0ff' : '#1a2a6a';
  ctx.fillRect(bx - 2, by - 2, 4, 4);
}

function drawPlayer(t) {
  const p = state.player;
  const d = WEAPONS[state.current];
  shadow(ctx, p.x, p.y + 14, 11, 4, 0.4);
  // anneau vert sous le joueur
  ctx.strokeStyle = 'rgba(34,197,94,0.95)';
  ctx.fillStyle = 'rgba(34,197,94,0.12)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 12, 16, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (p.hitTimer > 0 && Math.floor(t * 18) % 2 === 0) ctx.globalAlpha = 0.5;
  const fr = p.moving ? Math.floor(t * 9) % 2 : 0;
  ctx.drawImage(sprites.player[fr], p.x - 12, p.y - 17);
  ctx.globalAlpha = 1;

  // arme
  ctx.save();
  ctx.translate(p.x, p.y - 1);
  ctx.rotate(p.angle);
  if (Math.abs(p.angle) > Math.PI / 2) ctx.scale(1, -1);
  ctx.fillStyle = '#14151a';
  ctx.fillRect(3, -2, d.gunLen, 4);
  ctx.fillStyle = '#4a4d57';
  ctx.fillRect(3, -2, d.gunLen, 1.5);
  ctx.fillStyle = '#e0b48a';
  ctx.fillRect(2, -2, 4, 4);
  ctx.restore();

  if (state.muzzle > 0) {
    const mx = p.x + Math.cos(p.angle) * (d.gunLen + 7);
    const my = p.y - 1 + Math.sin(p.angle) * (d.gunLen + 7);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glow(mx, my, 24, 'rgba(255,190,80,A)', 0.6);
    ctx.restore();
    ctx.fillStyle = '#fff6c0';
    ctx.beginPath();
    ctx.arc(mx, my, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffb02e';
    ctx.beginPath();
    ctx.arc(mx + Math.cos(p.angle) * 3, my + Math.sin(p.angle) * 3, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawZombie(z, t) {
  const set = sprites.zombie[z.type];
  const speedF = z.type === 'runner' ? 11 : z.type === 'boss' ? 4 : 5.5;
  const s = set[Math.floor(t * speedF + z.ph) % 2];
  const img = z.hitTimer > 0 ? s.flash : s.img;
  const w = img.width;
  const h = img.height;
  shadow(ctx, z.x, z.y + h * 0.45, w * 0.42, h * 0.1, 0.4);
  if (z.type === 'boss') {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glow(z.x, z.y, 48, 'rgba(255,40,30,A)', 0.28 + Math.sin(t * 6) * 0.08);
    ctx.restore();
  }
  ctx.save();
  ctx.translate(z.x, z.y);
  ctx.scale(z.fx, 1);
  ctx.drawImage(img, -w / 2, -h / 2);
  ctx.restore();
  if (z.maxHp > 1 && z.hp < z.maxHp) {
    const bw = Math.max(22, w * 0.8);
    const bx = z.x - bw / 2;
    const by = z.y - h / 2 - 6;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(bx - 1, by - 1, bw + 2, 5);
    ctx.fillStyle = z.type === 'boss' ? '#f43f5e' : '#ef4444';
    ctx.fillRect(bx, by, bw * Math.max(0, z.hp / z.maxHp), 3);
  }
}

function drawPickup(pk, t) {
  if (pk.life < 3 && Math.floor(pk.life * 5) % 2 === 0) return;
  const bob = Math.sin(t * 5 + pk.x) * 1.6;
  const x = pk.x;
  const y = pk.y + bob;
  const S = PICKUP_SIZE;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glow(x, y, 20, pk.kind === 'health' ? 'rgba(255,70,90,A)' : 'rgba(250,200,60,A)', 0.4);
  ctx.restore();
  shadow(ctx, x, pk.y + 9, 7, 2.5, 0.35);
  if (pk.kind === 'health') {
    ctx.fillStyle = '#f4f4f5';
    ctx.fillRect(x - S / 2, y - S / 2, S, S);
    ctx.fillStyle = '#d1d5db';
    ctx.fillRect(x - S / 2, y + S / 2 - 2, S, 2);
    ctx.fillStyle = '#e11d48';
    ctx.fillRect(x - 2, y - 6, 4, 12);
    ctx.fillRect(x - 6, y - 2, 12, 4);
  } else {
    ctx.fillStyle = '#4d5a35';
    ctx.fillRect(x - S / 2, y - S / 2, S, S);
    ctx.fillStyle = '#2f3921';
    ctx.fillRect(x - S / 2, y + S / 2 - 2, S, 2);
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(x - 5 + i * 4, y - 5, 2, 8);
      ctx.fillStyle = '#b45309';
      ctx.fillRect(x - 5 + i * 4, y + 2, 2, 2);
    }
  }
}

// ---------- Frame ----------

export function render(t) {
  if (!ctx || !bg) return;
  ctx.setTransform(pxScale, 0, 0, pxScale, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = 1;
  ctx.clearRect(0, 0, state.w, state.h);

  ctx.save();
  if (state.shake > 0.05) {
    ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
  }

  ctx.drawImage(bg, 0, 0, state.w, state.h);

  // taches de sang
  for (const d of state.decals) {
    ctx.fillStyle = `rgba(110,12,12,${d.a})`;
    ctx.beginPath();
    ctx.ellipse(d.x, d.y, d.r, d.r * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const pk of state.pickups) drawPickup(pk, t);

  // zombies et joueur triés par profondeur (y)
  const p = state.player;
  const zs = state.zombies.slice().sort((a, b) => a.y - b.y);
  let i = 0;
  for (; i < zs.length && zs[i].y <= p.y; i++) drawZombie(zs[i], t);
  drawPlayer(t);
  for (; i < zs.length; i++) drawZombie(zs[i], t);

  // balles (traînées)
  ctx.lineCap = 'round';
  for (const b of state.bullets) {
    ctx.strokeStyle = 'rgba(255,214,102,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(b.x - b.vx * 0.022, b.y - b.vy * 0.022);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.fillStyle = '#fffbe6';
    ctx.fillRect(b.x - 1, b.y - 1, 2, 2);
  }

  // particules
  for (const q of state.particles) {
    ctx.globalAlpha = Math.max(0, Math.min(1, q.life / q.max + 0.2));
    ctx.fillStyle = '#b01818';
    ctx.fillRect(q.x, q.y, q.size, q.size);
  }
  ctx.globalAlpha = 1;

  // feu du baril et gyrophares (par-dessus)
  drawFire(t);
  drawPoliceLights(t);

  ctx.restore();

  // flash rouge quand on est touché
  if (state.hurtFlash > 0) {
    const a = Math.min(0.5, state.hurtFlash * 2);
    const g = ctx.createRadialGradient(state.w / 2, state.h / 2, state.h * 0.25, state.w / 2, state.h / 2, state.h * 0.7);
    g.addColorStop(0, 'rgba(220,20,20,0)');
    g.addColorStop(1, `rgba(220,20,20,${a})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, state.w, state.h);
  }
}
