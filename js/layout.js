// Géométrie de l'arène : obstacles solides, barils explosifs et collisions cercle / rectangle.
// Module pur (aucune dépendance) : utilisé par la logique ET par le rendu.

const rect = (x, y, w, h) => ({ x, y, w, h });
const crate = (x, y, s) => ({ kind: 'crate', x, y, s, hit: rect(x, y, s, s) });

// Obstacles fixes (dessinés dans le fond, hitbox = rectangle aligné sur les axes).
export function computeSolids(W, H) {
  return [
    { kind: 'car', x: 70, y: 86, rot: -0.28, hit: rect(40, 71, 60, 30) },
    { kind: 'firebarrel', x: W - 52, y: 146, hit: rect(W - 60, 136, 16, 21) },
    crate(W - 38, 156, 22),
    crate(122, H - 150, 26),
    crate(146, H - 130, 20),
    crate(20, 150, 22),
    { kind: 'police', x: 196, y: H - 56, rot: -0.1, hit: rect(166, H - 71, 60, 30) },
  ];
}

// Barils explosifs : on tire dessus pour qu'ils explosent (3 PV).
export function makeBarrels(W, H) {
  return [
    { x: 96, y: Math.round(H * 0.42) },
    { x: W - 96, y: Math.round(H * 0.68) },
    { x: Math.round(W * 0.5), y: Math.round(H * 0.27) },
  ].map((b) => ({ ...b, r: 9, hp: 3, dead: false, flash: 0 }));
}

// Repousse le cercle `e` ({x, y, r}) hors des obstacles. Renvoie true s'il y a eu contact.
export function pushOut(e, solids, barrels = []) {
  let hit = false;
  for (const s of solids) {
    const r = s.hit;
    const cx = Math.max(r.x, Math.min(e.x, r.x + r.w));
    const cy = Math.max(r.y, Math.min(e.y, r.y + r.h));
    const dx = e.x - cx;
    const dy = e.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 >= e.r * e.r) continue;
    hit = true;
    if (d2 > 1e-6) {
      const d = Math.sqrt(d2);
      const k = (e.r - d) / d;
      e.x += dx * k;
      e.y += dy * k;
    } else {
      // centre à l'intérieur du rectangle : sortie par le bord le plus proche
      const l = e.x - r.x;
      const rr = r.x + r.w - e.x;
      const t = e.y - r.y;
      const b = r.y + r.h - e.y;
      const m = Math.min(l, rr, t, b);
      if (m === l) e.x = r.x - e.r;
      else if (m === rr) e.x = r.x + r.w + e.r;
      else if (m === t) e.y = r.y - e.r;
      else e.y = r.y + r.h + e.r;
    }
  }
  for (const b of barrels) {
    if (b.dead) continue;
    const dx = e.x - b.x;
    const dy = e.y - b.y;
    const min = e.r + b.r;
    const d2 = dx * dx + dy * dy;
    if (d2 >= min * min) continue;
    hit = true;
    if (d2 > 1e-6) {
      const d = Math.sqrt(d2);
      const k = (min - d) / d;
      e.x += dx * k;
      e.y += dy * k;
    } else {
      e.x += min;
    }
  }
  return hit;
}

// Le point (x, y) est-il dans un obstacle (agrandi de `pad`) ?
export function hitsSolid(solids, x, y, pad = 0) {
  for (const s of solids) {
    const r = s.hit;
    if (x > r.x - pad && x < r.x + r.w + pad && y > r.y - pad && y < r.y + r.h + pad) return true;
  }
  return false;
}
