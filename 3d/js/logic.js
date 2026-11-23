// Maths pures (aucune dépendance) : utilisées par la simulation ET par le rendu.
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export function wrapAngle(a) { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; }
export const lerpAngle = (a, b, t) => a + wrapAngle(b - a) * t;
export const dist2 = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);

// Générateur pseudo-aléatoire déterministe (mulberry32)
export function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Rayon (direction normalisée) contre sphère. Renvoie la distance t >= 0, ou -1 si raté.
export function raySphere(ox, oy, oz, dx, dy, dz, cx, cy, cz, r) {
  const mx = ox - cx, my = oy - cy, mz = oz - cz;
  const b = mx * dx + my * dy + mz * dz;
  const c = mx * mx + my * my + mz * mz - r * r;
  if (c > 0 && b > 0) return -1;
  const disc = b * b - c;
  if (disc < 0) return -1;
  let t = -b - Math.sqrt(disc);
  if (t < 0) t = 0;
  return t;
}

export function normalize3(v) {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

// Pousse le point p {x,z} (rayon r) hors des obstacles. Obstacle : cercle {x,z,r} ou boîte {x,z,hw,hd}.
// Renvoie le nombre de contacts ; p.nx / p.nz = normale moyenne de poussée.
export function pushOut(p, r, cols) {
  let hits = 0, nx = 0, nz = 0;
  for (let i = 0; i < cols.length; i++) {
    const c = cols[i];
    if (c.hw === undefined) {
      const dx = p.x - c.x, dz = p.z - c.z, rr = r + c.r;
      const d2 = dx * dx + dz * dz;
      if (d2 < rr * rr) {
        const d = Math.sqrt(d2) || 0.0001;
        const ux = d2 === 0 ? 1 : dx / d, uz = d2 === 0 ? 0 : dz / d;
        p.x = c.x + ux * rr; p.z = c.z + uz * rr; nx += ux; nz += uz; hits++;
      }
    } else {
      const qx = clamp(p.x, c.x - c.hw, c.x + c.hw), qz = clamp(p.z, c.z - c.hd, c.z + c.hd);
      let dx = p.x - qx, dz = p.z - qz;
      const d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        if (d2 > 1e-8) {
          const d = Math.sqrt(d2); dx /= d; dz /= d;
          p.x = qx + dx * r; p.z = qz + dz * r; nx += dx; nz += dz;
        } else {
          // centre à l'intérieur de la boîte : sortir par le bord le plus proche
          const l = p.x - (c.x - c.hw), rt = c.x + c.hw - p.x, t = p.z - (c.z - c.hd), b = c.z + c.hd - p.z;
          const m = Math.min(l, rt, t, b);
          if (m === l) { p.x = c.x - c.hw - r; nx -= 1; }
          else if (m === rt) { p.x = c.x + c.hw + r; nx += 1; }
          else if (m === t) { p.z = c.z - c.hd - r; nz -= 1; }
          else { p.z = c.z + c.hd + r; nz += 1; }
        }
        hits++;
      }
    }
  }
  p.nx = nx; p.nz = nz;
  return hits;
}

// Caméra par-dessus l'épaule. yaw : 0 = on regarde vers +Z ; yaw croissant = on tourne vers +X.
export function cameraRig(px, pz, yaw, pitch, C) {
  const cp = Math.cos(pitch), sp = Math.sin(pitch), sy = Math.sin(yaw), cy = Math.cos(yaw);
  const dir = [sy * cp, sp, cy * cp];
  const right = [-cy, 0, sy];
  const pivot = [px + right[0] * C.shoulder, C.pivotY, pz + right[2] * C.shoulder];
  const pos = [pivot[0] - dir[0] * C.dist, pivot[1] - dir[1] * C.dist, pivot[2] - dir[2] * C.dist];
  if (pos[1] < 0.35) pos[1] = 0.35;
  return { pos, dir, right, pivot };
}
