// Carte du territoire : mini-carte dans le coin + grande carte plein écran (touche M ou bouton). Interface seulement, lit la simulation.
import { ZONES, VILLAGE_HALF } from './zones.js';

export function createMap(sim) {
  const L = sim.layout, H = L.half, S = 2 * H;                    // 1 px = 1 m sur la carte de base
  const css = document.createElement('style');
  css.textContent = `
  #miniMap{position:absolute;right:calc(var(--safe-r,0px) + 12px);top:calc(var(--safe-t,0px) + 64px);width:116px;height:116px;border-radius:50%;border:2px solid rgba(255,255,255,.55);background:#222;overflow:hidden;z-index:2;pointer-events:auto;box-shadow:0 2px 8px #0008}
  #miniMap canvas{width:100%;height:100%;display:block}
  #bigMap{position:fixed;inset:0;z-index:30;background:rgba(8,10,8,.92);display:none;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:10px;box-sizing:border-box}
  #bigMap.open{display:flex}
  #bigMap h3{margin:0;color:#fff;font:700 15px system-ui,sans-serif;letter-spacing:.12em}
  #bigMap canvas{max-width:min(92vw,calc(100vh - 110px));max-height:calc(100vh - 110px);aspect-ratio:1;border:2px solid #fff6;border-radius:6px}
  #bigMapLeg{display:flex;flex-wrap:wrap;gap:6px 14px;justify-content:center;color:#ddd;font:12px system-ui,sans-serif}
  #bigMapLeg i{display:inline-block;width:11px;height:11px;border-radius:2px;margin-right:5px;vertical-align:-1px}
  #bigMapX{position:absolute;right:14px;top:10px;width:40px;height:40px;border-radius:50%;border:2px solid #fff8;background:#0006;color:#fff;font:700 20px system-ui}
  #btnMap{font-size:17px;color:#fff}`;
  document.head.appendChild(css);

  // --- carte de base (dessinée une fois) ---
  const base = document.createElement('canvas'); base.width = base.height = S;
  const g = base.getContext('2d'), X = (x) => x + H, Y = (z) => z + H;
  const rectOf = { forest: [0, 0, H, H], industrial: [H, 0, H, H], quarry: [0, H, H, H], farm: [H, H, H, H] };
  for (const id of ['forest', 'industrial', 'quarry', 'farm']) { g.fillStyle = ZONES[id].map; g.fillRect(...rectOf[id]); }
  g.fillStyle = ZONES.village.map; g.fillRect(X(-VILLAGE_HALF), Y(-VILLAGE_HALF), 2 * VILLAGE_HALF, 2 * VILLAGE_HALF);
  g.fillStyle = 'rgba(20,50,20,.55)'; for (const t of L.trees) g.fillRect(X(t.x) - 1, Y(t.z) - 1, 3, 3);
  g.fillStyle = 'rgba(70,70,70,.8)'; for (const r of L.rocks) g.fillRect(X(r.x) - 1, Y(r.z) - 1, 3, 3);
  g.fillStyle = '#4a4a4a'; g.fillRect(0, Y(-4), S, 8); g.fillRect(X(-4), 0, 8, S);
  g.fillStyle = '#e9e0c8'; for (const h of L.houses) g.fillRect(X(h.x) - h.ex, Y(h.z) - h.ez, h.ex * 2, h.ez * 2);
  g.strokeStyle = '#000a'; g.lineWidth = 2; g.strokeRect(1, 1, S - 2, S - 2);
  const star = (ctx, x, y, r) => { ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); ctx.stroke(); };
  g.fillStyle = '#2d7dff'; for (const v of L.vehicles) g.fillRect(X(v.x) - 3, Y(v.z) - 3, 6, 6);     // véhicules utilisables (position de départ)
  g.fillStyle = '#ffcc33'; g.strokeStyle = '#000'; g.lineWidth = 1.5; star(g, X(L.cabin.cx), Y(L.cabin.cz), 9);

  // --- éléments d'interface ---
  const mini = document.createElement('div'); mini.id = 'miniMap';
  const mc = document.createElement('canvas'); mc.width = mc.height = 232; mini.appendChild(mc);
  const hud = document.getElementById('hud') || document.body; hud.appendChild(mini);
  const big = document.createElement('div'); big.id = 'bigMap';
  big.innerHTML = '<h3>CARTE DU TERRITOIRE</h3><canvas id="bigMapC" width="672" height="672"></canvas><div id="bigMapLeg"></div><button id="bigMapX" aria-label="Fermer">×</button>';
  document.body.appendChild(big);
  const bc = big.querySelector('#bigMapC'), leg = big.querySelector('#bigMapLeg');
  leg.innerHTML = Object.values(ZONES).map(z => `<span><i style="background:${z.map}"></i>${z.name}</span>`).join('') + '<span><i style="background:#ffcc33"></i>Cabane</span><span><i style="background:#2d7dff"></i>Véhicule</span><span><i style="background:#e33"></i>Vous</span>';
  const btn = document.createElement('button'); btn.id = 'btnMap'; btn.className = 'round sm'; btn.setAttribute('aria-label', 'Carte'); btn.textContent = '🗺';
  const tr = document.getElementById('topRight'); if (tr) tr.insertBefore(btn, tr.firstChild);

  let open = false;
  const marker = (ctx, x, y, yaw, size) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI - yaw);   // direction (sin yaw, cos yaw) en (x, z)
    ctx.fillStyle = '#e33'; ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(1.2, size / 6);
    ctx.beginPath(); ctx.moveTo(0, -size); ctx.lineTo(size * 0.7, size * 0.8); ctx.lineTo(0, size * 0.4); ctx.lineTo(-size * 0.7, size * 0.8); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  };
  const labels = { forest: [-H / 2, -H / 2], industrial: [H / 2, -H / 2], quarry: [-H / 2, H / 2], farm: [H / 2, H / 2], village: [0, -VILLAGE_HALF + 12] };
  const draw = () => {
    const P = sim.player, px = X(P.x), py = Y(P.z), yaw = sim.yaw || 0;
    if (open) {
      const c = bc.getContext('2d'), k = bc.width / S;
      c.clearRect(0, 0, bc.width, bc.height); c.imageSmoothingEnabled = true; c.drawImage(base, 0, 0, bc.width, bc.height);
      c.font = '700 15px system-ui'; c.textAlign = 'center'; c.lineWidth = 4; c.strokeStyle = '#000b'; c.fillStyle = '#fff';
      for (const id in labels) { const [lx, lz] = labels[id]; c.strokeText(ZONES[id].name, X(lx) * k, Y(lz) * k); c.fillText(ZONES[id].name, X(lx) * k, Y(lz) * k); }
      marker(c, px * k, py * k, yaw, 11);
    } else {
      const c = mc.getContext('2d'), R = 62, w = mc.width;       // fenêtre de 124 m autour du joueur, nord en haut
      c.fillStyle = '#222'; c.fillRect(0, 0, w, w);
      c.drawImage(base, px - R, py - R, 2 * R, 2 * R, 0, 0, w, w);
      marker(c, w / 2, w / 2, yaw, 13);
    }
  };
  const setOpen = (v) => { open = v; big.classList.toggle('open', v); if (v) draw(); };
  btn.addEventListener('click', () => setOpen(!open));
  mini.addEventListener('click', () => setOpen(true));
  big.querySelector('#bigMapX').addEventListener('click', () => setOpen(false));
  window.addEventListener('keydown', (e) => { if (e.repeat) return; if (e.code === 'KeyM') setOpen(!open); else if (e.code === 'Escape' && open) { setOpen(false); e.stopImmediatePropagation(); } }, true);
  let t = 0;
  return { isOpen: () => open, close: () => setOpen(false), update(dt) { t -= dt; if (t > 0 && !open) return; t = 0.08; draw(); } };
}
