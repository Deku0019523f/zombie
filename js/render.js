// Rendu canvas : décor pixel art, sprites, balles, particules, effets de lumière.
// Aucune logique de jeu ici : on lit uniquement `state`.
import { state } from './state.js';
import { WEAPONS, FIRE_MODES, LOGICAL_WIDTH, AI, GRENADE } from './config.js';
import { sprites, buildSprites } from './sprites.js';
import { stage, canvas } from './dom.js';
import { PICKUP_SIZE } from './pickups.js';
import { computeSolids } from './layout.js';

const ctx = canvas.getContext('2d');
let pxScale = 1;
let bg = null;
let decor = { barrel: { x: 308, y: 136 }, police: { x: 196, y: 580, rot: -0.1 } };

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

  // décor non solide
  drawFence(g, W - 100, 44, W + 4, 112);
  drawSign(g, W - 42, 78);

  // obstacles solides (les mêmes que ceux utilisés pour les collisions)
  for (const s of state.solids) {
    if (s.kind === 'car') drawCar(g, s.x, s.y, s.rot, '#7d2b27', '#5a1f1c', false);
    else if (s.kind === 'crate') drawCrate(g, s.x, s.y, s.s);
    else if (s.kind === 'firebarrel') { drawBarrel(g, s.x, s.y); decor.barrel = { x: s.x, y: s.y - 10 }; }
    else if (s.kind === 'police') {
      drawCar(g, s.x, s.y, s.rot, '#d6dce2', '#aab2ba', true);
      decor.police = { x: s.x, y: s.y, rot: s.rot };
    }
  }

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
  state.solids = computeSolids(state.w, state.h);
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

function glowAdd(x, y, r, color, a) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glow(x, y, r, color, a);
  ctx.restore();
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
  glowAdd(rx, ry, 30, 'rgba(255,40,40,A)', blue ? 0.08 : 0.55);
  glowAdd(bx, by, 30, 'rgba(50,110,255,A)', blue ? 0.55 : 0.08);
  ctx.fillStyle = blue ? '#7a1818' : '#ff3b3b';
  ctx.fillRect(rx - 2, ry - 2, 4, 4);
  ctx.fillStyle = blue ? '#4aa0ff' : '#1a2a6a';
  ctx.fillRect(bx - 2, by - 2, 4, 4);
}

// Baril explosif rouge : on tire dessus (3 PV) pour qu'il explose.
function drawBomb(b, t) {
  const { x, y } = b;
  shadow(ctx, x, y + 11, 10, 4, 0.4);
  ctx.fillStyle = b.flash > 0 ? '#ffffff' : '#a3261c';
  ctx.fillRect(x - 8, y - 10, 16, 21);
  ctx.fillStyle = '#c9392e';
  ctx.fillRect(x - 8, y - 10, 5, 21);
  ctx.fillStyle = '#3a0f0b';
  ctx.fillRect(x - 8, y - 10, 16, 3);
  ctx.fillRect(x - 8, y + 8, 16, 3);
  for (let i = 0; i < 4; i++) {          // bande de danger
    ctx.fillStyle = i % 2 ? '#15151a' : '#facc15';
    ctx.fillRect(x - 8 + i * 4, y - 3, 4, 6);
  }
  if (b.hp < 3) {                         // fissures quand il est abîmé
    ctx.fillStyle = '#1a0806';
    ctx.fillRect(x - 2, y - 8, 1, 6);
    ctx.fillRect(x + 3, y + 2, 1, 5);
  }
  glowAdd(x, y - 12, 12, 'rgba(255,60,40,A)', 0.25 + 0.2 * Math.sin(t * 6 + x));
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

  // portée de tir (cercle discret) et jauge du tir chargé
  if (state.settings.range) {
    ctx.save();
    ctx.setLineDash([3, 6]);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(p.x, p.y, d.range * state.stats.range, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  if (state.charge > 0) {
    const k = Math.min(1, state.charge / FIRE_MODES.charge.time);
    ctx.strokeStyle = k >= 1 ? `rgba(255,${120 + 100 * Math.sin(t * 30)},60,1)` : `rgba(255,${210 - 120 * k},80,0.95)`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 21, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2);
    ctx.stroke();
    glowAdd(p.x + Math.cos(p.angle) * (d.gunLen + 7), p.y + Math.sin(p.angle) * (d.gunLen + 7), 8 + 14 * k, 'rgba(255,150,60,A)', 0.3 + 0.5 * k);
  }

  if (state.buffs.rage > 0) glowAdd(p.x, p.y, 34, 'rgba(255,120,30,A)', 0.4 + 0.1 * Math.sin(t * 20));

  if (p.hitTimer > 0 && state.buffs.shield <= 0 && Math.floor(t * 18) % 2 === 0) ctx.globalAlpha = 0.5;
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
    glowAdd(mx, my, 24, 'rgba(255,190,80,A)', 0.6);
    ctx.fillStyle = '#fff6c0';
    ctx.beginPath();
    ctx.arc(mx, my, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffb02e';
    ctx.beginPath();
    ctx.arc(mx + Math.cos(p.angle) * 3, my + Math.sin(p.angle) * 3, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // bouclier : bulle bleue (clignote à la fin)
  const sh = state.buffs.shield;
  if (sh > 0 && (sh > 2 || Math.floor(t * 8) % 2 === 0)) {
    ctx.fillStyle = 'rgba(80,180,255,0.16)';
    ctx.strokeStyle = 'rgba(140,210,255,0.9)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 21 + Math.sin(t * 9) * 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

function drawZombie(z, t) {
  const set = sprites.zombie[z.type];
  const speedF = z.type === 'runner' ? 11 : z.type === 'boss' ? 4 : z.type === 'exploder' ? 8 : 5.5;
  const frozen = state.buffs.freeze > 0;
  const s = set[Math.floor(t * speedF * (frozen ? 0.35 : 1) + z.ph) % 2];
  const img = z.hitTimer > 0 ? s.flash : s.img;
  const w = img.width;
  const h = img.height;
  shadow(ctx, z.x, z.y + h * 0.45, w * 0.42, h * 0.1, 0.4);

  if (z.type === 'boss') glowAdd(z.x, z.y, 48, 'rgba(255,40,30,A)', 0.28 + Math.sin(t * 6) * 0.08);
  if (z.type === 'exploder') {      // pulse de plus en plus vite quand le joueur est proche
    const near = Math.hypot(state.player.x - z.x, state.player.y - z.y) < 90;
    glowAdd(z.x, z.y, 28, 'rgba(255,90,20,A)', 0.14 + 0.16 * Math.sin(t * (near ? 18 : 7)));
  }
  if (z.type === 'charger' && z.st === 'tele') {   // ligne d'avertissement avant la charge
    const prog = 1 - z.tT / AI.charger.telegraph;
    ctx.save();
    ctx.strokeStyle = `rgba(255,50,50,${0.25 + 0.5 * prog})`;
    ctx.lineWidth = 3 + prog * 6;
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.moveTo(z.x, z.y);
    ctx.lineTo(z.x + z.dx * 200, z.y + z.dy * 200);
    ctx.stroke();
    ctx.restore();
    glowAdd(z.x, z.y, 34, 'rgba(255,40,40,A)', 0.2 + 0.4 * prog);
  }

  ctx.save();
  ctx.translate(z.x, z.y);
  ctx.scale(z.fx, 1);
  if (z.type === 'charger' && z.st === 'dash') ctx.globalAlpha = 0.92;
  ctx.drawImage(img, -w / 2, -h / 2);
  ctx.restore();

  if (z.type === 'spitter' && z.charge) glowAdd(z.x, z.y - h * 0.25, 16, 'rgba(190,255,60,A)', 0.55);
  if (z.type === 'charger' && z.st === 'tele') {   // « ! » au-dessus de la tête
    ctx.fillStyle = '#ff3b3b';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('!', z.x, z.y - h / 2 - 3);
  }
  if (frozen) {
    ctx.fillStyle = 'rgba(140,210,255,0.28)';
    ctx.fillRect(z.x - w / 2, z.y - h / 2, w, h);
  }
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

const POWER_STYLE = {
  rage: { c: '#f97316', e: '⚡' },
  shield: { c: '#38bdf8', e: '🛡️' },
  freeze: { c: '#7dd3fc', e: '❄️' },
  nuke: { c: '#facc15', e: '☢️' },
};

function drawPickup(pk, t) {
  if (pk.life < 3 && Math.floor(pk.life * 5) % 2 === 0) return;
  const bob = Math.sin(t * 5 + pk.x) * 1.6;
  const x = pk.x;
  const y = pk.y + bob;
  const S = PICKUP_SIZE;
  const ps = POWER_STYLE[pk.kind];
  glowAdd(x, y, ps ? 26 : 20, ps ? 'rgba(255,220,120,A)' : pk.kind === 'health' ? 'rgba(255,70,90,A)' : 'rgba(250,200,60,A)', ps ? 0.5 : 0.4);
  shadow(ctx, x, pk.y + 9, 7, 2.5, 0.35);
  if (ps) {
    ctx.fillStyle = '#0b1119';
    ctx.fillRect(x - S / 2 - 1, y - S / 2 - 1, S + 2, S + 2);
    ctx.strokeStyle = ps.c;
    ctx.lineWidth = 2;
    ctx.strokeRect(x - S / 2, y - S / 2, S, S);
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(ps.e, x, y + 1);
  } else if (pk.kind === 'health') {
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

function drawGrenade(g) {
  const k = Math.min(1, g.t / g.dur);
  const x = g.x0 + (g.x1 - g.x0) * k;
  const y = g.y0 + (g.y1 - g.y0) * k;
  const h = Math.sin(Math.PI * k) * 30;
  shadow(ctx, x, y + 2, 4, 2, 0.35);
  // zone d'impact
  ctx.strokeStyle = `rgba(255,200,80,${0.25 + 0.3 * k})`;
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.arc(g.x1, g.y1, GRENADE.radius * state.stats.blast, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#4b5a2e';
  ctx.beginPath();
  ctx.arc(x, y - h, 3.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c9d29a';
  ctx.fillRect(x - 1, y - h - 5, 2, 2);
}

function drawBlast(b) {
  const p = Math.min(1, b.t / 0.4);
  const e = 1 - (1 - p) * (1 - p);
  const r = b.r * (0.35 + 0.65 * e);
  const a = 1 - p;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glow(b.x, b.y, r * 1.1, 'rgba(255,170,60,A)', 0.85 * a);
  ctx.restore();
  ctx.strokeStyle = `rgba(255,240,200,${a})`;
  ctx.lineWidth = 3 * a + 1;
  ctx.beginPath();
  ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
  ctx.stroke();
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

  // taches (sang, brûlures)
  for (const d of state.decals) {
    ctx.fillStyle = `rgba(${d.col},${d.a})`;
    ctx.beginPath();
    ctx.ellipse(d.x, d.y, d.r, d.r * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const pk of state.pickups) drawPickup(pk, t);
  for (const b of state.barrels) drawBomb(b, t);

  // zombies et joueur triés par profondeur (y)
  const p = state.player;
  const zs = state.zombies.slice().sort((a, b) => a.y - b.y);
  let i = 0;
  for (; i < zs.length && zs[i].y <= p.y; i++) drawZombie(zs[i], t);
  drawPlayer(t);
  for (; i < zs.length; i++) drawZombie(zs[i], t);

  // acide des cracheurs
  for (const a of state.acid) {
    glowAdd(a.x, a.y, 12, 'rgba(150,255,60,A)', 0.5);
    ctx.fillStyle = '#b6f13a';
    ctx.beginPath();
    ctx.arc(a.x, a.y, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#eaffb0';
    ctx.beginPath();
    ctx.arc(a.x - 0.8, a.y - 0.8, 1.3, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const g of state.grenades) drawGrenade(g);

  // balles (traînées) : s'estompent en fin de portée ; les tirs chargés sont plus gros et orangés
  ctx.lineCap = 'round';
  for (const b of state.bullets) {
    const fade = Math.min(1, (b.life / b.maxLife) * 4);
    ctx.globalAlpha = 0.25 + 0.75 * fade;
    ctx.strokeStyle = b.big ? 'rgba(255,140,60,0.95)' : 'rgba(255,214,102,0.9)';
    ctx.lineWidth = b.big ? 3.5 : 2;
    ctx.beginPath();
    ctx.moveTo(b.x - b.vx * (b.big ? 0.035 : 0.022), b.y - b.vy * (b.big ? 0.035 : 0.022));
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.fillStyle = b.big ? '#fff1d0' : '#fffbe6';
    const sz = b.big ? 3 : 2;
    ctx.fillRect(b.x - sz / 2, b.y - sz / 2, sz, sz);
  }
  ctx.globalAlpha = 1;

  // particules
  for (const q of state.particles) {
    ctx.globalAlpha = Math.max(0, Math.min(1, q.life / q.max + 0.2));
    ctx.fillStyle = q.col;
    ctx.fillRect(q.x, q.y, q.size, q.size);
  }
  ctx.globalAlpha = 1;

  for (const b of state.blasts) drawBlast(b);

  // feu du baril et gyrophares (par-dessus)
  drawFire(t);
  drawPoliceLights(t);

  // vague « NUIT » : on ne voit qu'autour du joueur (le feu et les gyrophares restent visibles)
  if (state.darkAmt > 0.02) {
    const g = ctx.createRadialGradient(p.x, p.y, 40, p.x, p.y, 150);
    g.addColorStop(0, 'rgba(2,4,10,0)');
    g.addColorStop(1, `rgba(2,4,10,${0.88 * state.darkAmt})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, state.w, state.h);
    drawFire(t);
    drawPoliceLights(t);
    for (const b of state.barrels) glowAdd(b.x, b.y - 12, 14, 'rgba(255,60,40,A)', 0.5);
  }

  // textes flottants (points gagnés)
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  for (const f of state.floaters) {
    ctx.globalAlpha = Math.max(0, Math.min(1, f.life / 0.4));
    ctx.strokeText(f.text, f.x, f.y);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;

  ctx.restore();

  if (state.buffs.freeze > 0) {            // voile bleuté pendant le gel
    ctx.fillStyle = `rgba(120,200,255,${state.buffs.freeze > 1 ? 0.1 : 0.05})`;
    ctx.fillRect(0, 0, state.w, state.h);
  }
  if (state.flash > 0) {                   // flash blanc de la bombe nucléaire
    ctx.fillStyle = `rgba(255,255,240,${Math.min(1, state.flash)})`;
    ctx.fillRect(0, 0, state.w, state.h);
  }
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
