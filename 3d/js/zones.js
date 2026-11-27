// Zones du territoire (données pures, aucune dépendance three) : utilisées par le plan (layout), le sol (world) et la carte (map).
// Le village occupe le centre ; les quatre quarts restants forment chacun une zone au décor différent.
export const VILLAGE_HALF = 72;

export const ZONES = {
  village:    { id: 'village',    name: 'Village médiéval',    color: [0.46, 0.49, 0.30], map: '#8a8a52', desc: 'Maisons de pierre et de bois, route principale.' },
  forest:     { id: 'forest',     name: 'Forêt dense',          color: [0.26, 0.40, 0.22], map: '#3f6a37', desc: 'Arbres serrés, cabane de départ.' },
  industrial: { id: 'industrial', name: 'Zone industrielle',    color: [0.42, 0.43, 0.42], map: '#7b7e80', desc: 'Conteneurs, barils, châteaux d’eau, épaves.' },
  farm:       { id: 'farm',       name: 'Campagne',             color: [0.62, 0.60, 0.32], map: '#b5a84f', desc: 'Fermes, champs, caisses de vivres.' },
  quarry:     { id: 'quarry',     name: 'Carrière rocheuse',    color: [0.52, 0.45, 0.36], map: '#9a8468', desc: 'Rochers à piocher, sol aride.' },
};

// Distance (0 si dedans) d'un point à la zone
const dist = (id, x, z) => {
  const V = VILLAGE_HALF;
  if (id === 'village') return Math.hypot(Math.max(0, Math.abs(x) - V), Math.max(0, Math.abs(z) - V));
  const sx = id === 'forest' || id === 'quarry' ? -1 : 1, sz = id === 'forest' || id === 'industrial' ? -1 : 1;   // forêt NW, industrie NE, campagne SE, carrière SW
  return Math.hypot(Math.max(0, -sx * x), Math.max(0, -sz * z));
};

export function zoneAt(x, z) {
  if (Math.abs(x) <= VILLAGE_HALF && Math.abs(z) <= VILLAGE_HALF) return 'village';
  if (x < 0) return z < 0 ? 'forest' : 'quarry';
  return z < 0 ? 'industrial' : 'farm';
}

// Couleur du sol mélangée aux frontières (fondu sur ~14 m)
export function groundColor(x, z, out = [0, 0, 0]) {
  let w = 0; out[0] = out[1] = out[2] = 0;
  for (const id in ZONES) {
    const d = dist(id, x, z), k = Math.exp(-(d * d) / 90);
    const c = ZONES[id].color; out[0] += c[0] * k; out[1] += c[1] * k; out[2] += c[2] * k; w += k;
  }
  out[0] /= w; out[1] /= w; out[2] /= w; return out;
}
