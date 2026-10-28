// Accès DOM partagés + helpers de rendu des entités.

export const $ = (id) => document.getElementById(id);
export const arena = $('arena');
export const playerEl = $('player');

export function makeEl(cls, parent = arena, text = '') {
  const e = document.createElement('div');
  e.className = cls;
  if (text) e.textContent = text;
  parent.appendChild(e);
  return e;
}

// Positionne un élément par son centre (x, y). rot = rotation en radians (optionnel).
export function place(e, x, y, size, rot) {
  let t = `translate(${(x - size / 2).toFixed(1)}px,${(y - size / 2).toFixed(1)}px)`;
  if (rot !== undefined) t += ` rotate(${rot.toFixed(3)}rad)`;
  e.style.transform = t;
}
